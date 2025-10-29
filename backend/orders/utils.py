# orders/utils.py
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
import razorpay
from django.conf import settings
from .models import Order, OrderItem, ShippingAddress
from products.models import ProductVariant
from promoter.models import Promoter
from cart.models import CartItem
import razorpay
from admin_dashboard.models import AdminLog
from razorpay.errors import ServerError, BadRequestError, GatewayError, SignatureVerificationError
from django.conf import settings

from .serializers import OrderSerializer

logger = logging.getLogger(__name__)

def get_or_create_shipping_address(user, shipping_data):
    """Validate and get or create shipping address."""
    normalized = {k: v.strip() if isinstance(v, str) else v for k, v in shipping_data.items()}

    return ShippingAddress.objects.get_or_create(
        user=user,
        full_name=normalized["full_name"],
        phone_number=normalized["phone_number"],
        address=normalized["address"],
        locality=normalized["locality"],
        city=normalized["city"],
        district=normalized.get("district", ""),
        state=normalized.get("state", ""),
        region=normalized.get("region", ""),
        postal_code=normalized["postal_code"],
        country=normalized.get("country", "India")
    )[0]


def get_valid_promoter(referral_code):
    """Validate promoter referral code and return promoter object."""
    if not referral_code:
        return None

    referral_code = referral_code.strip().upper()

    promoter = Promoter.objects.filter(
        referral_code=referral_code,
        application_status="approved"
    ).first()

    if not promoter:
        raise ValidationError({"referral_code": "Invalid or inactive referral code."})

    return promoter


def validate_payment_method(method):
    """Validate payment method."""
    method = method.strip()
    if method != "Razorpay":
        raise ValidationError({"payment_method": "Only Razorpay payments are supported."})
    return method


def clear_user_cart(user):
    """Clear all cart items for the user."""
    CartItem.objects.filter(cart__user=user).delete()


def format_razorpay_response(razorpay_order, order):
    """Return standardized Razorpay response."""
    return {
        "order_id": razorpay_order.get("id"),
        "razorpay_key": settings.RAZORPAY_KEY_ID,
        "amount": razorpay_order.get("amount"),
        "currency": razorpay_order.get("currency"),
        "order": OrderSerializer(order).data
    }


# -----------------------------
# Order Creation & Updates
def create_order_with_items(user, items, shipping_address, payment_method, promoter=None):
    """Create an Order and associated OrderItems, handle stock, commission, delivery, and Razorpay."""
    order = Order.objects.create(
        user=user,
        shipping_address=shipping_address,
        subtotal=Decimal("0.00"),
        total=Decimal("0.00"),
        delivery_charge=Decimal("0.00"),
        total_commission=Decimal("0.00"),
        payment_method=payment_method,
        is_paid=False,
        promoter=promoter
    )

    subtotal = Decimal("0.00")
    total_commission = Decimal("0.00")
    total_weight_kg = Decimal('0.00')
    order_items_data = []

    for item in items:
        if isinstance(item, dict):
            variant_id = item.get("product_variant_id")
            quantity = int(item.get("quantity", 1))
            if not variant_id:
                raise ValidationError("Missing product_variant_id in item.")
            variant = get_object_or_404(ProductVariant, id=variant_id)
        else:
            variant = item.product_variant
            quantity = item.quantity

        if variant.stock < quantity:
            raise ValidationError(f"Not enough stock for {variant}")

        variant.stock -= quantity
        variant.save(update_fields=["stock"])

        price = Decimal(str(variant.offer_price or variant.base_price))
        subtotal += price * Decimal(quantity)
        total_weight_kg += Decimal(str(variant.weight)) * Decimal(quantity)


        # Promoter commission
        commission_rate = Decimal(str(variant.promoter_commission_rate or 0))
        commission_amount = price * quantity * (commission_rate / Decimal('100'))
        total_commission += commission_amount

        OrderItem.objects.create(
            order=order,
            product_variant=variant,
            quantity=quantity,
            price=price,
            promoter_commission_rate=commission_rate,
            promoter_commission_amount=commission_amount,
            promoter=promoter
        )

        order_items_data.append({
            "product_variant_id": variant.id,
            "quantity": quantity,
            "unit_price": float(price),
            "commission_rate": float(commission_rate),
            "commission_amount": float(commission_amount)
        })

    # Delivery charge
    try:

        delivery_info = get_delivery_charge(
            o_pin="643212",
            d_pin=shipping_address.postal_code,
            weight_grams=total_weight_kg * 1000,  # grams
            payment_type="Pre-paid"
        )
        delivery_charge = Decimal(str(delivery_info.get("charge", 0)))
    except Exception as e:
        logger.warning(f"Delivery charge fetch failed :{e}")
        delivery_charge=Decimal('0.00')
    # Update order totals
    order.subtotal = subtotal
    order.delivery_charge = delivery_charge
    order.total_commission = total_commission
    order.total = subtotal + delivery_charge
    order.save(update_fields=["subtotal", "delivery_charge", "total_commission", "total"])

    

    return order, None, order_items_data


