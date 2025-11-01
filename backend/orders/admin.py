
# delivery/admin.py
from django.contrib import admin
from .models import Order, OrderItem, ShippingAddress,Refund,ReturnRequest

# -------------------- INLINE --------------------
class OrderItemInline(admin.TabularInline):
    """Show OrderItems inside the Order admin page"""
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product_variant",
        "quantity",
        "price",
        "status",
        "refund_amount",
        "courier",
        "waybill",
        "tracking_url",
        "shipped_at",
        "handoff_timestamp",
    )
    can_delete = False
# -------------------- ORDER --------------------
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "user",
        "status",
        "total",
        "payment_method",
        "is_paid",
        "paid_at",
        "created_at",
    )
    list_filter = ("status", "is_paid","payment_method", "created_at")
    search_fields = (
        "order_number",
        "user__email",
    )
    readonly_fields = ("order_number", "created_at", "updated_at", "paid_at")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)

# -------------------- ORDER ITEM --------------------
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product_variant",
        "quantity",
        "price",
        "status",
        "courier",
        "waybill",
        "tracking_url",
        "refund_amount",
        "shipped_at",
    )
    search_fields = (
        "order__order_number",
        "product_variant__product__name",
        "product_variant__sku",
        "waybill",
        "courier",
    )
    readonly_fields = (
        "refund_amount",
        "tracking_url",
        "shipped_at",
        "handoff_timestamp",
    )

# -------------------- SHIPPING ADDRESS --------------------
@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "full_name", "city", "country", "phone_number")
    list_filter = ("country", "city")
    search_fields = ("user__email", "full_name", "city", "country")

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        "refund_id",
        "order",
        "amount",
        "status",
        "created_at",
        "processed_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("refund_id", "order__order_number", "order__user__email")
    readonly_fields = ("created_at", "processed_at")
    ordering = ("-created_at",)

@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id", "order", "order_item", "user",
        "status", "refund_amount", "waybill",
        "pickup_date", "delivered_back_date",
        "refunded_at", "created_at"
    )
    list_filter = ("status", "created_at", "refunded_at")
    search_fields = (
        "order__order_number",
        "order_item__product_variant__variant_name",
        "user__email",
        "waybill"
    )
    readonly_fields = ("created_at", "updated_at", "refunded_at")
    ordering = ("-created_at",)

# # -------------------- REPLACEMENT REQUEST --------------------
# @admin.register(ReplacementRequest)
# class ReplacementRequestAdmin(admin.ModelAdmin):
#     list_display = (
#         "id", "order", "order_item", "user", "status", 
#         "pickup_status", "warehouse_decision", "admin_decision",
#         "shipped_at", "delivered_at", "created_at", "updated_at"
#     )
#     list_filter = (
#         "status", "pickup_status", "warehouse_decision", "admin_decision", "created_at"
#     )
#     search_fields = ("order__id", "order_item__product_variant__variant_name", "user__email")
#     readonly_fields = ("created_at", "updated_at", "shipped_at", "delivered_at")
#     ordering = ("-created_at",)

