from django.contrib import admin
from .models import AdminLog

@admin.register(AdminLog)
class WarehouseLogAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'get_order_item',
        'get_order',
        'action',
        'get_updated_by',
        'timestamp',
    )
    list_filter = ('action', 'timestamp', 'updated_by')
    search_fields = (
        'order__order_number',
        'order_item__product_variant__product__name',
        'order_item__product_variant__variant_name',
        'updated_by__first_name',
        'updated_by__last_name',
        'updated_by__email',
    )
    readonly_fields = ('timestamp',)

    def get_order_item(self, obj):
        variant = obj.order_item.product_variant
        return f"{variant.product.name} - {variant.variant_name}"
    get_order_item.short_description = "Order Item"

    def get_order(self, obj):
        return obj.order.order_number if obj.order else "-"
    get_order.short_description = "Order"

    def get_updated_by(self, obj):
        return obj.updated_by.get_full_name() if obj.updated_by else "-"
    get_updated_by.short_description = "Updated By"