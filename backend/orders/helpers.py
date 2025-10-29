from decimal import Decimal
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from .models import ShippingAddress
from products.models import ProductVariant
from promoter.models import Promoter
from promoter.utils import apply_promoter_commission
from cart.models import CartItem
from .utils import  create_order_with_items,create_delhivery_shipment
from django.conf import settings
import razorpay
from django.utils import timezone
from .signals import send_multichannel_notification

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

    # --- Apply promoter commission if applicable ---
    if order.promoter_id:
        apply_promoter_commission(order)

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

    # --- Send confirmation (no tracking yet) ---
    send_multichannel_notification(
        user=user,
        order=order,
        event="order_placed",
        message=f"✅ Your order {order.order_number} has been placed successfully! We’ll notify you once it’s shipped.",
        channels=["email"],
        payload={
            "shipment_created": shipment.get("success"),
        },
    )

    return {
        "message": "Payment verified and order placed successfully. Shipment created (tracking available after pickup).",
        "order_number": order.order_number,
        "status": order.status,
        "is_paid": order.is_paid,
        "shipment": shipment,
    }


import razorpay
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.core.exceptions import ValidationError

def process_checkout(
    user,
    items=None,
    shipping_address_input=None,
    payment_method=None,
    promoter_code=None,
    is_cart=False,
    existing_order=None
):
    """
    Unified checkout handler for:
    - Referral checkout
    - Cart checkout
    - Buy Now
    - Existing order payment (existing_order)

    Returns:
        dict: {
            'order': Order instance,
            'response': serialized dict for API
        }
    """

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    razorpay_order = None

    # ------------------------------------------------------------
    # 🧾 Existing Order Payment Flow
    # ------------------------------------------------------------
    if existing_order:
        order = existing_order

        # Update payment method if changed
        if payment_method and order.payment_method != payment_method:
            validate_payment_method(payment_method)
            order.payment_method = payment_method
            order.save(update_fields=["payment_method"])

        # Generate Razorpay order only if unpaid
        if not order.is_paid:
            if not order.razorpay_order_id:
                razorpay_order = client.order.create({
                    "amount": int(order.total * 100),
                    "currency": "INR",
                    "receipt": f"order_rcptid_{order.order_number}",
                    "payment_capture": 1
                })
                order.razorpay_order_id = razorpay_order["id"]
                order.save(update_fields=["razorpay_order_id"])
            else:
                razorpay_order = {
                    "id": order.razorpay_order_id,
                    "amount": int(order.total * 100),
                    "currency": "INR"
                }

        response_data = prepare_order_response(order, razorpay_order)
        return {"order": order, "response": response_data}

    # ------------------------------------------------------------
    # 🛒 New Order Creation Flow
    # ------------------------------------------------------------
    validate_payment_method(payment_method)
    shipping_address = validate_shipping_address(user, shipping_address_input)
    promoter = validate_promoter(promoter_code) if promoter_code else None

    with transaction.atomic():  # Prevent partial order creation
        order, _, order_items_data = create_order_with_items(
            user=user,
            items=items,
            shipping_address=shipping_address,
            payment_method=payment_method,
            promoter=promoter
        )

        # Ensure total is valid before sending to Razorpay
        order_total = Decimal(order.total).quantize(Decimal("0.01"))
        if order_total <= 0:
            raise ValidationError("Invalid order total amount.")

        # Create Razorpay order
        try:
            razorpay_order = client.order.create({
                "amount": int(order_total * 100),  # Convert to paise
                "currency": "INR",
                "receipt": f"order_rcptid_{order.order_number}",
                "payment_capture": 1
            })
            order.razorpay_order_id = razorpay_order["id"]
            order.save(update_fields=["razorpay_order_id", "payment_method"])
        except Exception as e:
            raise ValidationError(f"Razorpay order creation failed: {str(e)}")

    response_data = prepare_order_response(order, razorpay_order)
    return {"order": order, "response": response_data}