from django.utils import timezone
def update_order_status_from_items(order):
    item_statuses = list(order.items.values_list('status', flat=True))
    print(f"[DEBUG] Order {order.order_number} item statuses: {item_statuses}")

    if not item_statuses:
        order.status = 'pending'
        print(f"[DEBUG] No items found. Setting order status to 'pending'.")
    elif all(status in ['cancelled', 'failed'] for status in item_statuses):
        order.status = 'cancelled'
        print(f"[DEBUG] All items cancelled/failed. Setting order status to 'cancelled'.")
    elif all(status == 'fulfilled' for status in item_statuses):
        order.status = 'fulfilled'
        print(f"[DEBUG] All items fulfilled. Setting order status to 'fulfilled'.")
    elif any(status == 'processing' for status in item_statuses):
        order.status = 'processing'
        print(f"[DEBUG] Some items processing. Setting order status to 'processing'.")
    elif any(status == 'pending' for status in item_statuses):
        order.status = 'pending'
        print(f"[DEBUG] Some items pending. Setting order status to 'pending'.")
    else:
        print(f"[DEBUG] No matching condition. Order status unchanged: {order.status}")

    order.save(update_fields=['status'])
    print(f"[DEBUG] Final order status for {order.order_number}: {order.status}")    

def update_item_status(item_id, expected_status, new_status, user, timestamp_field=None, comment=None):
    """Update an OrderItem's status with logging and audit trail."""
    try:
        item = OrderItem.objects.select_related("order").get(id=item_id)
    except OrderItem.DoesNotExist:
        raise ValidationError("Item not found")

    if item.status != expected_status:
        raise ValidationError(
            f"Only items with status '{expected_status}' can be marked as '{new_status}'"
        )

    # ✅ update status + optional timestamp
    item.status = new_status
    if timestamp_field:
        setattr(item, timestamp_field, timezone.now())
    item.save(update_fields=["status"] + ([timestamp_field] if timestamp_field else []))

    # ✅ create admin log (formerly warehouse log)
    AdminLog.objects.create(
        order_item=item,
        order=item.order,
        action=new_status,
        updated_by=user,
        comment=comment or f"Status changed from '{expected_status}' to '{new_status}'"
    )

    # ✅ update order status
    update_order_status_from_items(item.order)

    logger.info(f"Item {item.id} marked as {new_status} by {user.email}")
    return item


def calculate_order_totals(items, shipping_address=None):
    """Calculate subtotal and total for a list of items."""
    subtotal = Decimal("0.00")

    for item in items:
        if isinstance(item, dict):
            variant_id = item.get("product_variant_id")
            quantity = int(item.get("quantity", 1))
            if not variant_id or quantity <= 0:
                continue
            variant = ProductVariant.objects.filter(id=variant_id, is_active=True).first()
            if not variant:
                continue
        else:
            variant = getattr(item, "product_variant", None)
            quantity = getattr(item, "quantity", 1)
            if not variant or quantity <= 0:
                continue

        price = variant.offer_price or variant.base_price
        subtotal += price * quantity

    return {
        "subtotal": subtotal,
        "total": subtotal,
    }

