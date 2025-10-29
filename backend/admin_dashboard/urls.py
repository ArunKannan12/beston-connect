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
                    AdminMarkAsShippedAPIView
                    )
from orders.returnReplacement import ReturnRequestUpdateAPIView,ReplacementRequestUpdateAPIView

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
    path("admin/returns/<int:pk>/", AdminReturnRequestdetailAPIView.as_view(), name="admin-return-detail"),
    path("admin/returns/<int:pk>/update/", ReturnRequestUpdateAPIView.as_view(), name="admin-return-update"),

    path("admin/replacements/", AdminReplacementRequestListAPIView.as_view(), name="admin-return-list"),
    path("admin/replacements/<int:pk>/", AdminReplacementRequestdetailAPIView.as_view(), name="admin-return-detail"),
    path("admin/replacements/<int:pk>/update/", ReplacementRequestUpdateAPIView.as_view(), name="admin-return-update"),

    path("admin/banners/", AdminBannerListAPIView.as_view(), name="admin-banner-list"),
    path("admin/banners/create/", BannerCreateAPIView.as_view(), name="banner-create"),
    path("admin/banners/<int:pk>/", BannerUpdateDestroyAPIView.as_view(), name="banner-update-destroy"),
    path("admin/orders/<str:order_number>/ship/", AdminMarkAsShippedAPIView.as_view(), name="admin-mark-shipped"),
]


