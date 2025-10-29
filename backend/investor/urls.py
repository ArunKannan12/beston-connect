from django.urls import path
from .views import (
    InvestorListCreateAPIView,
    InvestorDetailAPIView,
    InvestmentListCreateAPIView,
    InvestmentRetrieveUpdateDestroyAPIView,
    ProductSaleShareListAPIView,
    PayoutListCreateAPIView,
    InvestorWalletDetailAPIView,
    InvestmentSummaryDetailedAPIView,
    GenerateProductSalesShareAPIView,
    PayoutDetailUpdateAPIView,  
    RazorpayInvestmentOrderCreateAPIView,
    RazorpayInvestmentVerifyAPIView
)

urlpatterns = [
    # Investor profile
    path('investors/', InvestorListCreateAPIView.as_view(), name='investor-list-create'),
    path('investors/<int:pk>/', InvestorDetailAPIView.as_view(), name='investor-detail'),

    # Investments
    path('investments/', InvestmentListCreateAPIView.as_view(), name='investment-list-create'),
    path('investments/<int:pk>/', InvestmentRetrieveUpdateDestroyAPIView.as_view(), name='investment-detail'),
    path("investments/summary/", InvestmentSummaryDetailedAPIView.as_view(), name="investment-summary"),

    # Product sales shares
    path('product-sale-shares/', ProductSaleShareListAPIView.as_view(), name='product-sale-share-list-create'),
    path("generate-product-shares/", GenerateProductSalesShareAPIView.as_view(), name="generate-product-shares"),

    # Payouts
    path('payouts/', PayoutListCreateAPIView.as_view(), name='payout-list-create'),
    path('payouts/<int:pk>/', PayoutDetailUpdateAPIView.as_view(), name='payout-detail'),  # optional

    # Wallets
    path('wallets/<int:investor_id>/', InvestorWalletDetailAPIView.as_view(), name='investor-wallet-detail'),  # Admin use
    path('wallet/', InvestorWalletDetailAPIView.as_view(), name='investor-wallet-self'),  # Investor use

    path("investment/razorpay/create-order/", RazorpayInvestmentOrderCreateAPIView.as_view(), name="investment-razorpay-create-order"),
    path("investment/razorpay/verify-payment/", RazorpayInvestmentVerifyAPIView.as_view(), name="investment-razorpay-verify"),
]