import razorpay
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
def process_refund(order, items=None, amount=None):
    """
    Handles full or partial refund for an Order.
    - If `items` is provided, refunds only for those OrderItems.
    - Defaults to full refund (including delivery charge) when no items specified.
    - Only supports Razorpay payments.
    """

    # --- Basic validations ---
    if not order.is_paid:
        raise ValidationError("Cannot refund an unpaid order.")

    if order.payment_method.lower() != "razorpay":
        raise ValidationError("Only Razorpay refunds are supported.")

    if not order.razorpay_payment_id:
        raise ValidationError("No Razorpay payment ID available for refund.")

    # --- Determine refund amount ---
    if amount is None:
        if items:
            # Partial refund for specific items
            amount = sum(item.price * item.quantity for item in items)
        else:
            # Full refund (includes delivery charge since customer paid it)
            amount = order.total

    # --- Initialize Razorpay client ---
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        refund = client.payment.refund(order.razorpay_payment_id, {"amount": int(amount * 100)})

        # --- Update refund info on Order ---
        refund_status = refund.get("status", "pending")
        order.refund_id = refund.get("id")
        order.refund_status = refund_status
        order.refunded_at = timezone.now()
        order.is_refunded = refund_status == "processed"  # ✅ True if refund processed
        order.save(update_fields=["refund_status", "refund_id", "refunded_at", "is_refunded"])

        # --- Mark refunded items ---
        if items:
            for item in items:
                item.status = "cancelled"  # or "refunded" if added to status choices
                item.refund_amount = item.price * item.quantity
                item.save(update_fields=["status", "refund_amount"])
        else:
            # Full refund → mark all items refunded
            order.items.update(
                status="cancelled",
                refund_amount=models.F("price") * models.F("quantity")
            )

        return order.refund_id

    except Exception as e:
        order.refund_status = "failed"
        order.is_refunded = False
        order.save(update_fields=["refund_status", "is_refunded"])
        raise ValidationError(f"Refund failed: {str(e)}")

    
def check_refund_status(order_number):
    try:
        order = Order.objects.get(order_number=order_number)

        if not order.refund_id:
            return {"success": False, "message": "No refund initiated for this order."}

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            refund = client.refund.fetch(order.refund_id)
            status = refund.get("status", "unknown")

            order.refund_status = status

            if status == "processed":
                order.is_refunded = True
                order.refunded_at = timezone.now()
            elif status == "failed":
                order.is_refunded = False

            order.save(update_fields=["refund_status", "is_refunded", "refunded_at"])

            message = (
                "Refund Processed – may take 5–7 days to reflect in your account."
                if status == "processed"
                else "Refund is in progress. Please check back later."
            )

            return {
                "success": True,
                "order_number": order.order_number,
                "refund_id": refund.get("id", order.refund_id),
                "refund_status": status,
                "amount": refund.get("amount", Decimal(order.total) * 100) / 100,
                "refund_method": "Razorpay",
                "payment_id": refund.get("payment_id"),
                "is_refunded": order.is_refunded,
                "refunded_at": order.refunded_at,
                "message": message,
            }

        except razorpay.errors.ServerError:
            return {"success": False, "message": "Razorpay server error. Please try again later."}
        except razorpay.errors.BadRequestError as e:
            return {"success": False, "message": f"Invalid refund ID: {str(e)}"}
        except razorpay.errors.GatewayError as e:
            return {"success": False, "message": f"Payment gateway error: {str(e)}"}
        except Exception as e:
            return {"success": False, "message": str(e) or "Unknown Razorpay error."}

    except Order.DoesNotExist:
        return {"success": False, "message": "Order not found."}
    except Exception as e:
        return {"success": False, "message": str(e) or "Unknown error."}

import requests
from django.conf import settings

DELHIVERY_API_TOKEN = settings.DELHIVERY_API_TOKEN
DELHIVERY_API_URL = settings.DELHIVERY_API_URL

