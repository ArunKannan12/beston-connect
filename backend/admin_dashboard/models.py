from django.db import models
from orders.models import OrderItem, Order
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator
from django.utils import timezone

User = get_user_model()

class AdminLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('processing', 'Processing'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name='admin_logs',
        null=True,         # ✅ allow null
        blank=True         # ✅ allow blank
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='admin_order_logs'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='admin_action_logs'
    )
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['order_item']),
            models.Index(fields=['order']),
            models.Index(fields=['updated_by']),
        ]

    def __str__(self):
        return f"{self.order_item or self.order} - {self.action} by {self.updated_by} at {self.timestamp}"


class ContactMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField(validators=[MinLengthValidator(10)])
    is_resolved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responses"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contact Message"
        verbose_name_plural = "Contact Messages"

    def __str__(self):
        return f"{self.subject} - {self.email}"

    def mark_resolved(self, responder=None):
        self.is_resolved = True
        self.responded_at = timezone.now()
        if responder:
            self.responded_by = responder
        self.save()
