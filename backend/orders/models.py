from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db import models,transaction
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

    # ---------- Replacement / REPL ----------
    REPL_SCHEDULED = 'repl_scheduled', 'Replacement Scheduled'
    REPL_IN_TRANSIT = 'repl_in_transit', 'Replacement In Transit'
    REPL_COMPLETED = 'repl_completed', 'Replacement Completed'


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

    # ---------- Replacement / REPL ----------
    REPL_SCHEDULED = 'repl_scheduled', 'Replacement Scheduled'
    REPL_IN_TRANSIT = 'repl_in_transit', 'Replacement In Transit'
    REPL_COMPLETED = 'repl_completed', 'Replacement Completed'



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
    is_commission_applied=models.BooleanField(default=False)

    # --- Cancellation & Refunds ---
    cancel_reason = models.TextField(blank=True, null=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packed_at = models.DateTimeField(null=True, blank=True)
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



RETURN_STATUS_MAP = {
    ("RT", "in transit"): "pu_in_transit",
    ("RT", "pending"): "pu_pending",
    ("RT", "dispatched"): "pu_dispatched",
    ("DL", "rto"): "dto",
}

class ReturnRequest(models.Model):

    STATUS_CHOICES = [
        # Reverse pickup
        ("pending", "Pending Approval"),
        ("pp_open", "Pickup Open"),
        ("pp_scheduled", "Pickup Scheduled"),
        ("pp_dispatched", "Pickup Dispatched"),
        ("pu_in_transit", "Pickup In Transit"),
        ("pu_pending", "Pickup Pending"),
        ("pu_dispatched", "Pickup Dispatched"),
        ("dto", "Delivered to Origin"),

        # Terminal
        ("refunded", "Refunded"),
        ("canceled", "Canceled"),
        ("closed", "Closed"),
        ("rejected", "Rejected"),        # ✅ Add
        ("pickup_failed", "Pickup Failed"),  # ✅ Add
    ]

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="return_requests"
    )
    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="return_requests"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="return_requests"
    )

    reason = models.TextField()
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default="pp_open"

    )

    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    refunded_at = models.DateTimeField(null=True, blank=True)

    reverse_pickup_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    recovery_fixed = models.BooleanField(default=False)

    waybill = models.CharField(max_length=50, null=True, blank=True)
    pickup_date = models.DateTimeField(null=True, blank=True)
    delivered_back_date = models.DateTimeField(null=True, blank=True)
    delhivery_status_type = models.CharField(
        max_length=5,
        null=True,
        blank=True,
        help_text="Delhivery Status Type (RT, DL, etc.)"
    )
    delhivery_status = models.TextField(
        null=True,
        blank=True,
        help_text="Raw Delhivery status or error message"
    )
    delhivery_status_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when Delhivery sent this status"
    )
    admin_comment = models.TextField(blank=True, null=True)
    admin_processed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order_item"],
                condition=models.Q(order_item__isnull=False)
                & ~models.Q(status="refunded"),
                name="unique_active_return_per_item",
            )
        ]
        ordering = ["-created_at"]

    def clean(self):
        if self.order_item:
            exists = ReturnRequest.objects.filter(
                order_item=self.order_item
            ).exclude(pk=self.pk).exclude(status="refunded").exists()
            if exists:
                raise ValidationError(
                    "A return is already in progress for this item."
                )

        if (
            self.refund_amount
            and self.order_item
            and self.refund_amount > self.order_item.total_price()
        ):
            raise ValidationError(
                {"refund_amount": "Cannot exceed item total."}
            )

        super().clean()

    @transaction.atomic
    def mark_refunded(self, amount=None, reverse_charge=None):
        if self.status != "dto":   # ✅ SAFETY CHECK
            raise ValidationError("Item not yet received at warehouse")
        if amount is not None:
            self.refund_amount = amount

        reverse_charge = reverse_charge or self.reverse_pickup_charge or Decimal("0.00")

        self.reverse_pickup_charge = reverse_charge
        self.recovery_fixed = True
        self.status = "refunded"
        self.refunded_at = timezone.now()

        self.admin_comment = (
            f"Refunded ₹{self.refund_amount}. "
            f"Pending recovery ₹{reverse_charge} saved."
        )

        self.save(update_fields=[
            "status",
            "refunded_at",
            "refund_amount",
            "reverse_pickup_charge",
            "recovery_fixed",
            "admin_comment",
        ])

        account, _ = ReturnRecoveryAccount.objects.get_or_create(user=self.user)

        if reverse_charge > 0 and not ReturnRecoveryTransaction.objects.filter(
            account=account,
            source=f"ReturnRequest #{self.id}",
            transaction_type="debit",
        ).exists():
            account.add_recovery(
                reverse_charge,
                source=f"ReturnRequest #{self.id}",
                source_type="return",
            )

    @classmethod
    def should_block_user(cls, user, threshold=3, window_days=90):
        return cls.objects.filter(
            user=user,
            status="refunded",
            created_at__gte=timezone.now() - timedelta(days=window_days),
        ).count() > threshold

    def __str__(self):
        return (
            f"Return for Item #{self.order_item.id} in Order #{self.order.order_number}"
            if self.order_item
            else f"Return for Order #{self.order.order_number}"
        )
    
    def update_delhivery_status(self, status_type, status_text, updated_at=None):
        """
        Update raw Delhivery status and map to internal status.
        """
        status_type = status_type.strip().upper()
        status_text = status_text.strip().lower()

        self.delhivery_status_type = status_type
        self.delhivery_status = status_text
        self.delhivery_status_updated_at = updated_at or timezone.now()

        internal_status = RETURN_STATUS_MAP.get((status_type, status_text))

        if internal_status:
            self.status = internal_status

            if internal_status == "dto":
                self.delivered_back_date = timezone.now()

                # ✅ SYNC ORDER ITEM (NO ORDER-LEVEL CONFLICT)
                if self.order_item:
                    self.order_item.status = OrderItemStatus.DELIVERED_TO_WAREHOUSE
                    self.order_item.save(update_fields=["status"])

        self.save(update_fields=[
            "status",
            "delhivery_status_type",
            "delhivery_status",
            "delhivery_status_updated_at",
            "delivered_back_date"
        ])

