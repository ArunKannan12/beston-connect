from decimal import Decimal
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from .models import ShippingAddress,Order,OrderItemStatus
from products.models import ProductVariant
from promoter.models import Promoter
from cart.models import CartItem
from .utils import  create_order_with_items,create_delhivery_shipment,get_delhivery_return_charge,apply_return_recovery,get_delivery_charge
from django.conf import settings
import razorpay
from django.utils import timezone
from .signals import send_multichannel_notification
import uuid
from django.db import transaction

def validate_shipping_address(user, shipping_input):
    """
    Validate or create a ShippingAddress object.
    Accepts either:
      - an integer (existing address ID)
      - a dict (new address data, already validated by frontend)
    """
    if isinstance(shipping_input, int):
        # Existing saved address
        return get_object_or_404(ShippingAddress, id=shipping_input, user=user)

    elif isinstance(shipping_input, dict):
        # ✅ Trust frontend for pincode → state/district/locality mapping
        required_fields = ["postal_code", "locality", "address", "city", "state"]
        missing = [f for f in required_fields if not shipping_input.get(f)]
        if missing:
            raise ValidationError({"shipping_address": f"Missing fields: {', '.join(missing)}"})

        # Check if identical address already exists for user
        existing = ShippingAddress.objects.filter(
            user=user,
            postal_code=shipping_input.get("postal_code"),
            locality=shipping_input.get("locality"),
            address=shipping_input.get("address"),
            city=shipping_input.get("city"),
            state=shipping_input.get("state")
        ).first()

        return existing or ShippingAddress.objects.create(user=user, **shipping_input)

    else:
        raise ValidationError({"shipping_address": "Invalid format"})


def validate_promoter(referral_code):
    """Return promoter object if valid, else None."""
    if not referral_code:
        return None
    referral_code = referral_code.strip().upper()
    promoter = Promoter.objects.filter(
        referral_code=referral_code,
    ).first()

    if not promoter:
        raise ValidationError({"referral_code": "Invalid or inactive referral code."})
    return promoter

def validate_payment_method(method):
    """Ensure payment method is valid."""
    valid_methods = ["Cash on Delivery", "Razorpay", "Wallet"]
    if method not in valid_methods:
        raise ValidationError({"payment_method": "Invalid payment method."})
    return method

def prepare_order_response(order, razorpay_order=None):
    from .serializers import OrderSerializer
    from django.conf import settings

    order_data = OrderSerializer(order).data
    order_data.update({
        "subtotal": f"{order.subtotal:.2f}",
        "delivery_charge": f"{order.delivery_charge:.2f}",  # ✅ include delivery
        "total": f"{order.total:.2f}",
        "payment_method": order.payment_method,
        "is_paid": order.is_paid,
    })

    response = {"order": order_data}

    if razorpay_order:
        response.update({
            "razorpay_order_id": razorpay_order.get("id"),
            "razorpay_key": settings.RAZORPAY_KEY_ID,
            "amount": razorpay_order.get("amount"),
            "currency": razorpay_order.get("currency"),
        })

    return response

def calculate_order_preview(items, postal_code=None, shipping_address_id=None):
    """
    Calculate subtotal and total for a preview.
    Items: list of dicts with 'product_variant_id' and 'quantity'.
    postal_code: optional string
    shipping_address_id: optional, use saved address if provided
    """
    subtotal = Decimal("0.00")

    for item in items:
        try:
            variant = ProductVariant.objects.get(id=item["product_variant_id"])
        except ProductVariant.DoesNotExist:
            raise ValidationError({
                "items": f"ProductVariant with id {item['product_variant_id']} does not exist"
            })

        price = variant.offer_price or variant.base_price
        subtotal += price * item["quantity"]

    return {
        "subtotal": subtotal,
        "total": subtotal,
    }

def verify_razorpay_payment(order, razorpay_order_id, razorpay_payment_id, razorpay_signature, user, client):
    """
    Verifies Razorpay payment, updates order status,
    creates Delhivery shipment, applies promoter commission,
    and sends order confirmation (tracking sent later).
    """
    if order.is_paid:
        return {
            "message": "Order already marked as paid",
            "order_number": order.order_number,
            "status": order.status,
            "is_paid": order.is_paid,
        }

    # --- Verify Razorpay signature ---
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise ValidationError("Invalid payment signature")

    # --- Mark order as paid ---
    order.razorpay_payment_id = razorpay_payment_id
    order.razorpay_order_id = razorpay_order_id
    order.is_paid = True
    order.paid_at = timezone.now()
    order.status = "processing"
    order.payment_method = "Razorpay"
    order.save(update_fields=[
        "razorpay_payment_id", "razorpay_order_id", "is_paid",
        "paid_at", "status", "payment_method"
    ])

    # --- Try creating Delhivery shipment ---
    shipment = create_delhivery_shipment(order)
    if shipment.get("success"):
        order.waybill = shipment.get("waybill")
        order.save(update_fields=["waybill"])
    else:
        # Log or handle shipment failure
        pass

    # --- Clear user cart ---
    CartItem.objects.filter(cart__user=user).delete()
    tracking_url = None
    if shipment.get("success") and order.waybill:
        tracking_url = f"https://www.delhivery.com/track/package/{order.waybill}/"
    elif order.waybill:
        tracking_url = f"https://www.delhivery.com/track/package/{order.waybill}/"
   

    # --- Send confirmation (no tracking yet) ---
    send_multichannel_notification(
        user=user,
        order=order,
        event="order_placed",
        message=f"✅ Your order {order.order_number} has been placed successfully! We’ll notify you once it’s shipped.",
        channels=["email"],
        payload={
            "shipment_created": shipment.get("success"),
            "tracking_url": tracking_url,
        },
    )

    return {
        "message": "Payment verified and order placed successfully. Shipment created (tracking available after pickup).",
        "order_number": order.order_number,
        "status": order.status,
        "is_paid": order.is_paid,
        "shipment": shipment,
    }

