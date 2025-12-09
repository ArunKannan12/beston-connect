# promoter/urls.py
from django.urls import path
from .views import (
    BecomePromoterAPIView,
    PromoterRetrieveUpdateDestroyAPIView,
    PromoterCommissionListCreateAPIView,
    WithdrawalRequestListCreateAPIView,
    WithdrawalApproveAPIView,
    WithdrawalCompleteAPIView,
    WithdrawalFailAPIView,
    WithdrawalProcessingAPIView,
    WithdrawalRejectAPIView,
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
    # PromoteProductAPIView,
    PromotedProductListAPIView,
    PincodeServiceabilityView,
    RegisterPromoterClickAPIView,
    PremiumSettingsCreateAPIView,
    PremiumSettingsRetrieveUpdateDestroyAPIView,
    CommissionLevelListCreateAPIView,
    CommissionLevelDetailAPIView,
    PromoterListAPIView,
    WithdrawalRequestAdminListAPIView,
    CancelWithdrawalRequestAPIView,
    WithdrawalRequestRetrieveAPIView,
    WithdrawalRequestAdminRetrieveAPIView

)

urlpatterns = [
    # 📄 Promoter Management
    path('promoters/', BecomePromoterAPIView.as_view(), name='promoter-list-create'),
    path('admin/promoters-list/', PromoterListAPIView.as_view(), name='promoter-list'),
    path('promoters/<int:id>/', PromoterRetrieveUpdateDestroyAPIView.as_view(), name='promoter-detail'),

    # 💰 Promoter Commissions
    path('promoter/commissions/', PromoterCommissionListCreateAPIView.as_view(), name='promoter-commission-list-create'),

    # 🏦 Withdrawal Requests
    path('promoter/withdrawals/', WithdrawalRequestListCreateAPIView.as_view(), name='promoter-withdrawal-list-create'),
    path("promoter/withdrawals/<int:pk>/cancel/",CancelWithdrawalRequestAPIView.as_view(),name="cancel-withdrawal"),
    path("promoter/withdrawals/<int:pk>/",WithdrawalRequestRetrieveAPIView.as_view(),name="withdrawal-request-detail"),
    path("admin/promoter-withdrawal-requests/<int:pk>/",WithdrawalRequestAdminRetrieveAPIView.as_view(),name="admin-withdrawal-request-detail"),
    path("admin/promoter-withdrawal-requests/", WithdrawalRequestAdminListAPIView.as_view(), name="admin-promoter-withdrawal-requests"),
    path('admin/promoter-withdrawal-requests/<int:pk>/approve/', WithdrawalApproveAPIView.as_view()),
    path('admin/promoter-withdrawal-requests/<int:pk>/reject/', WithdrawalRejectAPIView.as_view()),
    path('admin/promoter-withdrawal-requests/<int:pk>/processing/', WithdrawalProcessingAPIView.as_view()),
    path('admin/promoter-withdrawal-requests/<int:pk>/complete/', WithdrawalCompleteAPIView.as_view()),
    path('admin/promoter-withdrawal-requests/<int:pk>/fail/', WithdrawalFailAPIView.as_view()),

    # ⭐ Premium Promoter Flow
    path('promoter/become-premium/', BecomePremiumPromoterAPIView.as_view(), name='promoter-become-premium'),
    path('promoter/verify-premium-payment/', VerifyPremiumPaymentAPIView.as_view(), name='promoter-verify-premium-payment'),

    # 📦 Promoted Products
    path('promote/multiple-products/', PromoterProductsAPIView.as_view(), name='promoter-products'),

    path('promoter/premium-amount/', PremiumAmountAPIView.as_view(), name='promoter-premium-amount'),
    path("admin/promoter/create-premium-amt/", PremiumSettingsCreateAPIView.as_view(), name="premium-list-create"),
    path("admin/promoter/edit-premium-amt/<int:pk>/", PremiumSettingsRetrieveUpdateDestroyAPIView.as_view(), name="premium-detail"),
    path("promoters/me/", PromoterMeAPIView.as_view(), name="promoter-me"),

    path('commission-levels/', CommissionLevelListCreateAPIView.as_view(), name='commission-level-list-create'),
    path('commission-levels/<int:pk>/', CommissionLevelDetailAPIView.as_view(), name='commission-level-detail'),

    path("unpaid/dashboard/", UnpaidPromoterDashboardAPIView.as_view(), name="unpaid-promoter-dashboard"),
    path("available-products/", AvailableProductsForPromotionAPIView.as_view(), name="available-products-for-promotion"),

    # Paid promoter dashboard
    path("paid/dashboard/", PaidPromoterDashboardAPIView.as_view(), name="paid-promoter-dashboard"),
    path("paid/wallet-summary/", PromoterWalletSummaryAPIView.as_view(), name="promoter-wallet-summary"),
    path("paid/performance-analytics/", PromoterPerformanceAnalyticsAPIView.as_view(), name="promoter-performance-analytics"),

    # Register click (public endpoint)
    # path("promote/products", PromoteProductAPIView.as_view(), name="promote-product"),
    path("promoted-products/", PromotedProductListAPIView.as_view(), name="promoted-products"),
    path("promoter/register-click/",RegisterPromoterClickAPIView.as_view(),name="promoter-register-click"),
    path("check-pincode/<str:pin>/", PincodeServiceabilityView.as_view(), name="check_pincode"),
]