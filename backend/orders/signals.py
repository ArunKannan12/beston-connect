from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Order, OrderItem, Notification

def send_multichannel_notification(user,
                                   order=None,
                                   order_item=None,
                                   event=None,
                                   message=None,
                                   channels=["email"],
                                   payload=None,
                                   template_name="emails/notification.html", 
                                   ):
    """
    Create notifications for multiple channels (email, SMS, WhatsApp, push, etc.)
    """
    payload = payload or {}

    with transaction.atomic():
        for channel in channels:
            notif, created = Notification.objects.get_or_create(
                user=user,
                order=order,
                order_item=order_item,
                event=event,
                channel=channel,
                defaults={
                    "message": message,
                    "payload": payload,
                },
            )

            if created:
                notif.send_notification(template_name=template_name)
            else:
                # Optional: Update payload/message if already exists
                notif.payload = payload
                notif.message = message
                notif.save(update_fields=["payload", "message"])
                notif.send_notification(template_name=template_name)

# -------------------------
# ORDER NOTIFICATIONS
# -------------------------

@receiver(post_save, sender=Order)
def handle_order_notifications(sender, instance, created, **kwargs):
    """
    Handles order notifications:
    - Order placed (after payment)
    - Processing (packing/ready)
    - Shipped (after courier pickup)
    - Delivered
    - Cancelled
    - Refunded
    """

    user = instance.user
    order_number = instance.order_number

    # ✅ ORDER PLACED
    if (
        instance.status == "pending"
        and instance.is_paid
        and not Notification.objects.filter(order=instance, event="order_placed").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_placed",
            message=(
                f"✅ Your order {order_number} has been placed successfully.\n"
                f"Total Amount: ₹{float(instance.total):.2f}"
            ),
            channels=["email"],
        )

    # ⚙️ ORDER PROCESSING
    elif (
        instance.status == "processing"
        and not Notification.objects.filter(order=instance, event="order_processing").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_processing",
            message=(
                f"🧑‍🏭 Your order {order_number} is now being processed and packed for shipment."
            ),
            channels=["email"],
        )

    # 🚚 ORDER SHIPPED (Triggered after Delhivery pickup → waybill scan)
    elif (
        instance.status == "shipped"
        and getattr(instance, "waybill", None)
        and not Notification.objects.filter(order=instance, event="order_shipped").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_shipped",
            message=(
                f"🚚 Your order {order_number} has been shipped via Delhivery.\n"
                f"Tracking ID: {instance.waybill}\n"
                f"Track here: https://www.delhivery.com/track/package/{instance.waybill}/"
            ),
            channels=["email"],
        )

    # ✅ ORDER DELIVERED
    elif (
        instance.status == "delivered"
        and not Notification.objects.filter(order=instance, event="order_delivered").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_delivered",
            message=f"✅ Your order {order_number} has been delivered successfully.",
            channels=["email"],
        )

    # ❌ ORDER CANCELLED
    elif (
        instance.status == "cancelled"
        and not Notification.objects.filter(order=instance, event="order_cancelled").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_cancelled",
            message=(
                f"❌ Your order {order_number} has been cancelled.\n"
                f"Reason: {instance.cancel_reason or 'No reason provided.'}"
            ),
            channels=["email"],
        )

    # 💰 REFUND INITIATED
    elif (
        instance.has_refund
        and not Notification.objects.filter(order=instance, event="order_refunded").exists()
    ):
        send_multichannel_notification(
            user=user,
            order=instance,
            event="order_refunded",
            message=(
                f"💰 A refund has been initiated for your order {order_number}.\n"
                f"Refund ID: {instance.refund_id or 'N/A'}\n"
                f"Amount: ₹{float(instance.total):.2f}\n\n"
                f"It will be credited to your original payment method within 5–7 business days."
            ),
            channels=["email"],
        )


# -------------------------
# ORDER ITEM STATUS UPDATES
# -------------------------
@receiver(post_save, sender=OrderItem)
def handle_order_item_notifications(sender, instance, created, **kwargs):
    """
    Sends notifications when an item is refunded, replaced, or progresses through fulfillment stages.
    """

    if created:
        return  # only handle updates

    # 💵 Item Refunded
    if instance.status == "refunded" and not Notification.objects.filter(order_item=instance, event="refunded").exists():
        send_multichannel_notification(
            user=instance.order.user,
            order=instance.order,
            order_item=instance,
            event="refunded",
            message=f"💵 Your item '{instance.product_variant}' has been refunded.",
            channels=["email"],
        )

    # 🔄 Item Replaced
    elif instance.status == "replaced" and not Notification.objects.filter(order_item=instance, event="replaced").exists():
        send_multichannel_notification(
            user=instance.order.user,
            order=instance.order,
            order_item=instance,
            event="replaced",
            message=f"🔄 Your item '{instance.product_variant}' has been replaced with a new one.",
            channels=["email"],
        )

    # 🚚 Picked / Packed / Shipped / Delivered
    elif instance.status in ["picked", "packed", "shipped", "delivered"]:
        event = f"item_{instance.status}"
        if not Notification.objects.filter(order_item=instance, event=event).exists():
            send_multichannel_notification(
                user=instance.order.user,
                order=instance.order,
                order_item=instance,
                event=event,
                message=f"📦 Your item '{instance.product_variant}' is now {instance.status}.",
                channels=["email"],
            )
