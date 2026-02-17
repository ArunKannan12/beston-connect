# admin/urls.py
from django.urls import path
from .views import (
                    AdminDashboardStatsAPIView,
                    ProductAdminCreateAPIView,
                    ProductAdminDetailAPIView,
                    ProductBulkActionAPIView,
                    CustomerBlockAPIView,
                    CustomerListAPIView,
                    CustomerDetailAPIView,
                    AdminOrderListAPIView,
                    AdminOrderDetailAPIView,
                    AdminReturnRequestdetailAPIView,
                    AdminReturnRequestListAPIView,
                    AdminReplacementRequestdetailAPIView,
                    AdminReplacementRequestListAPIView,
                    AdminBannerListAPIView,
                    BannerCreateAPIView,
                    BannerUpdateDestroyAPIView,
                    VariantBulkActionAPIView,
                    MarkPackedBulkAPIView,
                    DelhiveryWebhookAPIView,
                    OrdersPackingListAPIView,
                    ContactMessageAPIView,
                    ContactMessageListAPIView,
                    ContactMessageDetailAPIView,
                    DeleteContactMessageAPIView,
                    ResolveContactMessageAPIView
                    )
from orders.returnReplacement import ReturnRequestBulkUpdateAPIView,ReplacementRequestUpdateAPIView,ReturnRequestDetailAPIView,ReturnRequestRefundAPIView
from .warehouseViews import CreateDelhiveryPickupRequestAPIView,DelhiveryPickupRequestListAPIView,EligibleOrdersForPickupAPIView

urlpatterns = [
    path("dashboard-stats/", AdminDashboardStatsAPIView.as_view(), name="admin-dashboard-stats"),
    path('admin/create-products/',ProductAdminCreateAPIView.as_view(),name='admin-products'),
    path('admin/products/<int:id>/', ProductAdminDetailAPIView.as_view()),
    path("admin/products/bulk-action/", ProductBulkActionAPIView.as_view(), name=""),
    path("admin/variants/bulk-action/", VariantBulkActionAPIView.as_view(), name="variant-bulk-action"),
    
    path('admin/customers/', CustomerListAPIView.as_view(), name='admin-customer-list'),
    path("admin/customers/<int:id>/", CustomerDetailAPIView.as_view(), name="admin-customer-detail"),
    path('admin/customers/<int:pk>/block/', CustomerBlockAPIView.as_view(), name='admin-customer-block'),

    path("admin/orders/", AdminOrderListAPIView.as_view(), name="admin-order-list"),
    path("admin/orders/<str:order_number>/", AdminOrderDetailAPIView.as_view(), name="admin-order-detail"),

    path("admin/returns/", AdminReturnRequestListAPIView.as_view(), name="admin-return-list"),
    path("admin/returns/<int:returnId>/", ReturnRequestDetailAPIView.as_view(), name="admin-return-detail"),
    path("admin/returns/bulk-update/",ReturnRequestBulkUpdateAPIView.as_view(), name="return-request-bulk-update"),
    path('admin/returns/refund/', ReturnRequestRefundAPIView.as_view(), name='return-refund'),
    path("admin/replacements/", AdminReplacementRequestListAPIView.as_view(), name="admin-return-list"),
    path("admin/replacements/<int:pk>/", AdminReplacementRequestdetailAPIView.as_view(), name="admin-return-detail"),
    path("admin/replacements/<int:pk>/update/", ReplacementRequestUpdateAPIView.as_view(), name="admin-return-update"),

    path("admin/banners/", AdminBannerListAPIView.as_view(), name="admin-banner-list"),
    path("admin/banners/create/", BannerCreateAPIView.as_view(), name="banner-create"),
    path("admin/banners/<int:pk>/", BannerUpdateDestroyAPIView.as_view(), name="banner-update-destroy"),
   
    path("webhook/delhivery/", DelhiveryWebhookAPIView.as_view(), name="delhivery-webhook"),
    path("admin/mark-packed-bulk/", MarkPackedBulkAPIView.as_view(), name="mark-packed-bulk"),
    path('admin/packing-list/', OrdersPackingListAPIView.as_view(), name='orders-packing-list'),
    # path("warehouses/list/", WarehouseListView.as_view(), name="warehouse-list"),
    # path("warehouses/", WarehouseCreateView.as_view(), name="warehouse-create"),

    # # Update an existing warehouse + sync to Delhivery
    # path("warehouses/<int:pk>/", WarehouseUpdateView.as_view(), name="warehouse-update"),

    # # Deactivate a warehouse (local + sync to Delhivery)
    # path("warehouses/<int:pk>/deactivate/", WarehouseDeactivateView.as_view(), name="warehouse-deactivate"),
    path(
        "delhivery/pickup-request/create/",
        CreateDelhiveryPickupRequestAPIView.as_view(),
        name="create-delhivery-pickup-request"
    ),
    path("delhivery/pickup-requests/", DelhiveryPickupRequestListAPIView.as_view(), name="pickup-request-list"),
    path("delhivery/eligible-for-pickup/", EligibleOrdersForPickupAPIView.as_view(), name="order-for-picking-list"),
    

    path('contact/', ContactMessageAPIView.as_view(), name='contact-message'),
    path("admin/contact/", ContactMessageListAPIView.as_view(), name="admin-contact-list"),
    path("admin/contact/<int:pk>/", ContactMessageDetailAPIView.as_view(), name="admin-contact-detail"),
    path("admin/contact/<int:pk>/resolve/", ResolveContactMessageAPIView.as_view(), name="admin-contact-resolve"),
    path("admin/contact/<int:pk>/delete/", DeleteContactMessageAPIView.as_view(), name="admin-contact-delete"),

]


