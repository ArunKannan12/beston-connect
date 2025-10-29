from django.contrib import admin
from .models import (
    Investor, Investment, InvestmentPayment,
    ProductSaleShare, Payout, InvestorWallet
)

# -----------------------------
# Inlines
# -----------------------------

class InvestmentInline(admin.TabularInline):
    model = Investment
    extra = 0
    readonly_fields = ('invested_at',)
    show_change_link = True


class ProductSaleShareInline(admin.TabularInline):
    model = ProductSaleShare
    extra = 0
    readonly_fields = ('period_start', 'period_end')


class PayoutInline(admin.TabularInline):
    model = Payout
    extra = 0
    readonly_fields = ('payout_date',)


class InvestorWalletInline(admin.StackedInline):
    model = InvestorWallet
    can_delete = False
    max_num = 1
    readonly_fields = ('last_updated', 'balance')

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return True


class InvestmentPaymentInline(admin.TabularInline):
    model = InvestmentPayment.investments.through
    extra = 0
    verbose_name = "Related Payment"
    verbose_name_plural = "Related Payments"


# -----------------------------
# Admin Classes
# -----------------------------

@admin.register(Investor)
class InvestorAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'phone', 'verification_status', 'joined_at')
    search_fields = ('user__email', 'phone')
    list_filter = ('verification_status', 'joined_at')
    readonly_fields = ('joined_at',)
    inlines = [
        InvestmentInline,
        ProductSaleShareInline,
        PayoutInline,
        InvestorWalletInline,
    ]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'investor', 'amount', 'confirmed', 'invested_at')
    list_filter = ('confirmed', 'invested_at')
    search_fields = ('investor__user__email',)
    readonly_fields = ('invested_at',)
    inlines = [InvestmentPaymentInline]


@admin.register(InvestmentPayment)
class InvestmentPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'investment_ids', 'transaction_id', 'payment_gateway', 'amount', 'status', 'paid_at')
    list_filter = ('status', 'payment_gateway')
    search_fields = ('transaction_id',)

    def investment_ids(self, obj):
        return ", ".join(str(inv.id) for inv in obj.investments.all())
    investment_ids.short_description = "Investment IDs"


@admin.register(ProductSaleShare)
class ProductSaleShareAdmin(admin.ModelAdmin):
    list_display = ('id', 'investor', 'investor_share', 'profit_generated', 'period_start', 'period_end')
    list_filter = ('period_start', 'period_end')
    search_fields = ('investor__user__email',)


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'investor', 'amount', 'status', 'payout_date')
    list_filter = ('status', 'payout_date')
    search_fields = ('investor__user__email',)


@admin.register(InvestorWallet)
class InvestorWalletAdmin(admin.ModelAdmin):
    list_display = ('id', 'investor', 'balance', 'last_updated')
    search_fields = ('investor__user__email',)
    readonly_fields = ('last_updated', 'balance')
