from .views import (
    ProductListCreateAPIView,
    ProductRetrieveUpdateDestroyAPIView,
    ProductVariantListAPIView,
    ProductVariantUpdateDestroyAPIView,
    CategoryListCreateAPIView,
    CategoryRetrieveUpdateDestroyAPIView,
    FeaturedProductsAPIView,
    RelatedProductsAPIView,
    ProductVariantImageListCreateAPIView,
    ProductVariantImageRetrieveUpdateDestroyAPIView,
    CustomerBannerListAPIView,
    BulkProductVariantCreateAPIView

)
from django.urls import path

urlpatterns = [
    # -------------------- CATEGORIES --------------------
    path('categories/', CategoryListCreateAPIView.as_view(), name='category-list-create'),
    path('categories/<slug:slug>/', CategoryRetrieveUpdateDestroyAPIView.as_view(), name='category-detail'),

    # -------------------- PRODUCTS --------------------
    path('products/', ProductListCreateAPIView.as_view(), name='product-list-create'),
    path('products/featured/', FeaturedProductsAPIView.as_view(), name='product-featured-list'),
    path('products/<slug:slug>/related/', RelatedProductsAPIView.as_view(), name='product-related-list'),
    path('products/<slug:slug>/', ProductRetrieveUpdateDestroyAPIView.as_view(), name='product-detail'),

    # -------------------- PRODUCT VARIANTS --------------------
    path("variants/", ProductVariantListAPIView.as_view(), name="variant-list"),  # ✅ Global variant listing
    path("variants/<int:id>/", ProductVariantUpdateDestroyAPIView.as_view(), name="variant-update-delete"),  # ✅
    # -------------------- VARIANT IMAGES --------------------
    path('variants/<int:variant_id>/images/', ProductVariantImageListCreateAPIView.as_view(), name='variant-image-list-create'),
    path('variants/images/<int:id>/', ProductVariantImageRetrieveUpdateDestroyAPIView.as_view(), name='variant-image-detail'),
    path('products/<int:product_id>/variants/bulk/',BulkProductVariantCreateAPIView.as_view(),name='variant-bulk-create'),
    path("banner/active/", CustomerBannerListAPIView.as_view(), name="customer-banner-list"),

    # Admin
    
]
