# orders/utils.py
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
import razorpay
import json
import logging
import requests
from django.conf import settings
from django.utils import timezone
import time
from django.conf import settings
from .models import Order, OrderItem, ShippingAddress,Refund,ReturnRequest,ReturnRecoveryAccount
from products.models import ProductVariant
from promoter.models import Promoter
from cart.models import CartItem
import razorpay
from admin_dashboard.models import AdminLog
from razorpay.errors import ServerError, BadRequestError, GatewayError, SignatureVerificationError
from django.conf import settings
from decimal import Decimal
from admin_dashboard.utils import create_warehouse_log
from django.db import models, transaction
logger = logging.getLogger(__name__)
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

def create_order_with_items(
    user,
    items,
    shipping_address,
    payment_method,
    existing_order=None,
    fallback_promoter_code=None,
):
    """
    Corrected version:
    - Uses per-item promoter passed from process_checkout()
    - Does NOT override or recalculate promoter
    - Only uses fallback promoter if item has no referral & no promoter
    - Ensures true item-level referral logic
    """

    # Reuse existing order if passed (retry flow)
    if existing_order:
        order = existing_order
        order.items.all().delete()
    else:
        order = Order.objects.create(
            user=user,
            shipping_address=shipping_address,
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
            delivery_charge=Decimal("0.00"),
            total_commission=Decimal("0.00"),
            payment_method=payment_method,
            is_paid=False,
            promoter=None,  # Order-level promoter never used
        )

    subtotal = Decimal("0.00")
    total_commission = Decimal("0.00")
    total_weight_kg = Decimal("0.00")
    order_items_data = []

    # ----------------------------------------------------------
    # 🔵 PROCESS EACH ITEM
    # ----------------------------------------------------------
    for item in items:

        # 1️⃣ Fetch variant + quantity
        if isinstance(item, dict):
            variant_id = item.get("product_variant_id")
            quantity = int(item.get("quantity", 1))
            variant = get_object_or_404(ProductVariant, id=variant_id)
            item_referral = item.get("referral_code")  # raw referral code
        else:
            variant = item.product_variant
            quantity = item.quantity
            item_referral = getattr(item, "referral_code", None)

        # 2️⃣ Basic price calc
        price = Decimal(str(variant.offer_price or variant.base_price))
        subtotal += price * quantity
        total_weight_kg += Decimal(str(variant.weight)) * quantity

        # ------------------------------------------------------
        # 🟢 PROMOTER — SINGLE SOURCE OF TRUTH
        # ------------------------------------------------------
        # process_checkout() already validated this
        item_promoter = item.get("promoter")

        # Only fallback promoter if:
        # - item has NO promoter
        # - and a fallback was provided
        if not item_promoter and fallback_promoter_code:
            item_promoter = Promoter.objects.filter(referral_code=fallback_promoter_code).first()

        # The referral code written to DB
        final_referral_code = item_referral or fallback_promoter_code

        # 3️⃣ Commission calculation
        if item_promoter:
            commission_rate = Decimal(str(variant.promoter_commission_rate or 0))
            commission_amount = (price * quantity) * (commission_rate / Decimal("100"))
        else:
            commission_rate = Decimal("0.00")
            commission_amount = Decimal("0.00")

        total_commission += commission_amount

        # 4️⃣ Create the order item
        OrderItem.objects.create(
            order=order,
            product_variant=variant,
            quantity=quantity,
            price=price,
            promoter=item_promoter,
            promoter_commission_rate=commission_rate,
            promoter_commission_amount=commission_amount,
            referral_code=final_referral_code,
        )

        order_items_data.append({
            "product_variant_id": variant.id,
            "quantity": quantity,
            "unit_price": float(price),
            "commission_rate": float(commission_rate),
            "commission_amount": float(commission_amount),
            "referral_code": final_referral_code,
        })

    # ----------------------------------------------------------
    # 🚚 DELIVERY CHARGE
    # ----------------------------------------------------------
    try:
        delivery_info = get_delivery_charge(
            o_pin="643212",
            d_pin=shipping_address.postal_code,
            weight_grams=total_weight_kg * 1000,
            payment_type="Pre-paid"
        )
        delivery_charge = Decimal(str(delivery_info.get("charge", 0)))
    except Exception:
        delivery_charge = Decimal("0.00")

    # ----------------------------------------------------------
    # 💰 FINAL TOTALS
    # ----------------------------------------------------------
    order.subtotal = subtotal
    order.delivery_charge = delivery_charge
    order.total_commission = total_commission
    order.total = subtotal + delivery_charge
    order.save(update_fields=["subtotal", "delivery_charge", "total_commission", "total"])

    return order, None, order_items_data


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

