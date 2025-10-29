
# delivery/admin.py
from django.contrib import admin
from .models import Order, OrderItem, ShippingAddress

# -------------------- INLINE --------------------
class OrderItemInline(admin.TabularInline):
    """Show OrderItems inside the Order admin page"""
    model = OrderItem
    extra = 0
    readonly_fields = ("product_variant", "quantity", "price", "status", "refund_amount")
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
        "is_refunded",
        "waybill",
        "courier",
        "tracking_url",
        "paid_at",
        "created_at",
    )
    list_filter = ("status", "is_paid", "is_refunded", "payment_method", "created_at")
    search_fields = (
        "order_number",
        "user__email",
        "waybill",
        "courier",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "paid_at",
        "refunded_at",
        "refund_status",
        "refund_id",
        "tracking_url",
    )
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
        "refund_amount",
    )
    search_fields = (
        "order__order_number",
        "product_variant__product__name",
        "product_variant__sku",
    )
    readonly_fields = ("refund_amount",)

# -------------------- SHIPPING ADDRESS --------------------
@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "full_name", "city", "country", "phone_number")
    list_filter = ("country", "city")
    search_fields = ("user__email", "full_name", "city", "country")

# -------------------- RETURN REQUEST --------------------
# @admin.register(ReturnRequest)
# class ReturnRequestAdmin(admin.ModelAdmin):
#     list_display = (
#         "id", "order", "order_item", "user", "status", "refund_amount", "refund_method", "user_upi",
#         "pickup_status", "warehouse_decision", "admin_decision", "created_at", "updated_at"
#     )
#     list_filter = ("status", "refund_method", "pickup_status", "warehouse_decision", "admin_decision", "created_at")
#     search_fields = ("order__id", "order_item__product_variant__variant_name", "user__email", "user_upi")
#     readonly_fields = ("created_at", "updated_at", "refunded_at")
#     ordering = ("-created_at",)

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

