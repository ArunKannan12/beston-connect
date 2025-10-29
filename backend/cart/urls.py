from .views import ( 
    CartItemRetrieveUpdateDestroyAPIView,
    CartItemListCreateApiView,
    CartSummaryAPIView,
    CartMergeAPIView,
    ProductVariantBulkAPIView,
    GuestCartDetailsAPIView
)
from django.urls import path

urlpatterns = [
    path('cart/', CartItemListCreateApiView.as_view()),
    path('cart/<int:id>/', CartItemRetrieveUpdateDestroyAPIView.as_view()),
    path('cart/summary/', CartSummaryAPIView.as_view(), name='cart-summary'),
    path("cart/merge/", CartMergeAPIView.as_view(), name="cart-merge"),
    path('product-variants/bulk/', ProductVariantBulkAPIView.as_view(), name='product-variant-bulk'),

    
]