def get_delivery_charge(o_pin, d_pin, weight_grams=1, payment_type="Pre-paid"):
    params = {
        "md": "E",
        "ss": "Delivered",
        "o_pin": str(o_pin),
        "d_pin": str(d_pin),
        "cgm": weight_grams,
        "pt": payment_type
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Token {DELHIVERY_API_TOKEN}"
    }

    try:
        response = requests.get(DELHIVERY_API_URL, params=params, headers=headers, timeout=10)

        if response.status_code == 401:
            print("[Delhivery API Error] Unauthorized token. Check if token is active.")
            return {"charge": 0, "service": None, "gross": 0, "taxes": {}, "charged_weight": 0}

        if response.status_code != 200:
            print(f"[Delhivery API HTTP Error] Status code: {response.status_code}")
            return {"charge": 0, "service": None, "gross": 0, "taxes": {}, "charged_weight": 0}

        # Safely parse JSON
        try:
            data = response.json()
        except ValueError:
            print("[Delhivery API Error] Non-JSON response received.")
            return {"charge": 0, "service": None, "gross": 0, "taxes": {}, "charged_weight": 0}

        if isinstance(data, list) and data:
            service_info = data[0]
            return {
                "charge": service_info.get("total_amount", 0),
                "service": service_info.get("status", ""),
                "gross": service_info.get("gross_amount", 0),
                "taxes": service_info.get("tax_data", {}),
                "charged_weight": service_info.get("charged_weight", weight_grams)
            }

        return {"charge": 0, "service": None, "gross": 0, "taxes": {}, "charged_weight": weight_grams}

    except Exception as e:
        print(f"[Delhivery API Error] {e}")
        return {"charge": 0, "service": None, "gross": 0, "taxes": {}, "charged_weight": weight_grams}

def create_delhivery_shipment(order):
    """
    Creates a shipment on Delhivery for the given order and returns
    tracking info. Handles both prepaid and COD orders.
    """
    import requests
    import json
    from django.conf import settings

    url = "https://track.delhivery.com/api/cmu/create.json"
    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    pickup = settings.DELHIVERY_PICKUP  # preconfigured pickup dict

    # --- Calculate total weight ---
    total_weight_grams = sum(
        (item.product_variant.weight or 0) * item.quantity
        for item in order.items.all()
    )
    total_weight_kg = max(total_weight_grams / 1000.0, 0.1)  # minimum 0.1kg required

    # --- Build shipment data as per Delhivery specs ---
    shipment = {
        "name": order.shipping_address.full_name,
        "add": order.shipping_address.address,
        "pin": str(order.shipping_address.postal_code),
        "city": order.shipping_address.city,
        "state": order.shipping_address.state,
        "country": order.shipping_address.country or "India",
        "phone": str(order.shipping_address.phone_number),
        "order": order.order_number,
        "payment_mode": "Prepaid" if order.is_paid else "COD",
        "quantity": str(sum(item.quantity for item in order.items.all())),
        "products_desc": ", ".join(
            [item.product_variant.product.name for item in order.items.all()]
        )[:250],  # avoid exceeding max length
        "total_amount": str(order.total),
        "cod_amount": "0" if order.is_paid else str(order.total),
        "weight": str(round(total_weight_kg, 2)),
        "shipment_width": "10",
        "shipment_height": "10",
        "return_add": pickup["add"],
        "return_city": pickup["city"],
        "return_state": pickup.get("state", order.shipping_address.state),
        "return_pin": str(pickup["pin"]),
        "return_country": pickup["country"],
        "return_phone": str(pickup["phone"]),
        "seller_add": pickup["add"],
        "seller_name": pickup["name"],
        "seller_inv": f"INV-{order.order_number}",
        "shipping_mode": "Surface",
        "address_type": "home",
        "order_date": None,
    }

    payload = {
        "format": "json",
        "data": json.dumps({
            "shipments": [shipment],
            "pickup_location": {
                # Must match pickup name in Delhivery dashboard
                "name": pickup["name"]
            }
        }),
    }

    # --- Call Delhivery API ---
    try:
        res = requests.post(url, headers=headers, data=payload, timeout=20)
        data = res.json()
    except Exception as e:
        return {"success": False, "error": f"Request failed: {str(e)}"}

    # --- Success case ---
    if res.status_code == 200 and data.get("packages"):
        pkg = data["packages"][0]
        waybill = pkg.get("waybill")

        if not waybill:
            return {"success": False, "error": "Waybill missing in response", "response": data}

        # ✅ Save shipment info
        public_tracking_url = f"https://www.delhivery.com/track/package/{waybill}/"
        internal_tracking_url = f"https://track.delhivery.com/p/{waybill}"

        order.waybill = waybill
        order.courier = "Delhivery"
        order.tracking_url = public_tracking_url  # Customer-facing link
        order.save(update_fields=["waybill", "courier", "tracking_url", "status"])

        return {
            "success": True,
            "waybill": waybill,
            "ref_id": order.order_number,
            "tracking_url": public_tracking_url,
            "internal_tracking_url": internal_tracking_url,
            "response": data,
        }

    # --- Failure case ---
    return {
        "success": False,
        "status_code": res.status_code,
        "error": data or {"message": "No valid response"},
    }



