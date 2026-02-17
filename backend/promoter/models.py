from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import random
from datetime import timedelta
import string
from dateutil.relativedelta import relativedelta
from django.core.exceptions import ValidationError
import re
from products.models import ProductVariant
from django.conf import settings
from django.utils import timezone
from django.core.validators import RegexValidator

User = get_user_model()


def generate_random_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

def to_slug(text):
    # Same slug function as frontend
    text = text.lower().strip()
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^a-z0-9-]', '', text)
    return text

class Promoter(models.Model):
    PROMOTER_TYPE_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
    ]

    KYC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='promoter')
    referral_code = models.CharField(max_length=50, unique=True, editable=False)

    promoter_type = models.CharField(
        max_length=10, choices=PROMOTER_TYPE_CHOICES, default='unpaid'
    )
    premium_activated_at = models.DateTimeField(null=True, blank=True)


    phone_number = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        validators=[RegexValidator(regex=r'^[6-9]\d{9}$')]
    )
    is_approved = models.BooleanField(default=False)
    # KYC
    kyc_status = models.CharField(
        max_length=20, choices=KYC_STATUS_CHOICES, default='pending'
    )
    kyc_verified_at = models.DateTimeField(null=True, blank=True)

    # Wallet
    wallet_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00')
    )
    total_commission_earned = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00')
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Stats
    total_sales_count = models.PositiveIntegerField(default=0)

    MIN_WITHDRAWAL_AMOUNT = Decimal('100.00')

    def save(self, *args, **kwargs):
        if not self.referral_code:
            while True:
                code = generate_random_code()
                if not Promoter.objects.filter(referral_code=code).exists():
                    self.referral_code = code
                    break
        super().save(*args, **kwargs)

    # ---- Wallet helpers (ONLY place wallet changes) ----
    def credit_wallet(self, amount: Decimal):
        self.wallet_balance += amount
        self.total_commission_earned += amount
        self.save(update_fields=['wallet_balance', 'total_commission_earned'])

    def debit_wallet(self, amount: Decimal):
        if amount > self.wallet_balance:
            raise ValueError("Insufficient wallet balance")
        self.wallet_balance -= amount
        self.save(update_fields=['wallet_balance'])

    @property
    def is_eligible_for_withdrawal(self):
        return self.wallet_balance >= self.MIN_WITHDRAWAL_AMOUNT

    def __str__(self):
        return f"{self.user.email}"

    @property
    def referred_by(self):
        """Returns the upline promoter if it exists."""
        referral = getattr(self, 'referral_entry', None)
        return referral.referrer_promoter if referral else None

    def has_active_subscription_at(self, at_time):
        return self.subscriptions.filter(
            status='active',
            started_at__lte=at_time,
            expires_at__gte=at_time
        ).exists()

    def add_commission(self, amount, credit_wallet=False):
        """
        Add commission to promoter.
        - amount: Decimal
        - credit_wallet: if True, also add to wallet_balance
        """
        self.total_commission_earned += amount
        if credit_wallet:
            self.wallet_balance += amount
        self.save(update_fields=['total_commission_earned', 'wallet_balance'] if credit_wallet else ['total_commission_earned'])


class PromoterBankAccount(models.Model):
    promoter = models.OneToOneField(
        Promoter,
        on_delete=models.CASCADE,
        related_name='bank_account'
    )

    account_holder_name = models.CharField(
        max_length=100,
        validators=[RegexValidator(regex=r'^[A-Za-z .]+$')]
    )

    account_number = models.CharField(
        max_length=18,
        validators=[RegexValidator(regex=r'^\d{9,18}$')]
    )

    ifsc_code = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r'^[A-Z]{4}0[A-Z0-9]{6}$')]
    )

    bank_name = models.CharField(
        max_length=100,
        validators=[RegexValidator(regex=r'^[A-Za-z ]+$')]
    )

    is_verified = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"{self.promoter.user.email} - {self.bank_name}"

class PromoterReferral(models.Model):
    referred_promoter = models.OneToOneField(
        Promoter,
        on_delete=models.CASCADE,
        related_name='referral_entry'
)
    referrer_promoter = models.ForeignKey(Promoter,on_delete=models.CASCADE, related_name='referrals_made')
    referral_code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    tier_at_referral = models.CharField(max_length=20, default='free')
    current_tier = models.CharField(max_length=20, default='free')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True) 
    updated_at = models.DateTimeField(auto_now=True)  
    class Meta:
        db_table = "promoter_referrals"
        constraints = [
            models.UniqueConstraint(fields=["referred_promoter"], name="unique_referred_promoter")
        ]

    def __str__(self):
        return f"{self.referrer_promoter.user.email} → {self.referred_promoter.user.email}"
