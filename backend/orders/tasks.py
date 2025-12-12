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
    """
    Triggered by cron-job.org.
    Applies promoter commission for orders that:
      - Are paid
      - Have not yet had commission applied
      - Have delivered items whose return window is closed
    """

    logger.warning("[CRON] Commission cron triggered")

    # 1️⃣ Security check using header
    secret = request.headers.get("X-CRON-KEY")
    if secret != settings.CRON_SECRET_KEY:
        logger.warning("[CRON] Unauthorized request – invalid X-CRON-KEY")
        return JsonResponse({"error": "Unauthorized"}, status=403)

    # 2️⃣ Get orders waiting for commission
    orders = Order.objects.filter(is_paid=True, is_commission_applied=False)
    logger.warning(f"[CRON] Found {orders.count()} orders pending commission")

    applied_count = 0

    for order in orders:
        logger.warning(f"[ORDER] Checking Order {order.id}")
        logger.warning(f"[ORDER] delivered_at={order.delivered_at}, is_paid={order.is_paid}")

        eligible_items = order.items.filter(status=OrderItemStatus.DELIVERED)
        logger.warning(f"[ORDER] Delivered items: {[i.id for i in eligible_items]}")

        commission_due = False

        for item in eligible_items:
            pv = item.product_variant
            logger.warning(
                f"[ITEM] Item {item.id}: allow_return={pv.allow_return}, "
                f"return_days={pv.return_days}"
            )

            # Non-returnable → immediate commission
            if not pv.allow_return:
                logger.warning(f"[ITEM] Item {item.id} is non-returnable → commission eligible")
                commission_due = True
                break

            # Returnable → check return window
            delivered_date = order.delivered_at.date() if order.delivered_at else None
            logger.warning(f"[ITEM] delivered_date={delivered_date}")

            if not delivered_date:
                logger.warning(f"[SKIP] Item {item.id}: delivered_at missing")
                continue

            return_days = pv.return_days or 0
            return_end_date = delivered_date + timedelta(days=return_days)
            logger.warning(
                f"[ITEM] return_end_date={return_end_date}, today={date.today()}"
            )

            if date.today() >= return_end_date:
                logger.warning(f"[ITEM] Item {item.id} return window closed → commission eligible")
                commission_due = True
                break
            else:
                logger.warning(f"[ITEM] Item {item.id} return window still open")

        if commission_due:
            logger.warning(f"[APPLY] Applying commission for Order {order.id}")
            apply_promoter_commission(order)

            order.is_commission_applied = True
            order.save(update_fields=["is_commission_applied"])

            applied_count += 1
            logger.warning(f"[APPLY] Commission applied for Order {order.id}")
        else:
            logger.warning(f"[SKIP] Order {order.id} not eligible for commission")

    logger.warning(f"[CRON] Completed. Commission applied for {applied_count} orders.")

    return JsonResponse({
        "status": "success",
        "message": f"Commission applied for {applied_count} orders."
    })
