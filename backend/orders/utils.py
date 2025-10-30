# orders/utils.py
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
import razorpay
from django.conf import settings
from .models import Order, OrderItem, ShippingAddress,Refund
from products.models import ProductVariant
from promoter.models import Promoter
from cart.models import CartItem
import razorpay
from admin_dashboard.models import AdminLog
from razorpay.errors import ServerError, BadRequestError, GatewayError, SignatureVerificationError
from django.conf import settings
from decimal import Decimal

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
from decimal import Decimal
from django.conf import settings
from django.db import models, transaction
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
            # Partial refund (for specific items)
            amount = sum(Decimal(item.price) * item.quantity for item in items)
        else:
            # Full refund (includes delivery charge)
            amount = Decimal(order.total)

    amount = Decimal(amount).quantize(Decimal("0.01"))
    if amount <= 0:
        raise ValidationError("Refund amount must be greater than zero.")

    # --- Initialize Razorpay client ---
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        with transaction.atomic():
            refund_response = client.payment.refund(
                order.razorpay_payment_id,
                {"amount": int(amount * 100)}  # Razorpay expects amount in paise
            )

            refund_id = refund_response.get("id")
            refund_status = refund_response.get("status", "pending")

            # --- Update refund info on Order ---
            refund = Refund.objects.create(
                order=order,
                refund_id=refund_id,
                amount=amount,
                status=refund_status,
                processed_at=timezone.now() if refund_status == "processed" else None,
                notes=f"Refund initiated via Razorpay for ₹{amount}"
            )
            # --- Mark refunded items ---
            if items:
                # Partial refund
                for item in items:
                    item.status = "cancelled"  # You can change to "refunded" if you add that choice
                    item.refund_amount = Decimal(item.price) * item.quantity
                    item.save(update_fields=["status", "refund_amount"])
            else:
                # Full refund → mark all items refunded
                order.items.update(
                    status="cancelled",
                    refund_amount=models.F("price") * models.F("quantity")
                )

            return refund_id

    except Exception as e:
        Refund.objects.create(
            order=order,
            amount=amount,
            status="failed",
            notes=str(e)
        )
        raise ValidationError(f"Refund failed: {str(e)}")

from decimal import Decimal
import razorpay
from django.conf import settings
from django.utils import timezone
from orders.models import Order

def process_refund(order, items=None, amount=None):
    """
    Handles full or partial refund for an Order.
    - If `items` provided → partial refund for those OrderItems.
    - Defaults to full refund (including delivery charge).
    - Creates a Refund record and updates item statuses.
    """

    if not order.is_paid:
        raise ValidationError("Cannot refund an unpaid order.")

    if order.payment_method.lower() != "razorpay":
        raise ValidationError("Only Razorpay refunds are supported.")

    if not order.razorpay_payment_id:
        raise ValidationError("No Razorpay payment ID available for refund.")

    # --- Determine refund amount ---
    if amount is None:
        if items:
            amount = sum(Decimal(item.price) * item.quantity for item in items)
        else:
            amount = Decimal(order.total)

    amount = Decimal(amount).quantize(Decimal("0.01"))
    if amount <= 0:
        raise ValidationError("Refund amount must be greater than zero.")

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        with transaction.atomic():
            # Create refund via Razorpay API
            refund_response = client.payment.refund(
                order.razorpay_payment_id,
                {"amount": int(amount * 100)}  # Razorpay expects paise
            )

            refund_id = refund_response.get("id")
            refund_status = refund_response.get("status", "pending")

            # Create Refund record in DB
            refund = Refund.objects.create(
                order=order,
                refund_id=refund_id,
                amount=amount,
                status=refund_status,
                processed_at=timezone.now() if refund_status == "processed" else None,
                notes=f"Refund initiated via Razorpay for ₹{amount}"
            )

            # Mark refunded items
            if items:
                for item in items:
                    item.status = "cancelled"
                    item.refund_amount = Decimal(item.price) * item.quantity
                    item.save(update_fields=["status", "refund_amount"])
            else:
                order.items.update(
                    status="cancelled",
                    refund_amount=models.F("price") * models.F("quantity")
                )

            return refund.refund_id

    except Exception as e:
        Refund.objects.create(
            order=order,
            amount=amount,
            status="failed",
            notes=str(e)
        )
        raise ValidationError(f"Refund failed: {str(e)}")