# ==========================
# Referral Commission Settings
# ==========================
class ReferralCommissionSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def percent(self):
        return Decimal(self.value.get('percent', 0))

class PromoterCommission(models.Model):
    PENDING_REASON_CHOICES = [
        ('subscription_inactive', 'Subscription Inactive'),
        ('order_not_completed', 'Order Not Completed'),
        ('manual_hold', 'Manual Hold'),
    ]
    EARNING_TYPE_CHOICES = [
        ('direct_sale', 'Direct Sale'),
        ('referral_sale', 'Referral Sale'),
        ('subscription_referral', 'Subscription Referral'),
        ('tier_bonus', 'Tier Bonus'),
    ]
    pending_reason = models.CharField(
        max_length=30,
        choices=PENDING_REASON_CHOICES,
        null=True,
        blank=True
    )
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid'),
    ]

    promoter = models.ForeignKey(
        Promoter, on_delete=models.CASCADE, related_name='commissions'
    )

    # 🔹 source context
    earning_type = models.CharField(
        max_length=30, choices=EARNING_TYPE_CHOICES, default='direct_sale'
    )

    referral_source_promoter = models.ForeignKey(
        Promoter,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='generated_referral_commissions'
    )

    referral_source_subscription = models.ForeignKey(
        'Subscription',
        null=True, blank=True,
        on_delete=models.SET_NULL
    )

    order = models.ForeignKey(
        'orders.Order',
        null=True, blank=True,   # 🔹 subscription commissions have no order
        on_delete=models.SET_NULL
    )

    product_variant = models.ForeignKey(
        ProductVariant,
        null=True, blank=True,
        on_delete=models.SET_NULL
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    level = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)


    def mark_paid(self):
        if self.status != 'paid':
            self.promoter.credit_wallet(self.amount)
            self.status = 'paid'
            self.save(update_fields=['status'])

    def reverse(self):
        if self.status == 'paid':
            self.promoter.debit_wallet(self.amount)
        self.status = 'reversed'
        self.save(update_fields=['status'])

class WithdrawalRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    promoter = models.ForeignKey('Promoter', on_delete=models.CASCADE, related_name='withdrawals')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, null=True)

    def approve(self, note=""):
        # Only pending requests can be approved
        if self.status != "pending":
            raise ValidationError("Only pending requests can be approved.")

        # Ensure promoter is paid
        if self.promoter.promoter_type != 'paid':
            raise ValidationError("Only paid promoters can be approved for withdrawal.")

        # Ensure promoter is approved (admin-approved)
        if not self.promoter.is_approved:
            raise ValidationError("Promoter account is not approved by admin yet.")

        # Ensure promoter has a bank account
        try:
            bank = self.promoter.bank_account
        except PromoterBankAccount.DoesNotExist:
            raise ValidationError("Promoter does not have a registered bank account.")

        # Ensure sufficient wallet balance
        if self.amount > self.promoter.wallet_balance:
            raise ValidationError("Withdrawal amount exceeds wallet balance.")

        # Deduct amount from wallet safely
        self.promoter.debit_wallet(self.amount)

        # Update withdrawal request
        self.status = "approved"
        self.admin_note = note
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status', 'admin_note', 'reviewed_at'])

class VideoAd(models.Model):
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='video_ads')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    video_url = models.URLField()
    thumbnail_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, default='active')
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CommissionLevel(models.Model):
    level = models.PositiveIntegerField(unique=True, help_text="1 = Direct, 2 = Parent, etc.")
    percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage of total commission")

    class Meta:
        ordering = ['level']

    def __str__(self):
        return f"Level {self.level} - {self.percentage}%"

class PromotedProduct(models.Model):
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='promoted_products')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='promoted_by')
    click_count = models.PositiveIntegerField(default=0)
    total_sales = models.PositiveIntegerField(default=0)
    total_commission_generated = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('promoter', 'product_variant')

    @property
    def referral_link(self):
        base_url = getattr(settings, 'FRONTEND_URL', '')
        variant_slug = to_slug(self.product_variant.variant_name)
        return f"{base_url}/products/{variant_slug}/?ref={self.promoter.referral_code}"

    def __str__(self):
        return f"{self.promoter.user.email} promotes {self.product_variant.variant_name}"