class ReturnRecoveryAccount(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="recovery_account")
    total_recovery = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - Pending ₹{self.balance_due}"

    # Add a new recovery (debit) when a return is refunded
    def add_recovery(self, amount, source, source_type="return", reference_id=None):
        """
        Add a debit to the recovery account for returns or replacements.
        """
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
            source_type=source_type,
            reference_id=reference_id,
            description=f"{source_type.capitalize()} charge added from {source}"
        )

    # Apply recovery payment (credit) from checkout or manual adjustment
    def apply_payment(self, amount, source="Checkout Adjustment", source_type="return", reference_id=None):
        """
        Apply a credit to settle pending recovery from returns or replacements.
        """
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
            source_type=source_type,
            reference_id=reference_id,
            description=f"Recovered ₹{applied} from {source}"
        )
        return applied

class ReturnRecoveryTransaction(models.Model):
    TRANSACTION_CHOICES = [
        ("debit", "Debit (Recovery Added)"),
        ("credit", "Credit (Recovered)")
    ]

    SOURCE_TYPE_CHOICES = [
        ("return", "Return"),
        ("replacement", "Replacement")
    ]

    account = models.ForeignKey(ReturnRecoveryAccount, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=100, blank=True, null=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default="return")
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.account.user.get_full_name()} - "
            f"{self.transaction_type.upper()} ₹{self.amount} ({self.source_type}: {self.source})"
        )

