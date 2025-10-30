import time
import logging
from django.db import transaction
from orders.models import Order, OrderItem
from orders.utils import track_delhivery_shipment

logger = logging.getLogger(__name__)

def auto_update_tracking():
    """
    Periodically checks Delhivery tracking info and auto-updates
    order item statuses + parent order status.
    """
    while True:
        try:
            logger.info("🔁 Checking Delhivery shipment statuses (per item)...")

            # Get only active order items
            active_items = OrderItem.objects.filter(
                status__in=["processing", "shipped"], waybill__isnull=False
            ).select_related("order")

            for item in active_items:
                tracking_info = track_delhivery_shipment(waybill=item.waybill)
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
                if not mapped_status or mapped_status == item.status:
                    continue  # no meaningful change

                old_status = item.status
                with transaction.atomic():
                    item.status = mapped_status
                    item.save(update_fields=["status"])
                    logger.info(
                        f"✅ Item {item.id} ({item.product_variant}) "
                        f"{old_status} → {mapped_status}"
                    )

                    # 🧩 Update parent order status accordingly
                    order = item.order
                    all_statuses = list(order.items.values_list("status", flat=True))

                    if all(s == "delivered" for s in all_statuses):
                        order.status = "delivered"
                    elif any(s == "shipped" for s in all_statuses):
                        order.status = "shipped"
                    elif all(s == "cancelled" for s in all_statuses):
                        order.status = "cancelled"
                    elif any(s == "processing" for s in all_statuses):
                        order.status = "processing"
                    else:
                        order.status = order.status  # no change

                    order.save(update_fields=["status"])

                # Delay slightly between tracking calls (avoid rate-limit)
                time.sleep(1)

            logger.info("✅ Shipment status update cycle completed.")

        except Exception as e:
            logger.exception(f"❌ Error in auto tracking loop: {str(e)}")

        # Run every 3 hours
        time.sleep(3 * 60 * 60)
