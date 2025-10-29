from django.contrib import admin
from .models import (
    Promoter, PromoterCommission, WithdrawalRequest, 
    CommissionLevel, PromotedProduct, PremiumSettings, PromoterPayment
)

# -----------------------------
# Promoter Admin
# -----------------------------
@admin.register(Promoter)
class PromoterAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'phone_number', 'referral_code',
        'promoter_type', 'total_sales_count',
        'total_commission_earned', 'wallet_balance',
        'is_eligible_for_withdrawal', 'submitted_at', 
    )
    list_filter = ('promoter_type', 'is_eligible_for_withdrawal')
    search_fields = (
        'user__username', 'user__email', 'phone_number',
        'bank_account_number', 'account_holder_name', 'referral_code'
    )
    readonly_fields = (
        'referral_code', 'submitted_at', 
        'total_sales_count', 'total_commission_earned',
        'wallet_balance', 'is_eligible_for_withdrawal'
    )
    ordering = ('-submitted_at',)
    list_per_page = 25

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'phone_number', 'promoter_type', 'referred_by')
        }),
        ('Referral Info', {
            'fields': ('referral_code',)
        }),
        ('Bank Details', {
            'fields': ('bank_account_number', 'ifsc_code', 'bank_name', 'account_holder_name')
        }),
        ('Application Status', {
            'fields': ('submitted_at', )
        }),
        ('Performance & Wallet', {
            'fields': ('total_sales_count', 'total_commission_earned', 'wallet_balance', 'is_eligible_for_withdrawal')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'referred_by')


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
    list_display = ('id', 'promoter', 'product_variant', 'is_active', 'created_at')
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
    list_display = ('id', 'amount', 'active', 'updated_at')
    list_filter = ('active',)
    ordering = ('-updated_at',)


# -----------------------------
# Promoter Payment Admin
# -----------------------------
@admin.register(PromoterPayment)
class PromoterPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'promoter', 'premium_amount', 'payment_id', 'status', 'created_at', 'verified_at')
    list_filter = ('status', 'created_at', 'verified_at')
    search_fields = ('promoter__user__username', 'promoter__user__email', 'payment_id')
    readonly_fields = ('created_at', 'verified_at')
    autocomplete_fields = ('promoter',)
    ordering = ('-created_at',)