def process_refund(return_request):
    """
    Executes a Razorpay refund for the given ReturnRequest.
    Assumes validation is already done at view level.
    """
    order = return_request.order
    amount = return_request.refund_amount
    order_item = return_request.order_item

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    try:
        with transaction.atomic():
            payment_data = client.payment.fetch(order.razorpay_payment_id)
            actual_paid_amount = Decimal(payment_data.get("amount", 0)) / 100
            already_refunded = Decimal(payment_data.get("amount_refunded", 0)) / 100

            if Decimal(amount) > (actual_paid_amount - already_refunded):
                raise ValidationError("Refund amount exceeds remaining refundable amount")

            refund_response = client.payment.refund(
                order.razorpay_payment_id,
                {"amount": int(Decimal(amount) * 100)}
            )

            refund_id = refund_response.get("id")
            refund_status = refund_response.get("status", "pending")

            refund = Refund.objects.create(
                order=order,
                refund_id=refund_id,
                amount=Decimal(amount),
                status=refund_status,
                processed_at=timezone.now() if refund_status == "processed" else None,
                notes=f"Refund initiated for ReturnRequest #{return_request.id}"
            )

            if refund_status == "processed":
                return_request.mark_refunded(amount)
            else:
                return_request.status = "refund_pending"
                return_request.save(update_fields=["status"])

            return refund

    except Exception as e:
        Refund.objects.create(
            order=order,
            amount=Decimal(amount),
            status="failed",
            notes=str(e)
        )
        raise ValidationError(f"Refund failed: {str(e)}")

