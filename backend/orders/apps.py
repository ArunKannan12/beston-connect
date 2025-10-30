from django.apps import AppConfig
import threading
import logging

logger = logging.getLogger(__name__)


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'

    def ready(self):
        import orders.signals

        try:
            # Prevent multiple threads if Django reloads (e.g., in dev or multiple workers)
            if not any(t.name == "auto_tracking_thread" for t in threading.enumerate()):
                from orders.tasks import auto_update_tracking

                thread = threading.Thread(
                    target=auto_update_tracking,
                    name="auto_tracking_thread",
                    daemon=True,
                )
                thread.start()
                logger.info("🚀 Started Delhivery auto-tracking thread.")
            else:
                logger.info("⚙️ Auto-tracking thread already running, skipping duplicate start.")

        except Exception as e:
            logger.exception(f"❌ Failed to start auto-tracking thread: {e}")
