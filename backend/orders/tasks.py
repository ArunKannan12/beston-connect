import time
import logging
from rest_framework import status
from django.conf import settings
from django.db import transaction
from orders.models import Order, OrderItem,OrderItemStatus
from orders.utils import track_delhivery_shipment
from promoter.utils import apply_promoter_commission
from django.http import JsonResponse
from datetime import date, timedelta
logger = logging.getLogger(__name__)

def auto_update_tracking():
    """
    Periodically checks Delhivery tracking info and auto-updates
    order + all related order items statuses.
    Runs every 3 hours.
    """
    while True:
        try:
            logger.info("🔁 Checking Delhivery shipment statuses (per order)...")

            # Get orders that are still active and have a waybill
            active_orders = Order.objects.filter(
                status__in=["processing", "shipped"],
                waybill__isnull=False
            ).prefetch_related("items")

            for order in active_orders:
                tracking_info = track_delhivery_shipment(waybill=order.waybill)
                if not tracking_info.get("success"):
                    continue

                summary = tracking_info.get("summary", {})
                new_status_text = (summary.get("status") or "").lower()

                # 🧭 Map Delhivery → internal system status
                status_map = {
                    "pickup pending": "processing",
                    "manifested": "processing",
                    "in transit": "shipped",
                    "out for delivery": "shipped",
                    "delivered": "delivered",
                    "rto delivered": "cancelled",
                    "undelivered": "cancelled",
                    "cancelled": "cancelled",
                }

                mapped_status = status_map.get(new_status_text)
                if not mapped_status or mapped_status == order.status:
                    continue  # no change

                old_status = order.status
                with transaction.atomic():
                    # Update all items under this order
                    order.items.update(status=mapped_status)

                    # Update order status
                    order.status = mapped_status
                    order.save(update_fields=["status"])

                    logger.info(
                        f"✅ Order {order.order_number} {old_status} → {mapped_status}"
                    )

                # Delay slightly between tracking calls (avoid rate-limit)
                time.sleep(1)

            logger.info("✅ Shipment status update cycle completed.")

        except Exception as e:
            logger.exception(f"❌ Error in auto tracking loop: {str(e)}")

        # Run every 3 hours
        time.sleep(3 * 60 * 60)


def apply_commission_cron(request):
    logger.warning("[CRON] Commission cron triggered")

    # 1️⃣ Security check
    secret = request.headers.get("X-CRON-KEY")
    if secret != settings.CRON_SECRET_KEY:
        logger.warning("[CRON] Unauthorized request")
        return JsonResponse({"error": "Unauthorized"}, status=403)

    # 2️⃣ Fetch eligible ORDER ITEMS
    items = OrderItem.objects.select_related(
        "order", "product_variant", "promoter"
    ).filter(
        order__is_paid=True,
        promoter__isnull=False,
        is_commission_applied=False,
        status=OrderItemStatus.DELIVERED
    )

    logger.warning(f"[CRON] Found {items.count()} items pending commission")

    applied_count = 0

    for item in items:
        order = item.order
        pv = item.product_variant
        promoter = item.promoter

        logger.warning(f"[ITEM] Checking item {item.id} (Order {order.id})")

        # 3️⃣ Check return eligibility
        commission_due = False

        if not pv.allow_return:
            commission_due = True
        else:
            if not order.delivered_at:
                continue

            delivered_date = order.delivered_at.date()
            return_days = pv.return_days or 0
            return_end_date = delivered_date + timedelta(days=return_days)

            if date.today() >= return_end_date:
                commission_due = True

        if not commission_due:
            logger.warning(f"[SKIP] Item {item.id} return window still open")
            continue

        # 4️⃣ Check subscription at ORDER TIME
        if promoter.has_active_subscription_at(order.created_at):
            status = "credited"
        else:
            status = "pending"

        # 5️⃣ Apply commission (ITEM LEVEL)
        apply_promoter_commission(item, status=status)

        item.is_commission_applied = True
        item.save(update_fields=["is_commission_applied"])

        applied_count += 1
        logger.warning(f"[APPLY] Commission applied for item {item.id}")

    logger.warning(f"[CRON] Completed. Commission applied for {applied_count} items")

    return JsonResponse({
        "status": "success",
        "applied_items": applied_count
    })
