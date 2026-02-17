from django.urls import path
from .views import (
    # Checkout flows
    ReferralCheckoutAPIView,
    CartCheckoutAPIView,
    BuyNowAPIView,
    OrderPreviewAPIView,

    # Customer order flows
    OrderListAPIView,
    OrderDetailAPIView,
    OrderPaymentAPIView,
    OrderTrackingAPIView,
    CancelOrderAPIView,
    RazorpayOrderCreateAPIView,
    RazorpayPaymentVerifyAPIView,
    GenerateDelhiveryLabelsAPIView,
  
    # Shipping address flows
    ShippingAddressListCreateView,
    ShippingAddressRetrieveUpdateDestroyView,
)
from .returnReplacement import (
    # Return request flows
    ReturnRequestCreateAPIView,
    ReturnRequestBulkUpdateAPIView,
    ReturnRequestListAPIView,
    ReturnRequestDetailAPIView,

    RefundStatusAPIView,

    ReplacementRequestCreateAPIView,
    ReplacementRequestDetailAPIView,
    ReplacementRequestListAPIView,
    ReplacementRequestUpdateAPIView,
    ReturnRequestRefundAPIView,
    
   
)
from .tasks import apply_commission_cron


urlpatterns = [
    # 🛒 Checkout APIs
    path('checkout/referral/', ReferralCheckoutAPIView.as_view(), name='checkout-referral'),
    path('checkout/cart/', CartCheckoutAPIView.as_view(), name='checkout-cart'),
    path('checkout/buy-now/', BuyNowAPIView.as_view(), name='checkout-buy-now'),
    path('checkout/preview/', OrderPreviewAPIView.as_view(), name='checkout-preview'),

    # 📦 Customer Order APIs
    path('orders/', OrderListAPIView.as_view(), name='orders-list'),
    path('order-detail/<str:order_number>/', OrderDetailAPIView.as_view(), name='orders-detail'),
    path('orders/<str:order_number>/pay/', OrderPaymentAPIView.as_view(), name='orders-pay'),
    path('orders/<str:order_number>/cancel/', CancelOrderAPIView.as_view(), name='orders-cancel'),
    path('orders/<str:order_number>/razorpay/', RazorpayOrderCreateAPIView.as_view(), name='orders-razorpay-create'),
    path('orders/razorpay/verify/', RazorpayPaymentVerifyAPIView.as_view(), name='orders-razorpay-verify'),
    path("orders/<str:order_number>/track/", OrderTrackingAPIView.as_view(), name="order-track"),

    # 🏠 Shipping Address APIs
    path('shipping-addresses/', ShippingAddressListCreateView.as_view(), name='shipping-addresses-list-create'),
    path('shipping-addresses/<int:id>/', ShippingAddressRetrieveUpdateDestroyView.as_view(), name='shipping-addresses-detail'),

   # Return request flows
    path("returns/create/", ReturnRequestCreateAPIView.as_view(), name="return-create"),
    path("returns/", ReturnRequestListAPIView.as_view(), name="return-list"),
    path("returns/<int:returnId>/", ReturnRequestDetailAPIView.as_view(), name="return-detail"),
    path("refund-status/<str:order_number>/", RefundStatusAPIView.as_view(), name="refund-status"),

    # Replacement request flows
    path("replacements/create/", ReplacementRequestCreateAPIView.as_view(), name="replacement-create"),
    path("replacements/", ReplacementRequestListAPIView.as_view(), name="replacement-list"),
    path("replacements/<int:pk>/", ReplacementRequestDetailAPIView.as_view(), name="replacement-detail"),
    path("replacements/<int:pk>/update/", ReplacementRequestUpdateAPIView.as_view(), name="replacement-update"),
    
    # Admin actions
    path("admin/returns/bulk-update/", ReturnRequestBulkUpdateAPIView.as_view(), name="return-request-bulk-update"),
    path('admin/returns/refund/', ReturnRequestRefundAPIView.as_view(), name='return-refund'),
    
    path("orders/<str:order_number>/generate-labels/", GenerateDelhiveryLabelsAPIView.as_view(), name="generate-item-label"),


    path("apply-commission-cron/", apply_commission_cron),
]