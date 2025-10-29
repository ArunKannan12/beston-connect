from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

User = get_user_model()

NOTIFICATION_TITLES = {
    "order_placed": "Order Placed ✅",
    "order_shipped": "Order Shipped 🚚",
    "delivered": "Delivered ✅",
    "cancelled": "Order Cancelled ❌",
    "return_requested": "Return Requested 🔄",
    "replacement_requested": "Replacement Requested 🔁",
}

class Notification(models.Model):
    CHANNEL_CHOICES = [
        ("email", "Email"),
    ]

    EVENT_CHOICES = [
        ("order_placed", "Order Placed"),
        ("order_shipped", "Order Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("return_requested", "Return Requested"),
        ("replacement_requested", "Replacement Requested"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    order_item = models.ForeignKey('orders.OrderItem', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')

    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="email")
    event = models.CharField(max_length=50, choices=EVENT_CHOICES)

    message = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    retries = models.PositiveIntegerField(default=0)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["channel", "event"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.event} - {self.channel} - {self.status}"

    # -----------------------
    # State helpers
    # -----------------------
    def mark_sent(self):
        self.status = "sent"
        self.sent_at = timezone.now()
        self.save(update_fields=["status", "sent_at", "updated_at"])

    def mark_failed(self):
        self.status = "failed"
        self.retries += 1
        self.save(update_fields=["status", "retries", "updated_at"])

    @property
    def is_due(self):
        return (self.scheduled_at is None or self.scheduled_at <= timezone.now()) and self.status == "pending"

    # -----------------------
    # Sending email
    # -----------------------
    def send_notification(self):
        try:
            self._send_email()
            self.mark_sent()
        except Exception as e:
            self.mark_failed()
            print(f"Failed to send notification {self.id}: {e}")

    def _send_email(self):
        subject = NOTIFICATION_TITLES.get(self.event, "Notification")
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [self.user.email]

        html_content = render_to_string("emails/notification.html", {"notification": self})
        text_content = self.message

        email = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