def check_refund_status(order_number):
    """
    Checks and updates the latest refund status for an order.
    Syncs each Refund entry with Razorpay.
    """
    try:
        order = Order.objects.get(order_number=order_number)
    except Order.DoesNotExist:
        return {"success": False, "message": "Order not found."}

    latest_refund = order.refunds.order_by("-created_at").first()
    if not latest_refund or not latest_refund.refund_id:
        return {"success": False, "message": "No refund initiated for this order."}

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        refund_data = client.refund.fetch(latest_refund.refund_id)
        status = refund_data.get("status", "unknown")
        refund_amount = Decimal(refund_data.get("amount", 0)) / Decimal(100)

        # Update Refund model
        if latest_refund.status != status:
            latest_refund.status = status
            if status == "processed":
                latest_refund.processed_at = timezone.now()
            latest_refund.save(update_fields=["status", "processed_at"])

        # Response summary
        if status == "processed":
            message = "✅ Refund processed successfully. Amount will reflect soon."
        elif status in ("pending", "queued"):
            message = "⏳ Refund is in progress. Please check back later."
        elif status == "failed":
            message = "❌ Refund failed. Please contact support."
        else:
            message = f"Refund status: {status}"

        return {
            "success": True,
            "order_number": order.order_number,
            "refund_id": latest_refund.refund_id,
            "refund_status": status,
            "amount": float(refund_amount),
            "refund_method": "Razorpay",
            "processed_at": latest_refund.processed_at,
            "message": message,
        }

    except Exception as e:
        return {"success": False, "message": str(e) or "Unknown Razorpay error."}

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
    Creates a shipment on Delhivery for the given order and returns tracking info.
    Handles both prepaid and COD orders.
    """
    import json, requests, logging
    from django.conf import settings

    logger = logging.getLogger(__name__)
    url = "https://track.delhivery.com/api/cmu/create.json"

    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    pickup = getattr(settings, "DELHIVERY_PICKUP", None)
    if not pickup:
        return {"success": False, "error": "Pickup configuration missing in settings"}

    try:
        total_weight_grams = sum(
            (item.product_variant.weight or 0) * item.quantity for item in order.items.all()
        )
        total_weight_kg = max(total_weight_grams / 1000.0, 0.1)
    except Exception as e:
        logger.exception("Error calculating shipment weight")
        total_weight_kg = 0.1

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
        )[:250],
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
    }

    payload = {
        "format": "json",
        "data": json.dumps({
            "shipments": [shipment],
            "pickup_location": {"name": pickup["name"]},
        }),
    }

    try:
        res = requests.post(url, headers=headers, data=payload, timeout=20)
        try:
            data = res.json()
        except ValueError:
            logger.warning(f"Invalid JSON response from Delhivery: {res.text}")
            return {"success": False, "error": "Invalid JSON response", "response_text": res.text}
    except requests.RequestException as e:
        logger.exception("Delhivery shipment request failed")
        return {"success": False, "error": str(e)}

    if res.status_code == 200 and data.get("packages"):
        pkg = data["packages"][0]
        waybill = pkg.get("waybill")
        if not waybill:
            return {"success": False, "error": "Waybill missing in response", "response": data}

        order.waybill = waybill
        order.courier = "Delhivery"
        order.tracking_url = f"https://www.delhivery.com/track/package/{waybill}/"
        order.save(update_fields=["waybill", "courier", "tracking_url"])

        logger.info(f"✅ Shipment created on Delhivery: {order.order_number} ({waybill})")

        return {
            "success": True,
            "waybill": waybill,
            "ref_id": order.order_number,
            "tracking_url": order.tracking_url,
            "internal_tracking_url": f"https://track.delhivery.com/p/{waybill}",
            "response": data,
        }

    logger.warning(f"⚠️ Delhivery shipment creation failed ({res.status_code}): {data}")
    return {"success": False, "status_code": res.status_code, "error": data}

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
    Tracks one or multiple Delhivery shipments using waybill(s) or ref_id(s).
    Automatically detects list vs string input.
    Works for both staging and live environments.
    """
    if not waybill and not ref_id:
        return {"success": False, "message": "waybill or ref_id is required"}

    base_url = "https://track.delhivery.com/api/v1/packages/json/"

    # 🧠 Handle both single and list input
    params = {}
    if waybill:
        if isinstance(waybill, (list, tuple)):
            params["waybill"] = ",".join(map(str, waybill))
        else:
            params["waybill"] = str(waybill)
    if ref_id:
        if isinstance(ref_id, (list, tuple)):
            params["ref_ids"] = ",".join(map(str, ref_id))
        else:
            params["ref_ids"] = str(ref_id)

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

        # 🧩 Build summaries for each shipment
        results = []
        for shipment_entry in shipment_data:
            shipment = shipment_entry.get("Shipment", {})
            status_info = shipment.get("Status", {})
            scans = shipment.get("Scans", [])

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

            results.append({
                "summary": summary,
                "scans": scan_events,
            })

        logger.info(f"📦 Tracked {len(results)} Delhivery shipment(s).")

        # ✅ Return uniform structure
        return {
            "success": True,
            "message": f"Fetched {len(results)} shipment(s) successfully.",
            "results": results,
            "raw_data": data,
        }

    except requests.RequestException as e:
        logger.exception("❌ Error contacting Delhivery tracking API")
        return {
            "success": False,
            "message": "Error contacting Delhivery",
            "error": str(e),
        }