def check_refund_status(order_number):
    """
    Syncs the latest refund status with Razorpay and updates Refund model.
    Returns structured refund info.
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

        if latest_refund.status != status:
            latest_refund.status = status
            if status == "processed":
                latest_refund.processed_at = timezone.now()
            latest_refund.save(update_fields=["status", "processed_at"])

        # Build friendly response
        if status == "processed":
            msg = "✅ Refund processed successfully. Amount will reflect soon."
        elif status in ("pending", "queued"):
            msg = "⏳ Refund is in progress."
        elif status == "failed":
            msg = "❌ Refund failed. Please contact support."
        else:
            msg = f"Refund status: {status}"

        return {
            "success": True,
            "order_number": order.order_number,
            "refund_id": latest_refund.refund_id,
            "refund_status": status,
            "amount": float(refund_amount),
            "refund_method": "Razorpay",
            "processed_at": latest_refund.processed_at,
            "message": msg,
        }

    except razorpay.errors.BadRequestError as e:
        return {"success": False, "message": f"Razorpay Bad Request: {str(e)}"}

    except razorpay.errors.ServerError as e:
        return {"success": False, "message": f"Razorpay Server Error: {str(e)}"}

    except Exception as e:
        return {"success": False, "message": str(e) or "Unknown Razorpay error."}

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

def get_expected_tat(origin_pin, destination_pin, mot='E', pdt='B2C'):
    url = 'https://track.delhivery.com/api/dc/expected_tat'
    headers = {"Authorization": f"Token {DELHIVERY_API_TOKEN}"}
    params = {
        "origin_pin": origin_pin,
        "destination_pin": destination_pin,
        "mot": mot,
        "pdt": pdt,
    }

    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        if data.get("success") and data.get("data", {}).get("tat") is not None:
            return {
                "tat_days": data["data"]["tat"],
                "msg": data.get("msg", "")
            }

    except requests.exceptions.Timeout:
        print("[Delhivery TAT API Error] Request timed out.")
    except requests.exceptions.RequestException as e:
        print(f"[Delhivery TAT API Error] {e}")
    except ValueError:
        print("[Delhivery TAT API Error] Invalid JSON response.")

    return {"tat_days": None, "msg": "Unable to fetch expected TAT"}

def create_delhivery_shipment(order):
    """
    Creates a single Delhivery shipment for the given order.
    Updates waybill, courier, and tracking info at the order level.
    Handles both prepaid and COD orders.
    """
    import json
    import logging
    import requests
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

    # 🧮 Calculate total weight
    try:
        total_weight = sum(
            item.product_variant.get_weight_in_grams() * item.quantity
            for item in order.items.all()
        )
        if total_weight <= 0:
            total_weight = 500
    except Exception as e:
        logger.exception("Error calculating total weight")
        total_weight = 500

    # 🧾 Prepare product description summary
    products_desc = ", ".join(
        [item.product_variant.product.name for item in order.items.all()]
    )[:250]

    try:
        shipment = {
            "name": order.shipping_address.full_name,
            "add": order.shipping_address.address,
            "pin": str(order.shipping_address.postal_code),
            "city": order.shipping_address.city,
            "state": order.shipping_address.state,
            "country": order.shipping_address.country or "India",
            "phone": str(order.shipping_address.phone_number),
            "order": str(order.order_number),
            "payment_mode": "Prepaid" if order.is_paid else "COD",
            "quantity": str(sum(item.quantity for item in order.items.all())),
            "products_desc": products_desc,
            "total_amount": str(order.total),
            "cod_amount": "0" if order.is_paid else str(order.total),
            "weight": str(int(total_weight)),
            "shipment_width": "10",
            "shipment_height": "10",
            "shipment_length":"10",
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
    except Exception:
        logger.exception("Error preparing shipment data for order")
        return {"success": False, "error": "Failed to prepare shipment data"}

    payload = {
        "format": "json",
        "data": json.dumps({
            "shipments": [shipment],
            "pickup_location": {"name": pickup["name"]},
        }),
    }

   
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=20)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.exception("Delhivery shipment request failed")
        return {"success": False, "error": str(e)}
    except ValueError:
        logger.warning(f"Invalid JSON response from Delhivery: {response.text}")
        return {"success": False, "error": "Invalid JSON response"}

    if data.get("packages"):
        pkg = data["packages"][0]
        waybill = pkg.get("waybill")
        if not waybill:
            return {"success": False, "error": "Waybill missing in response"}

        # ✅ Save at Order level
        order.waybill = waybill
        order.courier = "Delhivery"
        order.tracking_url = f"https://www.delhivery.com/track/package/{waybill}/"
        order.save(update_fields=["waybill", "courier", "tracking_url"])

        logger.info(f"✅ Shipment created for order {order.order_number} ({waybill})")
        return {
            "success": True,
            "message": "Shipment created successfully",
            "waybill": waybill,
            "tracking_url": order.tracking_url,
        }

    logger.warning(f"⚠️ Delhivery shipment creation failed: {data}")
    return {"success": False, "error": data}

def cancel_delhivery_shipment(order):
    """
    Cancels a Delhivery shipment using the order's waybill number.
    Works safely for both prepaid and COD orders.
    """
    import requests
    import logging
    from django.conf import settings

    logger = logging.getLogger(__name__)

    if not order.waybill:
        return {"success": False, "message": "No waybill found for this order"}

    url = "https://track.delhivery.com/api/p/edit"
    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "waybill": order.waybill,
        "cancellation": "true",
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.exception(f"❌ Delhivery cancellation request failed for {order.order_number}")
        return {"success": False, "message": "Delhivery request failed", "error": str(e)}
    except ValueError:
        logger.error(f"Invalid JSON response from Delhivery during cancellation: {response.text}")
        return {"success": False, "message": "Invalid JSON response from Delhivery"}

    # ✅ Handle success or failure gracefully
    if response.status_code == 200 and (data.get("success") or data.get("status")):
        remark = data.get("remark") or data.get("message") or "Shipment cancelled successfully"

        # 🔄 Optionally clear tracking fields
        order.tracking_url = None
        order.courier = None
        order.save(update_fields=["tracking_url", "courier"])

        logger.info(f"✅ Delhivery shipment cancelled for order {order.order_number} ({order.waybill}): {remark}")
        return {"success": True, "message": remark, "details": data}

    logger.warning(f"⚠️ Delhivery cancellation failed for {order.order_number}: {data}")
    return {
        "success": False,
        "message": data.get("remark") or data.get("message") or "Failed to cancel shipment",
        "details": data,
    }

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
 
DELHIVERY_BASE_URL = "https://track.delhivery.com"

def create_reverse_pickup(return_request, use_mock=False):
    """
    Creates a reverse pickup (return shipment) in Delhivery for a given ReturnRequest.
    - If use_mock=True → simulates a successful response for local testing.
    """

    # ---------------- MOCK MODE ----------------
    if use_mock:
        mock_waybill = f"RVP-MOCK-{return_request.id}"
        return_request.waybill = mock_waybill
        return_request.status = "pickup_scheduled"
        return_request.pickup_date = timezone.now()
        return_request.save(update_fields=["waybill", "status", "pickup_date"])
        return {
            "success": True,
            "waybill": mock_waybill,
            "message": "Mock reverse pickup created successfully (no API call).",
            "data": {"mock": True},
        }

    # ---------------- REAL API MODE ----------------
    order = return_request.order
    address = order.shipping_address
    pickup = getattr(settings, "DELHIVERY_PICKUP", None)  # Warehouse details
    client_code = getattr(settings, "DELHIVERY_CLIENT_CODE", None)

    if not address:
        return {"success": False, "message": "Missing customer shipping address."}
    if not pickup:
        return {"success": False, "message": "Pickup location (warehouse) not configured."}
    if not client_code:
        return {"success": False, "message": "Missing Delhivery client code."}

    try:
        total_weight_grams = sum(
            (item.product_variant.get_weight_in_grams() or 500) * item.quantity
            for item in order.items.all()
        )
        total_weight_grams = max(total_weight_grams, 50)  # minimum 50 grams
    except Exception as e:
        logger.warning(f"Weight calculation failed: {e}")
        total_weight_grams = 50

    try:
        products_desc = ", ".join(
            [item.product_variant.product.name for item in order.items.all()]
        )[:250]
    except Exception:
        products_desc = f"Order {order.order_number}"

    # ---------------- Payload ----------------
    shipment = {
        "name": address.full_name,
        "add": address.address,
        "city": address.city,
        "state": address.state or "",
        "country": address.country or "India",
        "pin": str(address.postal_code),
        "phone": [str(address.phone_number)],
        "order": f"RET-{order.order_number}-{return_request.id}-{int(time.time())}",
        "payment_mode": "Pickup",
        "return_name": pickup["name"],
        "return_address": pickup["add"],
        "return_city": pickup["city"],
        "return_state": pickup.get("state", ""),
        "return_country": pickup.get("country", "India"),
        "return_pin": str(pickup["pin"]),
        "return_phone": [str(pickup["phone"])],
        "products_desc": products_desc,
        "weight": str(total_weight_grams),
        "shipment_length": "15",
        "shipment_width": "15",
        "shipment_height": "15",
        "fragile_shipment": False,
        "quantity": str(sum(item.quantity for item in order.items.all())),
        "total_amount": str(order.total),
        "cod_amount": "0.0",
    }

    # ---------------- Payload ----------------
    payload_dict = {
     # required by Delhivery
        "shipments": [shipment],
        "pickup_location": {
            "name": pickup["name"],  # <-- use the exact registered warehouse name
            "add": pickup["add"],
            "city": pickup["city"],
            "state": pickup.get("state", ""),
            "pin": str(pickup["pin"]),
            "country": pickup.get("country", "India"),
            "phone": [str(pickup["phone"])],
        },
    }
    payload = {
        "format": "json",
        "data": json.dumps(payload_dict)
    }
    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    response = requests.post(f"{DELHIVERY_BASE_URL}/api/cmu/create.json", headers=headers, data=payload, timeout=20)
    try:
        data = response.json()
    except ValueError:
        return {"success": False, "message": "Invalid JSON response.", "raw": response.text}

   
    if not data.get("packages") or not data["packages"][0].get("waybill"):
        return {"success": False, "message": "No waybill returned.", "data": data}

    waybill = data["packages"][0]["waybill"]
    return_request.waybill = waybill
    return_request.status = "pickup_scheduled"
    return_request.pickup_date = timezone.now()
    return_request.save(update_fields=["waybill", "status", "pickup_date"])

    return {"success": True, "waybill": waybill, "data": data}

def get_delhivery_return_charge(o_pin, d_pin, weight_grams, payment_type="Pre-paid"):
    """
    Calls Delhivery's rate API to estimate reverse pickup (DTO) charge.
    Returns a Decimal value for total charge.
    """
    params = {
        "md": "E",            # Express mode
        "ss": "DTO",          # DTO = reverse pickup
        "o_pin": str(o_pin),
        "d_pin": str(d_pin),
        "cgm": weight_grams,
        "pt": payment_type,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Token {DELHIVERY_API_TOKEN}",
    }

    try:
        response = requests.get(
            "https://track.delhivery.com/api/kinko/v1/invoice/charges/.json",
            params=params,
            headers=headers,
            timeout=10,
        )

        if response.status_code == 401:
            return Decimal("0.00")

        if response.status_code != 200:
            return Decimal("0.00")

        try:
            data = response.json()
        except ValueError:
           return Decimal("0.00")

        if isinstance(data, list) and data:
            total = data[0].get("total_amount", 0)
            return Decimal(str(total or "0.00"))

    except Exception as e:
        print(f"[Delhivery API Error] {e}")

    return Decimal("0.00")


def apply_return_recovery(user, order, delivery_charge, max_recovery=Decimal('10.00')):
    """
    Gradually recover pending return charges:
    - Recover 10% (minimum ₹5)
    - Cap by `max_recovery`
    - If pending < ₹5 → recover entire pending
    - Add recovered amount to delivery_charge
    - Log recovery in ReturnRecoveryAccount
    """
    from .models import ReturnRecoveryAccount

    # Ensure decimals
    delivery_charge = Decimal(str(delivery_charge))
    max_recovery = Decimal(str(max_recovery))

    account, _ = ReturnRecoveryAccount.objects.get_or_create(user=user)

    if account.balance_due <= 0:
        return delivery_charge, Decimal("0.00")

    # Dynamic 10% recovery
    dynamic_recovery = (account.balance_due * Decimal("0.10")).quantize(Decimal("0.01"))

    if account.balance_due >= Decimal("5.00"):
        recovery_amount = max(dynamic_recovery, Decimal("5.00"))
        recovery_amount = min(recovery_amount, max_recovery, account.balance_due)
    else:
        recovery_amount = account.balance_due

    if recovery_amount <= 0:
        return delivery_charge, Decimal("0.00")

    # Apply recovery to ledger
    applied = account.apply_payment(
        recovery_amount,
        source=f"Checkout Order #{getattr(order, 'id', 'Preview')}"
    )

    # Add to delivery charge
    delivery_charge += applied

    return delivery_charge, applied

