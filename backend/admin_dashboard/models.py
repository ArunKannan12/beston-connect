from django.db import models
from orders.models import OrderItem, Order
from django.contrib.auth import get_user_model

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
        related_name='admin_logs'
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
        return f"{self.order_item} - {self.action} by {self.updated_by} at {self.timestamp}"