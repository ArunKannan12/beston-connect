from django.contrib import admin
from .models import AdminLog
from .warehouse import DelhiveryPickupRequest
from django.utils.html import format_html

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

# @admin.register(Warehouse)
# class WarehouseAdmin(admin.ModelAdmin):
#     list_display = (
#         "name",
#         "city",
#         "state",
#         "pin",
#         "is_active",
#         "delhivery_sync_status",
#         "last_synced_at",
#         "created_at",
#     )

#     list_filter = (
#         "is_active",
#         "delhivery_synced",
#         "city",
#         "state",
#         "created_at",
#     )

#     search_fields = (
#         "name",
#         "city",
#         "state",
#         "pin",
#         "phone",
#         "email",
#     )

#     readonly_fields = (
#         "delhivery_synced",
#         "delhivery_warehouse_id",
#         "last_synced_at",
#         "last_sync_message",
#         "created_at",
#         "updated_at",
#     )

#     fieldsets = (
#         ("Warehouse Details", {
#             "fields": (
#                 "name",
#                 "phone",
#                 "email",
#                 "address",
#                 "city",
#                 "state",
#                 "pin",
#                 "country",
#             )
#         }),
#         ("Return Address", {
#             "fields": (
#                 "return_address",
#                 "return_city",
#                 "return_state",
#                 "return_pin",
#                 "return_country",
#             )
#         }),
#         ("Delhivery Sync Status", {
#             "classes": ("collapse",),
#             "fields": (
#                 "delhivery_synced",
#                 "delhivery_warehouse_id",
#                 "last_synced_at",
#                 "last_sync_message",
#             )
#         }),
#         ("Flags", {
#             "fields": (
#                 "is_active",
#                 "is_deleted",
#             )
#         }),
#         ("Timestamps", {
#             "fields": (
#                 "created_at",
#                 "updated_at",
#             )
#         }),
#     )

#     def delhivery_sync_status(self, obj):
#         if obj.delhivery_synced:
#             return format_html(
#                 '<span style="color:green;font-weight:bold;">✔ Synced</span>'
#             )
#         return format_html(
#             '<span style="color:red;font-weight:bold;">✖ Not Synced</span>'
#         )

#     delhivery_sync_status.short_description = "Delhivery"

@admin.register(DelhiveryPickupRequest)
class DelhiveryPickupRequestAdmin(admin.ModelAdmin):
    list_display = (
        "pickup_date",
        "slot",
        "pickup_time",
        "expected_package_count",
        "status",
        "delhivery_request_id",
        "created_at",
    )

    list_filter = (
        "status",
        "pickup_date",
        "slot",
    )

    search_fields = (
        "delhivery_request_id",
    )

    readonly_fields = (
        "delhivery_request_id",
        "raw_response",
        "created_at",
        "pickup_time",  # optional: you may want to keep pickup_time readonly since it's derived from slot
    )

    date_hierarchy = "pickup_date"
