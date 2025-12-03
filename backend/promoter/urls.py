# promoter/urls.py
from django.urls import path
from .views import (
    BecomePromoterAPIView,
    PromoterRetrieveUpdateDestroyAPIView,
    PromoterCommissionListCreateAPIView,
    WithdrawalRequestListCreateAPIView,
    WithdrawalRequestAdminManageView,
    BecomePremiumPromoterAPIView,
    VerifyPremiumPaymentAPIView,
    PromoterProductsAPIView,
    PremiumAmountAPIView,
    PromoterMeAPIView,
    UnpaidPromoterDashboardAPIView,
    AvailableProductsForPromotionAPIView,
    PaidPromoterDashboardAPIView,
    PromoterWalletSummaryAPIView,
    PromoterPerformanceAnalyticsAPIView,
    RegisterPromoterClickAPIview,
    PromoteProductAPIView,
    PromotedProductListAPIView,
     PincodeServiceabilityView,
     RegisterPromoterClickAPIView,

)

urlpatterns = [
    # 📄 Promoter Management
    path('promoters/', BecomePromoterAPIView.as_view(), name='promoter-list-create'),
    path('promoters/<int:id>/', PromoterRetrieveUpdateDestroyAPIView.as_view(), name='promoter-detail'),

    # 💰 Promoter Commissions
    path('promoter/commissions/', PromoterCommissionListCreateAPIView.as_view(), name='promoter-commission-list-create'),

    # 🏦 Withdrawal Requests
    path('promoter/withdrawals/', WithdrawalRequestListCreateAPIView.as_view(), name='promoter-withdrawal-list-create'),
    path('promoter/withdrawals/<int:pk>/manage/', WithdrawalRequestAdminManageView.as_view(), name='promoter-withdrawal-admin-manage'),

    # ⭐ Premium Promoter Flow
    path('promoter/become-premium/', BecomePremiumPromoterAPIView.as_view(), name='promoter-become-premium'),
    path('promoter/verify-premium-payment/', VerifyPremiumPaymentAPIView.as_view(), name='promoter-verify-premium-payment'),

    # 📦 Promoted Products
    path('promote/multiple-products/', PromoterProductsAPIView.as_view(), name='promoter-products'),

    path('promoter/premium-amount/', PremiumAmountAPIView.as_view(), name='promoter-premium-amount'),
    
     path("promoters/me/", PromoterMeAPIView.as_view(), name="promoter-me"),

    path("unpaid/dashboard/", UnpaidPromoterDashboardAPIView.as_view(), name="unpaid-promoter-dashboard"),
    path("available-products/", AvailableProductsForPromotionAPIView.as_view(), name="available-products-for-promotion"),

    # Paid promoter dashboard
    path("paid/dashboard/", PaidPromoterDashboardAPIView.as_view(), name="paid-promoter-dashboard"),
    path("paid/wallet-summary/", PromoterWalletSummaryAPIView.as_view(), name="promoter-wallet-summary"),
    path("paid/performance-analytics/", PromoterPerformanceAnalyticsAPIView.as_view(), name="promoter-performance-analytics"),

    # Register click (public endpoint)
    path("promote/products", PromoteProductAPIView.as_view(), name="promote-product"),
    path("promoted-products/", PromotedProductListAPIView.as_view(), name="promoted-products"),
    path("click/register/", RegisterPromoterClickAPIview.as_view(), name="register-click"),
    path("promoter/register-click/", RegisterPromoterClickAPIView.as_view(), name=""),
    path("check-pincode/<str:pin>/", PincodeServiceabilityView.as_view(), name="check_pincode"),
]