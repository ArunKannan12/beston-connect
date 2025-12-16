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
import uuid
from datetime import timedelta


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
    IN_TRANSIT = 'in_transit', 'In Transit'
    OUT_FOR_DELIVERY = 'out_for_delivery', 'Out for Delivery'
    DELIVERED = 'delivered', 'Delivered'
    RETURN_INITIATED = 'return_initiated', 'Return Initiated'
    DELIVERED_TO_WAREHOUSE = 'delivered_to_warehouse', 'Delivered to Warehouse'
    CANCELLED = 'cancelled', 'Cancelled'
    UNDELIVERED = 'undelivered', 'Undelivered'



# ---------------- Payment Method ----------------
class PaymentMethod(models.TextChoices):
    RAZORPAY = 'Razorpay', 'Razorpay'  # Only prepaid


# ---------------- Order Number Generator ----------------
def generate_order_number():
    while True:
        number = f"ORD-{random.randint(10**11, 10**12 - 1)}"
        if not Order.objects.filter(order_number=number).exists():
            return number

from admin_dashboard.warehouse import DelhiveryPickupRequest
# ---------------- Order ----------------
class Order(models.Model):
    # --- Basic Info ---
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    shipping_address = models.ForeignKey(ShippingAddress, on_delete=models.CASCADE)

    # --- Status & Payment ---
    status = models.CharField(max_length=50, choices=OrderStatus.choices, default=OrderStatus.PENDING)
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
    is_commission_applied=models.BooleanField(default=False)
    # --- Cancellation ---
    cancel_reason = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_orders")
    cancelled_by_role = models.CharField(max_length=50, null=True, blank=True)
    is_restocked = models.BooleanField(default=False)

    # --- Refund summary ---
    has_refund = models.BooleanField(default=False)  # auto-updated via signal

    # --- Shipping / Courier ---
    courier = models.CharField(max_length=50, blank=True, null=True)
    waybill = models.CharField(max_length=50, blank=True, null=True)
    tracking_url = models.URLField(blank=True, null=True)
    label_url = models.URLField(max_length=500, null=True, blank=True)
    label_generated_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    handoff_timestamp = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    pickup_request = models.ForeignKey(
        DelhiveryPickupRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    packed_at = models.DateTimeField(null=True, blank=True)
    # --- Meta ---
    order_number = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    checkout_session_id=models.CharField(max_length=100,null=True,blank=True,db_index=True,help_text="Unique identifier to link retries or failed payment sessions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number} ({self.user.email} — {self.status})"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    @property
    def weight_total(self):
        """
        Returns total weight of the order in grams.
        Uses product_variant.get_weight_in_grams() for each item and multiplies by quantity.
        """
        total_grams = 0
        for item in self.items.all():
            variant_weight_grams = item.product_variant.get_weight_in_grams()
            total_grams += variant_weight_grams * item.quantity
        return total_grams or 200  # default to 200g if nothing is found

    @property
    def is_fully_cancelled(self):
        return self.items.exclude(status="cancelled").count() == 0

    @property
    def is_partially_cancelled(self):
        total_items = self.items.count()
        cancelled_items = self.items.filter(status="cancelled").count()
        return 0 < cancelled_items < total_items

    @property
    def delhivery_tracking_url(self):
        if self.waybill:
            return f"https://www.delhivery.com/tracking?waybill={self.waybill}"
        return None


# ---------------- Order Item ----------------
class OrderItemStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    IN_TRANSIT = 'in_transit', 'In Transit'
    OUT_FOR_DELIVERY = 'out_for_delivery', 'Out for Delivery'
    DELIVERED = 'delivered', 'Delivered'
    RETURN_INITIATED = 'return_initiated', 'Return Initiated'
    DELIVERED_TO_WAREHOUSE = 'delivered_to_warehouse', 'Delivered to Warehouse'
    CANCELLED = 'cancelled', 'Cancelled'
    UNDELIVERED = 'undelivered', 'Undelivered'
    REFUNDED = 'refunded', 'Refunded'



class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product_variant = models.ForeignKey("products.ProductVariant", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=50, choices=OrderItemStatus.choices, default=OrderItemStatus.PENDING)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # --- Promoter Commission ---
    promoter = models.ForeignKey("promoter.Promoter", on_delete=models.SET_NULL, null=True, blank=True)
    promoter_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    promoter_commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    referral_code = models.CharField(max_length=50, null=True, blank=True)

    # --- Cancellation & Refunds ---
    cancel_reason = models.TextField(blank=True, null=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.quantity} × {self.product_variant} (Order #{self.order.order_number})"

    @property
    def is_cancelled(self):
        return self.status == OrderItemStatus.CANCELLED

    def total_price(self):
        return self.price * self.quantity

    @property
    def is_active(self):
        return self.status not in [OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED]


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
        ('pickup_scheduled', 'Pickup Scheduled'),
        ('in_transit', 'In Transit'),
        ('delivered_to_warehouse', 'Delivered to Warehouse'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]

    # Links
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name='return_requests')
    order_item = models.ForeignKey("orders.OrderItem", on_delete=models.CASCADE, null=True, blank=True, related_name='return_requests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='return_requests')

    # Return details
    reason = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')

    # Refund info
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    reverse_pickup_charge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    recovery_fixed = models.BooleanField(default=False)

    # Delhivery tracking
    waybill = models.CharField(max_length=50, blank=True, null=True)
    pickup_date = models.DateTimeField(null=True, blank=True)
    delivered_back_date = models.DateTimeField(null=True, blank=True)

    # Admin notes
    admin_comment = models.TextField(blank=True, null=True)
    admin_processed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order_item'],
                condition=~models.Q(status='refunded'),
                name='unique_active_return_per_item'
            )
        ]
        ordering = ['-created_at']

    def clean(self):
        if self.order_item:
            exists = ReturnRequest.objects.filter(
                order_item=self.order_item
            ).exclude(pk=self.pk).exclude(status='refunded').exists()
            if exists:
                raise ValidationError("A return is already in progress for this item.")

        if self.refund_amount and self.order_item and self.refund_amount > self.order_item.total_price():
            raise ValidationError({"refund_amount": "Cannot exceed item total."})

        super().clean()

    def mark_refunded(self, amount=None, reverse_charge=None):
        from .models import ReturnRecoveryAccount, ReturnRecoveryTransaction

        if amount is not None:
            self.refund_amount = amount

        # If reverse_charge not provided → use existing saved charge → fallback
        if reverse_charge is None:
            reverse_charge = (
                self.reverse_pickup_charge or
                self.refund_amount or
                Decimal("0.00")
            )

        # Save charge in model
        self.reverse_pickup_charge = reverse_charge
        self.recovery_fixed = True  # ⭐ IMPORTANT: prevent future double recovery

        self.status = 'refunded'
        self.refunded_at = timezone.now()
        self.admin_comment = (
            f"Refunded ₹{self.refund_amount}. "
            f"Pending recovery ₹{reverse_charge} saved."
        )
        self.save(update_fields=[
            'status',
            'refunded_at',
            'refund_amount',
            'reverse_pickup_charge',
            'recovery_fixed',
            'admin_comment'
        ])

        # ⭐ DO NOT ADD DUPLICATE RECOVERY ENTRY
        account, _ = ReturnRecoveryAccount.objects.get_or_create(user=self.user)

        already_added = ReturnRecoveryTransaction.objects.filter(
            account=account,
            source=f"ReturnRequest #{self.id}",
            transaction_type="debit"
        ).exists()

        if not already_added and reverse_charge > 0:
            account.add_recovery(reverse_charge, source=f"ReturnRequest #{self.id}")


    @classmethod
    def should_block_user(cls, user, threshold=3, window_days=90):
        recent_returns = cls.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(days=window_days)
        ).count()
        return recent_returns > threshold

    @classmethod
    def is_user_blocked(cls, user):
        # Optional: integrate with a separate user-block table instead of ReturnRequest
        return cls.objects.filter(user=user, status='refunded', created_at__gte=timezone.now() - timedelta(days=30)).count() > 3

    def __str__(self):
        return f"Return for Item #{self.order_item.id} in Order #{self.order.order_number}" if self.order_item else f"Return for Order #{self.order.order_number}"