def process_checkout(
    user,
    items=None,
    shipping_address_input=None,
    payment_method=None,
    promoter_code=None,        # optional fallback (e.g. from query or buy-now item)
    is_cart=False,
    existing_order=None,
    checkout_session_id=None,
):
    """
    Unified checkout handler (Buy Now / Cart).
    - Ensures per-item promoter (item.referral_code -> item['promoter'])
    - Accepts optional fallback promoter_code (used only when an item has no referral)
    - Reuses unpaid orders by session or identical items
    - Creates Razorpay order and returns prepared response
    """
    print("\n\n================= 🟦 CHECKOUT CLEAN START =================")
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    razorpay_order = None

    # ----------------------------
    # 0. EXISTING ORDER RETRY
    # ----------------------------
    if existing_order:
        order = existing_order
        if payment_method and order.payment_method != payment_method:
            validate_payment_method(payment_method)
            order.payment_method = payment_method
            order.save(update_fields=["payment_method"])

        if not order.is_paid:
            if not order.razorpay_order_id:
                razorpay_order = client.order.create({
                    "amount": int(order.total * 100),
                    "currency": "INR",
                    "receipt": f"order_rcptid_{order.order_number}",
                    "payment_capture": 1,
                })
                order.razorpay_order_id = razorpay_order["id"]
                order.save(update_fields=["razorpay_order_id"])
            else:
                razorpay_order = {
                    "id": order.razorpay_order_id,
                    "amount": int(order.total * 100),
                    "currency": "INR",
                }

        return {"order": order, "response": prepare_order_response(order, razorpay_order)}

    # ----------------------------
    # 1. VALIDATE INPUT
    # ----------------------------
    validate_payment_method(payment_method)
    shipping_address = validate_shipping_address(user, shipping_address_input)
    checkout_session_id = checkout_session_id or str(uuid.uuid4())

    # ----------------------------
    # 2. NORMALIZE ITEMS
    # ----------------------------
    # If is_cart=True then `items` is a queryset of CartItem — convert to dicts and carry referral_code
    if is_cart:
        normalized_items = []
        for ci in items:
            normalized_items.append({
                "product_variant_id": ci.product_variant.id,
                "product_variant": ci.product_variant,
                "quantity": int(ci.quantity),
                "referral_code": getattr(ci, "referral_code", None),
            })
        items = normalized_items
    else:
        # Ensure items is a list of dicts (Buy Now). Validate minimal shape here.
        if not isinstance(items, list):
            raise ValidationError("items must be a list for buy-now checkout.")
        # normalize type-safety: ensure product_variant_id and quantity exist
        for i in items:
            if "product_variant_id" not in i and "product_variant" not in i:
                raise ValidationError("Each item must contain product_variant_id or product_variant.")
            if "quantity" not in i:
                raise ValidationError("Each item must contain quantity.")

    # helper to create canonical (pv_id, qty) list for matching
    def _normalize_for_match(item_list):
        norm = []
        for it in item_list:
            pv = it.get("product_variant_id") or (it.get("product_variant").id if it.get("product_variant") is not None else None)
            qty = int(it.get("quantity"))
            norm.append((int(pv), int(qty)))
        return sorted(norm)

    normalized_new_items = _normalize_for_match(items)

    # ----------------------------
    # 3. MATCH UNPAID ORDER BY SESSION
    # ----------------------------
    existing_by_session = Order.objects.filter(
        user=user,
        is_paid=False,
        checkout_session_id=checkout_session_id,
    ).exclude(status__in=["Cancelled", "Delivered"]).first()

    if existing_by_session:
        order = existing_by_session
        if not order.razorpay_order_id:
            razorpay_order = client.order.create({
                "amount": int(order.total * 100),
                "currency": "INR",
                "receipt": f"order_rcptid_{order.order_number}",
                "payment_capture": 1,
            })
            order.razorpay_order_id = razorpay_order["id"]
            order.save(update_fields=["razorpay_order_id"])
        else:
            razorpay_order = {
                "id": order.razorpay_order_id,
                "amount": int(order.total * 100),
                "currency": "INR",
            }
        return {"order": order, "response": prepare_order_response(order, razorpay_order)}

    # ----------------------------
    # 4. FIND CANDIDATE ORDER WITH SAME ITEMS
    # ----------------------------
    candidate = (
        Order.objects.filter(user=user, is_paid=False, cancelled_at__isnull=True)
        .exclude(status__in=["Cancelled", "Delivered"])
        .order_by("-id")
        .first()
    )

    if candidate:
        with transaction.atomic():
            candidate = Order.objects.select_for_update().get(pk=candidate.pk)
            existing_items = list(candidate.items.exclude(
                status__in=[OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED]
            ).values_list("product_variant_id", "quantity"))
            normalized_candidate = sorted([(int(a), int(b)) for a, b in existing_items])

            if normalized_candidate == normalized_new_items:
                if candidate.checkout_session_id != checkout_session_id:
                    candidate.checkout_session_id = checkout_session_id
                    candidate.save(update_fields=["checkout_session_id"])

                order = candidate
                if not order.razorpay_order_id:
                    razorpay_order = client.order.create({
                        "amount": int(order.total * 100),
                        "currency": "INR",
                        "receipt": f"order_rcptid_{order.order_number}",
                        "payment_capture": 1,
                    })
                    order.razorpay_order_id = razorpay_order["id"]
                    order.save(update_fields=["razorpay_order_id"])
                else:
                    razorpay_order = {
                        "id": order.razorpay_order_id,
                        "amount": int(order.total * 100),
                        "currency": "INR",
                    }

                return {"order": order, "response": prepare_order_response(order, razorpay_order)}

    # ----------------------------
    # 5. PREPARE PER-ITEM PROMOTERS
    # ----------------------------
    # We'll validate/promoter each item here. We inject `promoter` into each item dict
    # so create_order_with_items() can simply use item['promoter'] as the single source of truth.
    for itm in items:
        ref = itm.get("referral_code")
        if ref:
            try:
                itm["promoter"] = validate_promoter(ref)
            except ValidationError:
                # invalid referral -> treat as no promoter
                itm["promoter"] = None
        else:
            # use the provided fallback promoter_code only if present (and item has no referral)
            if promoter_code:
                try:
                    itm["promoter"] = validate_promoter(promoter_code)
                except ValidationError:
                    itm["promoter"] = None
            else:
                itm["promoter"] = None

    # Debugging (optional)
    # print("Per-item promoters:", [ (it.get('product_variant_id') or getattr(it.get('product_variant'), 'id', None), bool(it.get('promoter'))) for it in items ])

    # ----------------------------
    # 6. CREATE NEW ORDER
    # ----------------------------
    with transaction.atomic():
        order, _, order_items_data = create_order_with_items(
            user=user,
            items=items,
            shipping_address=shipping_address,
            payment_method=payment_method,
            existing_order=None,
            fallback_promoter_code=promoter_code,  # harmless — create_order will only use it if item lacks promoter
        )
        order.checkout_session_id = checkout_session_id
        order.save(update_fields=["checkout_session_id"])

        # Compute delivery charge & recovery
        o_pin = getattr(shipping_address, "postal_code", None)
        d_pin = getattr(settings, "DELHIVERY_PICKUP", {}).get("pin")
        delivery_info = get_delivery_charge(o_pin, d_pin, weight_grams=order.weight_total)
        base_delivery_charge = Decimal(delivery_info.get("charge", 0))

        recovery_for_payment = Decimal("0.00")
        if hasattr(user, "recovery_account"):
            pending = user.recovery_account.balance_due
            if pending > 0:
                if pending >= Decimal("5.00"):
                    recovery_dynamic = (pending * Decimal("0.10")).quantize(Decimal("0.01"))
                    recovery_for_payment = min(max(recovery_dynamic, Decimal("5.00")), Decimal("10.00"), pending)
                else:
                    recovery_for_payment = pending

        delivery_charge_total = base_delivery_charge + recovery_for_payment
        order.delivery_charge = base_delivery_charge
        order.total = (order.subtotal + delivery_charge_total).quantize(Decimal("0.01"))
        order.save(update_fields=["delivery_charge", "total"])

        # Razorpay order creation
        try:
            razorpay_order = client.order.create({
                "amount": int((order.total * 100).quantize(Decimal("1"))),
                "currency": "INR",
                "receipt": f"order_rcptid_{order.order_number}",
                "payment_capture": 1,
                "notes": {"Recovery charge": str(recovery_for_payment)},
            })
            order.razorpay_order_id = razorpay_order.get("id")
            order.save(update_fields=["razorpay_order_id"])
        except Exception as e:
            raise ValidationError(f"Razorpay order creation failed: {str(e)}")

    return {"order": order, "response": prepare_order_response(order, razorpay_order)}
