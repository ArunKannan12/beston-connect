from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.db.models import Sum
from rest_framework.exceptions import ValidationError
from django.db.models.signals import post_save
from products.models import ProductVariant
from django.dispatch import receiver
User = get_user_model()


class Investor(models.Model):
    VERIFICATION_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(
        max_length=20,
        validators=[RegexValidator(r'^\+?\d{10,15}$')]
    )
    profile_image = models.ImageField(upload_to='investors/', null=True, blank=True)
    address = models.TextField()
    verification_status = models.CharField(max_length=10, choices=VERIFICATION_STATUS, default='pending')
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_active(self):
        return self.user.is_active

    def __str__(self):
        return self.user.email
    @property
    def total_confirmed_investments(self):
        return self.investments.filter(confirmed=True).aggregate(total=Sum("amount"))["total"] or 0

class Investment(models.Model):
    investor = models.ForeignKey(Investor, on_delete=models.CASCADE, related_name='investments')
    product_variant=models.ForeignKey(ProductVariant,on_delete=models.CASCADE,null=True,blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    invested_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)  # Set to True once payment is verified
    note = models.TextField(null=True, blank=True)
    
    class Meta:
        indexes=[
            models.Index(fields=['investor']),
            models.Index(fields=['confirmed']),
            models.Index(fields=['product_variant'])
        ]
    

    def __str__(self):
        return f"{self.investor.user.email} - ₹{self.amount} in{self.product_variant}on {self.invested_at.date()}"

class InvestmentPayment(models.Model):
    investments = models.ManyToManyField(Investment,related_name='payments')
    payment_gateway = models.CharField(max_length=50)  # e.g., 'razorpay'
    transaction_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('initiated', 'Initiated'),
        ('success', 'Success'),
        ('failed', 'Failed')
    ], default='initiated')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    def clean(self):
        total_investment_amount = self.investments.aggregate(total=models.Sum('amount'))['total'] or 0
        if self.amount != total_investment_amount:
            raise ValidationError("Payment amount must match sum of selected investment amounts.")

    def __str__(self):
        return f"{self.investment.investor.user.email} - {self.status}"


class ProductSaleShare(models.Model):  
    investor = models.ForeignKey(Investor, on_delete=models.CASCADE)
    total_sales_volume = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    profit_generated = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    investor_share = models.DecimalField(max_digits=15, decimal_places=2)
    period_start = models.DateField()
    period_end = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    class Meta:
        unique_together=('investor','period_start','period_end')
        indexes=[
            models.Index(fields=['investor']),
            models.Index(fields=['period_start','period_end'])
        ]

    def __str__(self):
        return f"{self.investor.user.email} earned ₹{self.investor_share} from sales"


class Payout(models.Model):
    CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid')
    ]
    investor = models.ForeignKey(Investor, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payout_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=CHOICES, default='pending')
    sale_share = models.ForeignKey(ProductSaleShare, null=True, blank=True, on_delete=models.CASCADE)
    updated_at=models.DateTimeField(auto_now=True)

    class Meta:
       
        indexes=[
            models.Index(fields=['investor']),
            models.Index(fields=['status'])

        ]

    def __str__(self):
        return f"{self.investor.user.email} - ₹{self.amount} - {self.status}"


class InvestorWallet(models.Model):
    investor = models.OneToOneField(Investor, related_name='wallet', on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)  # ✅ Increased max_digits
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.investor.user.email} - ₹{self.balance}"

@receiver(post_save, sender=Investor)
def create_investor_wallet(sender,instance,created,**kwargs):
    if created and not hasattr(instance,'wallet'):
        InvestorWallet.objects.create(investor=instance)
    
@receiver(post_save, sender=Payout)
def update_wallet_on_payout(sender, instance, created, **kwargs):
    if instance.status == 'paid':
        wallet = instance.investor.wallet
        wallet.balance += instance.amount
        wallet.save()