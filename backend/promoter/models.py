from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import random
import string
from products.models import ProductVariant
from django.conf import settings
from django.utils import timezone
from django.core.validators import RegexValidator
User = get_user_model()


def generate_random_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))


class Promoter(models.Model):
    PROMOTER_TYPE_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
    ]


    user = models.OneToOneField(User, on_delete=models.CASCADE,related_name='promoter')
    referral_code = models.CharField(unique=True, editable=False, max_length=50)
    promoter_type = models.CharField(max_length=10, choices=PROMOTER_TYPE_CHOICES, default='unpaid')
    premium_activated_at = models.DateTimeField(null=True, blank=True)
    referred_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children'
    )

    phone_number = models.CharField(
        max_length=50,
        unique=True,
        validators=[RegexValidator(regex=r'^[6-9]\d{9}$', message='Enter a valid 10-digit number')]
    )
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=50, blank=True, null=True)
    account_holder_name = models.CharField(max_length=50, blank=True, null=True)

    submitted_at = models.DateTimeField(auto_now_add=True)

    total_sales_count = models.PositiveIntegerField(default=0)
    total_commission_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_eligible_for_withdrawal = models.BooleanField(default=False)

    MIN_WITHDRAWAL_AMOUNT = Decimal('1.00')  # Minimum balance to withdraw

    def save(self, *args, **kwargs):
        # Ensure unique referral code
        if not self.referral_code:
            while True:
                code = generate_random_code()
                if not Promoter.objects.filter(referral_code=code).exists():
                    self.referral_code = code
                    break
        super().save(*args, **kwargs)

    # ---- Helper Methods ----
    def add_commission(self, amount):
        """Add commission to wallet and total earned."""
        self.total_commission_earned += Decimal(amount)
        self.wallet_balance += Decimal(amount)
        self.check_withdrawal_eligibility()
        self.save()

    def deduct_withdrawal(self, amount):
        """Deduct amount from wallet after withdrawal."""
        if Decimal(amount) > self.wallet_balance:
            raise ValueError("Insufficient wallet balance")
        self.wallet_balance -= Decimal(amount)
        self.check_withdrawal_eligibility()
        self.save()

    def check_withdrawal_eligibility(self):
        """Update eligibility based on wallet balance and promoter type."""
        self.is_eligible_for_withdrawal = self.promoter_type == 'paid' and self.wallet_balance >= self.MIN_WITHDRAWAL_AMOUNT

    def __str__(self):
        return f"{self.user.email} ({self.promoter_type})"


class PromoterCommission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid')
    ]

    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='commissions')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    level = models.PositiveIntegerField(default=1)  # 1=direct seller, 2=parent, etc.
    status = models.CharField(choices=STATUS_CHOICES, max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def mark_as_paid(self):
        """Mark commission as paid and update promoter wallet."""
        if self.status != 'paid':
            self.status = 'paid'
            self.promoter.add_commission(self.amount)
            self.save()

    def __str__(self):
        return f"{self.promoter.user.email} - {self.amount} for {self.product_variant.product.name} (Level {self.level})"

class WithdrawalRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='withdrawals')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(choices=STATUS_CHOICES, default='pending', max_length=50)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, null=True)

    razorpay_payout_id = models.CharField(max_length=100, blank=True, null=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def approve(self):
        """Admin approves the withdrawal (triggers Razorpay payout later)."""
        if self.status != 'pending':
            raise ValueError("Request already processed")

        if not self.promoter.is_eligible_for_withdrawal or self.amount > self.promoter.wallet_balance:
            raise ValueError("Insufficient balance or not eligible")

        # Deduct immediately to prevent double spending
        self.promoter.deduct_withdrawal(self.amount)

        self.status = 'approved'
        self.reviewed_at = timezone.now()
        self.save()

        # Trigger Razorpay payout in next step (optional)
        # from promoter.utils import initiate_payout_to_promoter
        # initiate_payout_to_promoter(self)

    def reject(self, note=""):
        if self.status != 'pending':
            raise ValueError("Request already processed")
        self.status = 'rejected'
        self.admin_note = note
        self.reviewed_at = timezone.now()
        self.save()

    def __str__(self):
        return f"{self.promoter.user.email} - {self.amount} ({self.status})"

    
class CommissionLevel(models.Model):
    level = models.PositiveIntegerField(
        unique=True, help_text="1 = Direct promoter, 2 = Parent, 3 = Grandparent, etc."
    )
    percentage = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Percentage of total commission for this level"
    )

    class Meta:
        ordering = ["level"]

    def __str__(self):
        return f"Level {self.level} - {self.percentage}%"


class PromotedProduct(models.Model):
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='promoted_products')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='promoted_by')
    click_count=models.PositiveIntegerField(default=0)
    total_sales=models.PositiveIntegerField(default=0)
    total_commission_generated=models.DecimalField( max_digits=12, decimal_places=2,default=('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('promoter', 'product_variant')

    def __str__(self):
        return f"{self.promoter.user.email} promotes {self.product_variant.variant_name}"
    
    @property
    def referral_link(self):
        base_url = getattr(settings, 'FRONTEND_URL', '')
        return f"{base_url}/products/{self.product_variant.variant_name}/?ref={self.promoter.referral_code}"

class PremiumSettings(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    offer_amount=models.DecimalField( max_digits=12, decimal_places=2,null=True,blank=True)
    offer_active=models.BooleanField(default=False)
    offer_start=models.DateTimeField(null=True,blank=True)
    offer_end=models.DateTimeField(null=True,blank=True)
    active=models.BooleanField(default=True)
    updated_at=models.DateTimeField( auto_now=True)

    def __str__(self):
        return f"Premium Amount: {self.amount}"
    
    @property
    def current_amount(self):
        now=timezone.now()
        if (self.offer_active 
            and self.offer_amount 
            and self.offer_start
            and self.offer_end 
            and self.offer_start <= now <= self.offer_end):
            return self.offer_amount
        return self.amount
class PromoterPayment(models.Model):
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE, related_name='payments')
    premium_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_id = models.CharField(max_length=100, blank=True, null=True)  # from gateway
    status = models.CharField(max_length=20, choices=[('pending','Pending'),('success','Success'),('failed','Failed')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def mark_success(self, payment_id):
        self.payment_id = payment_id
        self.status = 'success'
        self.verified_at = timezone.now()
        self.save()

        # Upgrade promoter to paid
        self.promoter.promoter_type = 'paid'
        self.promoter.premium_activated_at = timezone.now()
        self.promoter.save()