def cancel_delhivery_shipment(waybill):
    """
    Cancels a Delhivery shipment using its waybill number.
    """
    url = "https://track.delhivery.com/api/p/edit"
    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "waybill": waybill,
        "cancellation": "true",
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        # ✅ Delhivery sometimes returns "status" instead of "success"
        if response.status_code == 200 and (data.get("success") or data.get("status")):
            remark = data.get("remark") or data.get("message") or "Shipment cancelled successfully"
            logger.info(f"✅ Delhivery shipment {waybill} cancelled successfully: {remark}")
            return {"success": True, "message": remark, "details": data}

        else:
            # Still log the data for clarity
            logger.warning(f"⚠️ Delhivery cancellation may have failed for {waybill}: {data}")
            return {
                "success": False,
                "message": data.get("remark") or data.get("message") or "Failed to cancel shipment",
                "details": data,
            }

    except requests.exceptions.RequestException as e:
        logger.exception(f"❌ Delhivery cancellation request failed for {waybill}")
        return {"success": False, "message": "Delhivery request failed", "error": str(e)}



import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def track_delhivery_shipment(waybill=None, ref_id=None):
    """
    Tracks a Delhivery shipment using waybill or ref_id.
    Works for both staging and live environments.
    """
    if not waybill and not ref_id:
        return {"success": False, "message": "waybill or ref_id is required"}

    base_url = "https://track.delhivery.com/api/v1/packages/json/"
    params = {}
    if waybill:
        params["waybill"] = waybill
    if ref_id:
        params["ref_ids"] = ref_id

    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Accept": "application/json",
    }

    try:
        response = requests.get(base_url, headers=headers, params=params, timeout=10)
        if response.status_code != 200:
            logger.warning(f"⚠️ Delhivery returned {response.status_code}: {response.text}")
            return {
                "success": False,
                "message": f"Delhivery API returned {response.status_code}",
                "details": response.text,
            }

        data = response.json()
        shipment_data = data.get("ShipmentData", [])

        if not shipment_data:
            return {
                "success": False,
                "message": "No shipment data found for the given parameters.",
                "details": data,
            }

        shipment = shipment_data[0].get("Shipment", {})
        status_info = shipment.get("Status", {})
        scans = shipment.get("Scans", [])

        # Normalize inconsistent field names between staging and production
        summary = {
            "waybill": shipment.get("AWB") or shipment.get("Waybill"),
            "ref_id": shipment.get("ReferenceNo") or shipment.get("OrderNo"),
            "status": status_info.get("Status"),
            "status_type": status_info.get("StatusType"),
            "remarks": status_info.get("Instructions"),
            "scanned_on": status_info.get("StatusDateTime"),
            "origin": shipment.get("Origin"),
            "destination": shipment.get("Destination"),
            "pickup_date": shipment.get("PickUpDate") or shipment.get("PickedupDate"),
            "delivered_date": shipment.get("DeliveryDate") or shipment.get("DeliveredDate"),
        }

        # Flatten scan events
        scan_events = []
        for s in scans:
            detail = s.get("ScanDetail", {})
            scan_events.append({
                "datetime": detail.get("ScanDateTime"),
                "status": detail.get("Scan"),
                "type": detail.get("ScanType"),
                "location": detail.get("ScannedLocation"),
                "remarks": detail.get("Instructions"),
                "code": detail.get("StatusCode"),
            })

        logger.info(f"📦 Tracked Delhivery shipment: {summary}")

        return {
            "success": True,
            "message": "Shipment tracking fetched successfully.",
            "summary": summary,
            "scans": scan_events,
            "raw_data": data,
        }

    except requests.RequestException as e:
        logger.exception("❌ Error contacting Delhivery tracking API")
        return {
            "success": False,
            "message": "Error contacting Delhivery",
            "error": str(e),
        }

