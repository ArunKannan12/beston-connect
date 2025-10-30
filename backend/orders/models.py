from rest_framework.exceptions import ValidationError
from django.utils import timezone 
from django.db import models
from django.contrib.auth import get_user_model
from products.models import ProductVariant
from decimal import Decimal
from django.core.validators import RegexValidator
from promoter.models import Promoter
import random
from .notificationModel import *

User = get_user_model()

# ---------------- Validators ----------------
phone_regex = RegexValidator(regex=r'^[6-9]\d{9}$', message="Enter a valid 10-digit phone number")
pin_regex = RegexValidator(regex=r'^\d{6}$', message="Enter a valid 6-digit postal code")
name_regex = RegexValidator(regex=r'^[A-Za-z\s\-]+$', message="This field can only contain letters, spaces, and hyphens.")

# ---------------- Shipping Address ----------------
class ShippingAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=15, validators=[phone_regex])
    address = models.TextField()
    locality = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=50, validators=[name_regex])
    state = models.CharField(max_length=50, blank=True, null=True, validators=[name_regex])
    postal_code = models.CharField(max_length=6, validators=[pin_regex])
    district = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=50, default="India")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.locality}, {self.city}, {self.state})"

# ---------------- Order Status ----------------
class OrderStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'


# ---------------- Payment Method ----------------
class PaymentMethod(models.TextChoices):
    RAZORPAY = 'Razorpay', 'Razorpay'  # Only prepaid


# ---------------- Order Number Generator ----------------
def generate_order_number():
    while True:
        number = f"ORD-{random.randint(10**11, 10**12 - 1)}"
        if not Order.objects.filter(order_number=number).exists():
            return number


# ---------------- Order ----------------
class Order(models.Model):
    # --- Basic Info ---
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    shipping_address = models.ForeignKey(ShippingAddress, on_delete=models.CASCADE)

    # --- Status & Payment ---
    status = models.CharField(max_length=30, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    payment_method = models.CharField(max_length=50, choices=PaymentMethod.choices, default=PaymentMethod.RAZORPAY)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)

    # --- Pricing ---
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total_commission = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    promoter = models.ForeignKey("promoter.Promoter", on_delete=models.SET_NULL, null=True, blank=True)

    # --- Cancellation ---
    cancel_reason = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_orders")
    cancelled_by_role = models.CharField(max_length=50, null=True, blank=True)
    is_restocked = models.BooleanField(default=False)

    # --- Refund summary ---
    has_refund = models.BooleanField(default=False)  # ✅ New summary flag (auto updated via signal)

    # --- Meta ---
    order_number = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number} ({self.user.email} — {self.status})"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    @property
    def is_fully_cancelled(self):
        return self.items.exclude(status="cancelled").count() == 0

    @property
    def is_partially_cancelled(self):
        total_items = self.items.count()
        cancelled_items = self.items.filter(status="cancelled").count()
        return 0 < cancelled_items < total_items


# ---------------- Order Item ----------------
class OrderItemStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'  # ✅ add this
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'
    REFUNDED = 'refunded', 'Refunded'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product_variant = models.ForeignKey("products.ProductVariant", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=OrderItemStatus.choices, default=OrderItemStatus.PENDING)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # --- Promoter Commission ---
    promoter = models.ForeignKey("promoter.Promoter", on_delete=models.SET_NULL, null=True, blank=True)
    promoter_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    promoter_commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # --- Cancellation & Refunds ---
    cancel_reason = models.TextField(blank=True, null=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # --- Courier / Shipping ---
    courier = models.CharField(max_length=50, blank=True, null=True)
    waybill = models.CharField(max_length=50, blank=True, null=True)
    tracking_url = models.URLField(blank=True, null=True)
    handoff_timestamp = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.quantity} × {self.product_variant} (Order #{self.order.order_number})"

    @property
    def is_cancelled(self):
        return self.status == OrderItemStatus.CANCELLED

    @property
    def is_active(self):
        return self.status not in [OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED]

    @property
    def delhivery_tracking_url(self):
        if self.waybill:
            return f"https://www.delhivery.com/tracking?waybill={self.waybill}"
        return None


# ---------------- Refund ----------------
class Refund(models.Model):
    order = models.ForeignKey(Order, related_name="refunds", on_delete=models.CASCADE)
    refund_id = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.refund_id or 'Pending'} - ₹{self.amount}"


class ReturnRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('refunded', 'Refunded'),
    ]

    REFUND_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('upi', 'UPI'),
        ('wallet', 'Wallet'),
        ('manual', 'Manual'),
    ]

    # Links
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, null=True, blank=True, related_name='return_requests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='return_requests')

    # Request details
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Refund
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refund_method = models.CharField(max_length=20, choices=REFUND_METHOD_CHOICES, default='razorpay')
    user_upi = models.CharField(max_length=100, blank=True, default='')

    # Admin decision
    admin_decision = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_comment = models.TextField(blank=True, null=True)
    admin_processed_at = models.DateTimeField(null=True, blank=True)

    # Variant policy snapshot (optional)
    variant_policy_snapshot = models.JSONField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order_item'],
                condition=~models.Q(status='refunded'),
                name='unique_active_return_per_item'
            )
        ]

    def mark_refunded(self, amount=None):
        if amount:
            self.refund_amount = amount
        self.status = 'refunded'
        self.refunded_at = timezone.now()
        self.save(update_fields=['status', 'refunded_at', 'refund_amount'])

    def clean(self):
        if self.order_item:
            exists = ReturnRequest.objects.filter(
                order_item=self.order_item
            ).exclude(pk=self.pk).exclude(status='refunded').exists()
            if exists:
                raise ValidationError("A return is already in progress for this item.")

        active_replacement = ReplacementRequest.objects.filter(
            order_item=self.order_item
        ).exclude(status__in=["delivered", "failed", "rejected"]).exists()
        if active_replacement:
            raise ValidationError("A replacement request already exists for this item.")

        if self.refund_amount and self.refund_amount > self.order_item.total_price():
            raise ValidationError({"refund_amount": "Cannot exceed item total."})

        if self.refund_method in ['upi', 'manual', 'wallet']:
            if self.order.payment_method == 'Cash on Delivery' and not self.user_upi:
                raise ValidationError({"user_upi": "UPI ID is required for COD/manual refunds."})
        else:
            self.user_upi = ""

        super().clean()

    def __str__(self):
        return f"Return for Item #{self.order_item.id} in Order #{self.order.order_number}" if self.order_item else f"Return for Order #{self.order.order_number}"
    
class ReplacementRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    # Links
    new_order = models.OneToOneField(Order, on_delete=models.CASCADE, null=True, blank=True, related_name='replacement_origin')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="replacement_requests")
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, null=True, blank=True, related_name="replacement_requests")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="replacement_requests")

    # Request details
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Admin decision
    admin_decision = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_comment = models.TextField(blank=True, null=True)

    # Variant policy snapshot (optional)
    variant_policy_snapshot = models.JSONField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order_item"],
                condition=~models.Q(status__in=["delivered", "failed", "rejected"]),
                name="unique_active_replacement_per_item",
            )
        ]

    def mark_shipped(self):
        self.status = "shipped"
        self.shipped_at = timezone.now()
        self.save(update_fields=["status", "shipped_at"])

    def mark_delivered(self):
        self.status = "delivered"
        self.delivered_at = timezone.now()
        self.save(update_fields=["status", "delivered_at"])

    def clean(self):
        if self.order_item:
            exists = ReplacementRequest.objects.filter(
                order_item=self.order_item
            ).exclude(pk=self.pk).exclude(status__in=["delivered", "failed", "rejected"]).exists()
            if exists:
                raise ValidationError("A replacement is already in progress for this item.")

        active_return = ReturnRequest.objects.filter(
            order_item=self.order_item
        ).exclude(status="refunded").exists()
        if active_return:
            raise ValidationError("A return request already exists for this item.")

        super().clean()

    def __str__(self):
        return f"Replacement for Item #{self.order_item.id} in Order #{self.order.order_number}" if self.order_item else f"Replacement for Order #{self.order.order_number}"