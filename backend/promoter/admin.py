from django.contrib import admin
from .models import (
    Promoter, PromoterCommission, WithdrawalRequest, 
    CommissionLevel, PromotedProduct, PremiumSettings, PromoterPayment,Subscription
)

# -----------------------------
# Promoter Admin
# -----------------------------
@admin.register(Promoter)
class PromoterAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'phone_number', 'referral_code',
        'promoter_type', 'sales_count',
        'total_commission_earned', 'wallet_balance',
        'is_eligible_for_withdrawal', 'submitted_at',
    )
    list_filter = ('promoter_type', 'is_approved', 'kyc_status')
    search_fields = (
        'user__username', 'user__email', 'phone_number',
        'bank_account_number', 'account_holder_name', 'referral_code'
    )
    readonly_fields = (
        'referral_code', 'submitted_at', 'is_eligible_for_withdrawal'
    )
    ordering = ('-submitted_at',)
    list_per_page = 25

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'phone_number', 'promoter_type')
        }),
        ('Referral Info', {'fields': ('referral_code',)}),
        ('Application Status', {'fields': ('is_approved', 'kyc_status', 'submitted_at')}),
        ('Performance & Wallet', {
            'fields': ('total_commission_earned', 'wallet_balance', 'is_eligible_for_withdrawal')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

    def sales_count(self, obj):
        return obj.sales.count() if hasattr(obj, 'sales') else 0
    sales_count.short_description = "Sales Count"

admin.site.register(Subscription)
# -----------------------------
# Promoter Commission Admin
# -----------------------------
@admin.register(PromoterCommission)
class PromoterCommissionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'promoter', 'order', 'product_variant',
        'amount', 'level', 'status', 'created_at'
    )
    list_filter = ('status', 'level', 'created_at')
    search_fields = (
        'promoter__user__username', 'promoter__user__email',
        'order__id', 'product_variant__product__name'
    )
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    autocomplete_fields = ('promoter', 'order', 'product_variant')
    list_per_page = 30


# -----------------------------
# Withdrawal Request Admin
# -----------------------------
@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'promoter', 'amount', 'status', 'requested_at', 'reviewed_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('promoter__user__username', 'promoter__user__email')
    readonly_fields = ('requested_at', 'reviewed_at')
    ordering = ('-requested_at',)
    autocomplete_fields = ('promoter',)
    list_per_page = 25

    fieldsets = (
        ('Promoter Info', {'fields': ('promoter',)}),
        ('Withdrawal Details', {'fields': ('amount', 'status', 'admin_note')}),
        ('Timestamps', {'fields': ('requested_at', 'reviewed_at')}),
    )


# -----------------------------
# Commission Level Admin
# -----------------------------
@admin.register(CommissionLevel)
class CommissionLevelAdmin(admin.ModelAdmin):
    list_display = ('level', 'percentage')
    search_fields = ('level',)
    ordering = ('level',)


# -----------------------------
# Promoted Product Admin
# -----------------------------
@admin.register(PromotedProduct)
class PromotedProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'promoter', 'product_variant','click_count', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = (
        'promoter__user__username', 'promoter__user__email', 'product_variant__product__name'
    )
    autocomplete_fields = ('promoter', 'product_variant')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


# -----------------------------
# Premium Settings Admin
# -----------------------------
@admin.register(PremiumSettings)
class PremiumSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'monthly_amount', 'annual_amount', 'offer_active', 'offer_start', 'offer_end')
    list_filter = ('offer_active',)
    ordering = ('-id',)


# -----------------------------
# Promoter Payment Admin
# -----------------------------
@admin.register(PromoterPayment)
class PromoterPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'promoter', 'amount', 'razorpay_payment_id', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('promoter__user__username', 'promoter__user__email', 'razorpay_payment_id')
    readonly_fields = ('created_at',)
    autocomplete_fields = ('promoter',)
    ordering = ('-created_at',)