class ReturnRecoveryAccount(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="recovery_account")
    total_recovery = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - Pending ₹{self.balance_due}"

    # Add a new recovery (debit) when a return is refunded
    def add_recovery(self, amount, source):
        amount = Decimal(amount)
        if amount <= 0:
            return
        self.total_recovery += amount
        self.balance_due += amount
        self.save(update_fields=["total_recovery", "balance_due", "last_updated"])
        ReturnRecoveryTransaction.objects.create(
            account=self,
            transaction_type="debit",
            amount=amount,
            source=source,
            description=f"Return charge added from {source}"
        )

    # Apply recovery payment (credit) from checkout or manual adjustment
    def apply_payment(self, amount, source="Checkout Adjustment"):
        amount = Decimal(amount)
        applied = min(self.balance_due, amount)
        if applied <= 0:
            return Decimal("0.00")
        self.total_paid += applied
        self.balance_due -= applied
        self.save(update_fields=["total_paid", "balance_due", "last_updated"])
        ReturnRecoveryTransaction.objects.create(
            account=self,
            transaction_type="credit",
            amount=applied,
            source=source,
            description=f"Recovered ₹{applied} from {source}"
        )
        return applied


class ReturnRecoveryTransaction(models.Model):
    TRANSACTION_CHOICES = [
        ('debit', 'Debit (Recovery Added)'),
        ('credit', 'Credit (Recovered)')
    ]

    account = models.ForeignKey(ReturnRecoveryAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.account.user.get_full_name()} - {self.transaction_type.upper()} ₹{self.amount} ({self.source})"

    
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
    