class ReplacementRequest(models.Model):
    # ---------------- Status Choices ----------------
    INTERNAL_STATUS_CHOICES = [
        # Admin / workflow flow
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("failed", "Failed"),

        # Webhook-driven flow (mapped from Delhivery)
        ("scheduled", "Exchange Scheduled"),
        ("in_transit", "Exchange In Transit"),
        ("completed", "Exchange Completed"),
        ("cancelled", "Exchange Cancelled"),
    ]

    ADMIN_DECISION_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    REPLACEMENT_STATUS_MAP = {
        ("PP", "open"): "scheduled",
        ("PP", "scheduled"): "scheduled",
        ("PP", "dispatched"): "in_transit",
        ("PU", "in transit"): "in_transit",
        ("PU", "pending"): "in_transit",
        ("PU", "dispatched"): "in_transit",
        ("DL", "dto"): "completed",
        ("CN", "canceled"): "cancelled",
        ("CN", "closed"): "cancelled",
    }


    # ---------------- Links ----------------
    new_order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replacement_origin"
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="replacement_requests"
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replacement_requests"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="replacement_requests"
    )
    waybill = models.CharField(max_length=50, null=True, blank=True)

    # ---------------- Request Details ----------------
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=INTERNAL_STATUS_CHOICES,
        default="pending"
    )

    admin_decision = models.CharField(
        max_length=20,
        choices=ADMIN_DECISION_CHOICES,
        default="pending"
    )
    admin_comment = models.TextField(blank=True, null=True)
    variant_policy_snapshot = models.JSONField(null=True, blank=True)

    # ---------------- Delhivery Raw Status ----------------
    delhivery_status_type = models.CharField(
        max_length=5,
        null=True,
        blank=True,
        help_text="Delhivery Status Type (PP, PU, DL, CN)"
    )
    delhivery_status = models.TextField(
        null=True,
        blank=True,
        help_text="Raw Delhivery status or error message"
    )

    delhivery_status_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when Delhivery sent this status"
    )
    replacement_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    recovery_fixed = models.BooleanField(default=False)
    # ---------------- Timestamps ----------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    # ---------------- Meta ----------------
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order_item"],
                condition=~models.Q(
                    status__in=["completed", "failed", "rejected", "cancelled"]
                ),
                name="unique_active_replacement_per_item",
            )
        ]

    # ---------------- Helpers ----------------
    def mark_in_transit(self):
        self.status = "in_transit"
        self.shipped_at = timezone.now()
        self.save(update_fields=["status", "shipped_at"])

    def mark_completed(self):
        self.status = "completed"
        self.delivered_at = timezone.now()
        self.save(update_fields=["status", "delivered_at"])


    def clean(self):
        from django.core.exceptions import ValidationError
        if self.order_item:
            exists = ReplacementRequest.objects.filter(
                order_item=self.order_item
            ).exclude(pk=self.pk).exclude(
                status__in=["completed", "failed", "rejected", "cancelled"]
            ).exists()
            if exists:
                raise ValidationError("A replacement is already in progress for this item.")

        active_return = ReturnRequest.objects.filter(
            order_item=self.order_item
        ).exclude(status="refunded").exists()
        if active_return:
            raise ValidationError("A return request already exists for this item.")

        super().clean()
        if self.status in ["scheduled", "in_transit"] and not self.waybill:
            raise ValidationError("Waybill is required to start replacement shipment")


    def __str__(self):
        if self.order_item:
            return f"Replacement for Item #{self.order_item.id} in Order #{self.order.order_number}"
        return f"Replacement for Order #{self.order.order_number}"

    def add_replacement_recovery(self,amount):
        from decimal import Decimal

        amount=Decimal(amount)

        if self.recovery_fixed or amount <= 0:
            return
        account,_ = ReturnRecoveryAccount.objects.get_or_create(user=self.user)

        already_added = ReturnRecoveryTransaction.objects.filter(
            account=account,
            source=f"ReplacementRequest #{self.id}",
            source_type="replacement",
            transaction_type="debit",
        ).exists()

        if already_added:
            self.recovery_fixed = True
            self.save(update_fields=["recovery_fixed"])
            return
        
        account.add_recovery(
            amount=amount,
            source=f"ReplacementRequest #{self.id}",
            source_type="replacement",
            reference_id=self.new_order.order_number if self.new_order else None,
        )
        self.replacement_charge = amount
        self.recovery_fixed = True
        self.save(update_fields=["replacement_charge", "recovery_fixed"])

    def update_delhivery_status(self, status_type, status_text, updated_at=None):
        status_type = status_type.strip().upper()
        status_text = status_text.strip().lower()

        self.delhivery_status_type = status_type
        self.delhivery_status = status_text
        self.delhivery_status_updated_at = updated_at or timezone.now()

        internal_status = self.REPLACEMENT_STATUS_MAP.get((status_type, status_text))

        if internal_status:
            self.status = internal_status

            if internal_status == "in_transit":
                self.shipped_at = timezone.now()

                if self.order_item:
                    self.order_item.status = OrderItemStatus.REPL_IN_TRANSIT
                    self.order_item.save(update_fields=["status"])

            elif internal_status == "completed":
                self.delivered_at = timezone.now()

                if self.order_item:
                    self.order_item.status = OrderItemStatus.REPL_COMPLETED
                    self.order_item.save(update_fields=["status"])

        self.save(update_fields=[
            "status",
            "delhivery_status_type",
            "delhivery_status",
            "delhivery_status_updated_at",
            "shipped_at",
            "delivered_at",
        ])