class PremiumSettings(models.Model):
    monthly_amount = models.DecimalField(max_digits=12, decimal_places=2)
    annual_amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Offer fields
    offer_active = models.BooleanField(default=False)
    monthly_offer = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_offer = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    offer_start = models.DateTimeField(null=True, blank=True)
    offer_end = models.DateTimeField(null=True, blank=True)
    singleton = models.BooleanField(default=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Premium Settings (Monthly: {self.monthly_amount}, Annual: {self.annual_amount})"

    def clean(self):
        if self.offer_start and self.offer_end and self.offer_start > self.offer_end:
            raise ValidationError("Offer start must be before offer end.")

    @property
    def is_offer_active(self):
        now = timezone.now()
        return self.offer_active and self.offer_start and self.offer_end and self.offer_start <= now <= self.offer_end

    def current_amount(self, plan_type='monthly'):
        if plan_type not in ('monthly', 'annual'):
            raise ValueError(f"Invalid plan_type: {plan_type}")
        if plan_type == 'monthly':
            return self.monthly_offer if self.is_offer_active and self.monthly_offer is not None else self.monthly_amount
        return self.annual_offer if self.is_offer_active and self.annual_offer is not None else self.annual_amount

    @property
    def current_monthly(self):
        return self.current_amount('monthly')

    @property
    def current_annual(self):
        return self.current_amount('annual')


class PromoterPayment(models.Model):
    promoter = models.ForeignKey('Promoter', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending','Pending'),('success','Success'),('failed','Failed')],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)


class Subscription(models.Model):
    PLAN_CHOICES = [
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    promoter = models.ForeignKey('Promoter', on_delete=models.CASCADE, related_name='subscriptions')
    premium_settings = models.ForeignKey(PremiumSettings, null=True, blank=True, on_delete=models.SET_NULL)

    plan_type = models.CharField(max_length=20, choices=PLAN_CHOICES, default='monthly')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    plan_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)  # store exact paid amount
    offer_applied = models.BooleanField(default=False)
    auto_renew = models.BooleanField(default=False)

    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)

    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    referred_by_promoter = models.ForeignKey(
        'Promoter',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='referred_subscriptions'
    )
    next_billing_date = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expiry_alert_sent = models.BooleanField(default=False)  # for notifications

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['promoter'],
                condition=models.Q(status='active'),
                name='one_active_subscription_per_promoter'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.promoter.user.email} - {self.plan_type} subscription ({self.status})"

    def clean(self):
        if self.expires_at <= self.started_at:
            raise ValidationError("Expiry must be after start date")

    @staticmethod
    def calculate_expiry(plan_type):
        now = timezone.now()
        if plan_type == 'monthly':
            return now + relativedelta(months=1)
        elif plan_type == 'annual':
            return now + relativedelta(years=1)

    @property
    def is_active(self):
        return self.status == 'active' and self.expires_at > timezone.now()

    @property
    def remaining_days(self):
        if self.is_active:
            delta = self.expires_at - timezone.now()
            return delta.days
        return 0

    def mark_expired_if_needed(self):
        if self.status == 'active' and timezone.now() >= self.expires_at:
            self.status = 'expired'
            self.save(update_fields=['status'])
            
            # Demote promoter to unpaid
            promoter = self.promoter
            promoter.promoter_type = 'unpaid'
            promoter.save(update_fields=['promoter_type'])

    def renew(self):
        if not self.auto_renew:
            return False
        if self.plan_type == 'monthly':
            self.expires_at += timedelta(days=30)
        else:
            self.expires_at += timedelta(days=365)
        self.next_billing_date = self.expires_at
        self.save(update_fields=['expires_at', 'next_billing_date'])
        return True


class SubscriptionSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.value}"



class Sale(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
    ]

    referral_link_code = models.CharField(max_length=50, null=True, blank=True)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='sales')
    buyer_email = models.EmailField()
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sales"
        ordering = ['-created_at']

    def __str__(self):
        return f"Sale of {self.product_variant.variant_name} by {self.promoter.user.email} ({self.status})"

    def calculate_commission(self):
        """Helper to auto-calc commission amount based on rate and total."""
        self.commission_amount = (self.total_amount * self.commission_rate) / Decimal('100.00')
        return self.commission_amount