from rest_framework.generics import CreateAPIView, RetrieveUpdateDestroyAPIView, ListCreateAPIView,RetrieveAPIView,ListAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework import status
from products.serializers import ProductVariantSerializer
from django.utils import timezone
from django.db.models import Count
from django.conf import settings
from django.db import transaction
import razorpay
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDay, TruncMonth
from django.db.models import F
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import APIException
from orders.models import *
from .models import (
                     Promoter, 
                     PromoterCommission, 
                     WithdrawalRequest, 
                     PromotedProduct, 
                     PremiumSettings,
                     CommissionLevel
                     )
from .serializers import (
                    PromoterSerializer, 
                    PromoterCommissionSerializer, 
                    CommissionLevelSerializer,
                    PremiumSettingSerializer,
                    PromotedProductSerializer,
                    PromoterLightSerializer,
                    WithdrawalRequestAdminSerializer,
                    WithdrawalRequestPromoterSerializer
                    )
from products.models import ProductVariant
from accounts.permissions import IsPromoter, IsAdminOrPromoter, IsAdmin
from django.db.models import Sum

class PromoterListAPIView(ListAPIView):
    serializer_class = PromoterLightSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    search_fields = [
        "user__email",
        "user__phone_number",
        "referral_code",
        "promoter_type",
        "bank_name",
        "account_holder_name",
    ]

    filterset_fields = [
        "promoter_type",
        "is_eligible_for_withdrawal",
    ]

    ordering_fields = [
        "submitted_at",
        'promoter_type',
        "total_sales_count",
        "total_commission_earned",
        "wallet_balance"
    ]

    
    ordering = ["-submitted_at"]  # default order

    def get_queryset(self):
        return (
            Promoter.objects
            .select_related("user")
            .prefetch_related("promoted_products")
        )

    
class BecomePromoterAPIView(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PromoterSerializer

    def create(self, request, *args, **kwargs):
        user = request.user

        # 1️⃣ Check if user is already a promoter
        if hasattr(user, 'promoter'):
            return Response(
                {
                    "detail": "You are already a promoter",
                    "promoter_profile": PromoterSerializer(
                        user.promoter,
                        context={'request':request}
                        ).data,
                    "active_role": user.active_role,
                    "roles": list(user.user_roles.values_list("role__name", flat=True)),
                },
                status=status.HTTP_200_OK,
            )
            
        # 3️⃣ Handle referral code0
        ref_code = (request.data.get('referral_code') or request.query_params.get('ref') or request.session.get('referral_code'))
        referred_by = None
        if ref_code:
            try:
                referred_by = Promoter.objects.get(referral_code=ref_code)
            except Promoter.DoesNotExist:
                referred_by = None

        # Clear session referral if used
        request.session.pop('referral_code',None)

        # 2️⃣ Assign roles
        user.assign_role("promoter", set_active=True,referred_by=referred_by)
        user.assign_role("customer")  # keep customer role assigned but not active

        
        # 5️⃣ Serialize and save updates from request
        serializer = self.get_serializer(user.promoter, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)

        return Response(
            {
                "detail": "Promoter account created successfully",
                "promoter_profile": serializer.data,
                "active_role": user.active_role,
                "roles": list(user.user_roles.values_list("role__name", flat=True)),
            },
            status=status.HTTP_201_CREATED,
        )



# --- Retrieve / Update / Delete Promoter ---
class PromoterRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    serializer_class = PromoterLightSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated, IsAdminOrPromoter]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', None) == 'admin':
            return Promoter.objects.all()
        return Promoter.objects.filter(user=user)

    def perform_update(self, serializer):
        user = self.request.user

        # Admin can update all fields
        if user.is_staff or getattr(user, "role", None) == 'admin':
            serializer.save()
            return

        # Non-admins: only update allowed fields
        allowed_fields = ['bank_account_number', 'ifsc_code', 'bank_name', 'account_holder_name', 'phone_number']
        validated_data = {k: v for k, v in serializer.validated_data.items() if k in allowed_fields}

        if not validated_data:
            raise PermissionDenied("You are not allowed to update these fields.")

        serializer.save(**validated_data)

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_staff or getattr(user, "role", None) == 'admin'):
            raise PermissionDenied('Only admins can delete promoter profiles.')
        instance.delete()


# --- Promoter Commission ---
class PromoterCommissionListCreateAPIView(ListCreateAPIView):
    serializer_class = PromoterCommissionSerializer
    permission_classes = [IsAuthenticated, IsPromoter]

    def get_queryset(self):
        return PromoterCommission.objects.filter(promoter__user=self.request.user)

    def perform_create(self, serializer):
        promoter = Promoter.objects.get(user=self.request.user)
        serializer.save(promoter=promoter)

class WithdrawalRequestListCreateAPIView(ListCreateAPIView):
    serializer_class = WithdrawalRequestPromoterSerializer
    permission_classes = [IsAuthenticated, IsPromoter]

    # ✅ Add both ordering and filtering
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']  # for filtering by status
    ordering_fields = ['requested_at', 'amount', 'status']  # for ordering
    ordering = ['-requested_at']  # default ordering

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(promoter__user=self.request.user)

    def perform_create(self, serializer):
        promoter = Promoter.objects.get(user=self.request.user)
        promoter.check_withdrawal_eligibility()

        amount = serializer.validated_data.get('amount')
        if amount is None:
            raise ValidationError('Amount is required.')

        from decimal import Decimal
        amount = Decimal(amount)

        if promoter.promoter_type != 'paid':
            raise ValidationError("Only paid promoters can request withdrawals.")
        if not promoter.is_eligible_for_withdrawal:
            raise ValidationError('You are not eligible for withdrawal yet.')
        if amount <= 0:
            raise ValidationError('Amount must be greater than 0.')
        if amount > promoter.wallet_balance:
            raise ValidationError("Withdrawal amount exceeds wallet balance.")
        if amount < promoter.MIN_WITHDRAWAL_AMOUNT:
            raise ValidationError(f"Minimum withdrawal amount is ₹{promoter.MIN_WITHDRAWAL_AMOUNT}")
        if WithdrawalRequest.objects.filter(promoter=promoter, status='pending').exists():
            raise ValidationError('You already have a pending withdrawal request. Please wait until it is reviewed.')

        serializer.save(promoter=promoter)


class CancelWithdrawalRequestAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def post(self, request, pk):
        promoter = Promoter.objects.get(user=request.user)

        try:
            withdrawal = WithdrawalRequest.objects.get(pk=pk, promoter=promoter)
        except WithdrawalRequest.DoesNotExist:
            raise ValidationError("Withdrawal request not found.")

        if withdrawal.status != "pending":
            raise ValidationError("Only pending requests can be cancelled.")

        # 🔄 If you deducted balance earlier, add it back now
        promoter.wallet_balance += withdrawal.amount
        promoter.save()

        withdrawal.status = "cancelled"
        withdrawal.cancelled_at = timezone.now()
        withdrawal.save()

        return Response({"message": "Withdrawal request cancelled successfully."}, status=status.HTTP_200_OK)

class WithdrawalRequestAdminListAPIView(ListAPIView):
    queryset = WithdrawalRequest.objects.all().order_by("-requested_at")
    serializer_class = WithdrawalRequestAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    filter_backends=[DjangoFilterBackend,filters.SearchFilter,filters.OrderingFilter]

    filterset_fields=[
        'status',
        'promoter'
    ]

    search_fields=[
        'promoter__user__first_name',
        'promoter__user__last_name',
        'promoter__user__email'
    ]

    ordering_fields=['requested_at','amount']

class WithdrawalRequestRetrieveAPIView(RetrieveAPIView):
    serializer_class = WithdrawalRequestPromoterSerializer
    permission_classes = [IsAuthenticated, IsPromoter]

    def get_queryset(self):
        # Only allow this promoter to access their own requests
        return WithdrawalRequest.objects.filter(
            promoter__user=self.request.user
        )

class WithdrawalRequestAdminRetrieveAPIView(RetrieveAPIView):
    queryset = WithdrawalRequest.objects.all()
    serializer_class = WithdrawalRequestAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class WithdrawalApproveAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
        note = request.data.get("admin_note", "")
        withdrawal.approve(note=note)
        return Response({"status": withdrawal.status}, status=status.HTTP_200_OK)


class WithdrawalRejectAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
        note = request.data.get("admin_note", "")
        withdrawal.reject(note=note)
        return Response({"status": withdrawal.status}, status=status.HTTP_200_OK)


class WithdrawalProcessingAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
        note = request.data.get("admin_note", "")
        withdrawal.mark_processing(note=note)
        return Response({"status": withdrawal.status}, status=status.HTTP_200_OK)


class WithdrawalCompleteAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
        note = request.data.get("admin_note", "")
        withdrawal.mark_completed(note=note)
        return Response({"status": withdrawal.status}, status=status.HTTP_200_OK)


class WithdrawalFailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
        note = request.data.get("admin_note", "")
        withdrawal.mark_failed(note=note)
        return Response({"status": withdrawal.status}, status=status.HTTP_200_OK)

# --- Premium Upgrade ---
class BecomePremiumPromoterAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            promoter = Promoter.objects.get(user=user)
        except Promoter.DoesNotExist:
            return Response(
                {"detail": "You are not a promoter yet."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if promoter.promoter_type == 'paid':
            return Response(
                {"detail": "You are already a premium promoter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the latest active premium settings
        premium = PremiumSettings.objects.filter(active=True).order_by('-updated_at').first()
        if not premium:
            return Response(
                {"detail": "Premium amount not set by admin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use current_amount which accounts for active offers
        amount_to_charge = premium.current_amount

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        payment_amount_paise = int(amount_to_charge * 100)  # convert to paise

        order_data = {
            "amount": payment_amount_paise,
            "currency": "INR",
            "receipt": f"premium_promoter_{promoter.id}_{timezone.now().timestamp()}",
            "payment_capture": 1
        }

        razorpay_order = client.order.create(data=order_data)

        return Response({
            "razorpay_order_id": razorpay_order["id"],
            "amount": amount_to_charge,
            "currency": "INR",
            "promoter_id": promoter.id
        }, status=status.HTTP_200_OK)

class VerifyPremiumPaymentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            promoter = Promoter.objects.get(user=user)
        except Promoter.DoesNotExist:
            return Response({"detail": "Promoter not found"}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        required_fields = ["razorpay_payment_id", "razorpay_order_id", "razorpay_signature"]
        if not all(field in data for field in required_fields):
            return Response({"detail": "Incomplete payment data"}, status=status.HTTP_400_BAD_REQUEST)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data["razorpay_order_id"],
                'razorpay_payment_id': data["razorpay_payment_id"],
                'razorpay_signature': data["razorpay_signature"]
            })
        except razorpay.errors.SignatureVerificationError:
            return Response({"detail": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        # Payment successful → upgrade promoter
        promoter.promoter_type = 'paid'
        promoter.premium_activated_at = timezone.now()
        promoter.save()

        return Response({"detail": "Promoter upgraded to premium!"}, status=status.HTTP_200_OK)

class PremiumSettingsCreateAPIView(CreateAPIView):
    queryset = PremiumSettings.objects.all()
    serializer_class = PremiumSettingSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        if PremiumSettings.objects.exists():
            return Response({'detail':'Only one premium settings record is allowed'},status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)
    
class PremiumSettingsRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    queryset = PremiumSettings.objects.all()
    serializer_class = PremiumSettingSerializer
    permission_classes = [IsAdmin]

class CommissionLevelListCreateAPIView(ListCreateAPIView):
    queryset = CommissionLevel.objects.all()
    serializer_class = CommissionLevelSerializer
    permission_classes = [IsAdmin] 

class CommissionLevelDetailAPIView(RetrieveUpdateDestroyAPIView):
    queryset = CommissionLevel.objects.all()
    serializer_class = CommissionLevelSerializer
    permission_classes = [IsAdmin]

# --- Promoter Products ---
class PromoterProductsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]
    serializer_class = PromotedProductSerializer

    def get(self, request):
        promoter = request.user.promoter
        products = PromotedProduct.objects.filter(promoter=promoter)
        serializer = PromotedProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        promoter = request.user.promoter
        variant_ids = request.data.get('product_variant_ids', [])

        if not variant_ids:
            return Response({"detail": "No product_variant_ids provided"}, status=status.HTTP_400_BAD_REQUEST)

        promoted_products = []
        invalid_ids = []

        for vid in variant_ids:
            try:
                variant = ProductVariant.objects.get(id=vid)
            except ProductVariant.DoesNotExist:
                invalid_ids.append(vid)
                continue

            obj, created = PromotedProduct.objects.get_or_create(
                promoter=promoter,
                product_variant=variant,
                defaults={'is_active': True}
            )
            promoted_products.append(obj)

        data = {
            "created": PromotedProductSerializer(promoted_products, many=True, context={'request': request}).data
        }
        if invalid_ids:
            data["invalid_ids"] = invalid_ids

        return Response(data, status=status.HTTP_201_CREATED)

class PremiumAmountAPIView(APIView):
    def get(self, request):
        premium = PremiumSettings.objects.filter(active=True).order_by('-updated_at').first()
        if not premium:
            return Response({'detail': 'Premium settings not configured'}, status=status.HTTP_400_BAD_REQUEST)
        
        now = timezone.now()
        offer_valid_now = (
            premium.offer_active 
            and premium.offer_amount is not None
            and premium.offer_start
            and premium.offer_end
            and premium.offer_start <= now <= premium.offer_end
        )

        return Response({
            "id": premium.id,
            "amount": premium.current_amount,        # effective amount (offer or normal)
            "original_amount": premium.amount,       # normal amount
            "offer_active": premium.offer_active,    # checkbox value
            "offer_valid_now": offer_valid_now,      # currently valid?
            "offer_amount": premium.offer_amount,
            "offer_start": premium.offer_start,
            "offer_end": premium.offer_end,
        })


from rest_framework.exceptions import NotFound   
class PromoterMeAPIView(RetrieveAPIView):
    permission_classes = [IsPromoter]

    def get(self, request, *args, **kwargs):
        user = request.user
        try:
            promoter = getattr(user, "promoter", None)
            if not promoter:
                raise NotFound("You are not registered as a promoter")

            from .serializers import PromoterSerializer
            serializer = PromoterSerializer(promoter, context={"request": request})

            data = {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "active_role": user.active_role,
                    "roles": list(user.user_roles.values_list("role__name", flat=True)),
                },
                "promoter_profile": serializer.data,
            }

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            raise APIException(detail=str(e))


class UnpaidPromoterDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def get(self, request):
        promoter = request.user.promoter

        if promoter.promoter_type != "unpaid":
            return Response(
                {"detail": "Only unpaid promoters can access this dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Total promoted products
        promoted_products = PromotedProduct.objects.filter(promoter=promoter).count()

        # Total referrals (Order items via promoter)
        item_qs = OrderItem.objects.filter(promoter=promoter)
        total_referrals = item_qs.count()

        # Successful delivered orders
        successful_orders = (
            item_qs.filter(order__status="delivered")
            .values("order")
            .distinct()
            .count()
        )

        # Cancelled orders
        cancelled_orders = (
            item_qs.filter(order__status="cancelled")
            .values("order")
            .distinct()
            .count()
        )

        # Total revenue generated
        total_revenue = (
            item_qs.aggregate(total=Sum(F("price") * F("quantity")))
        )["total"] or 0

        # Unique customers
        unique_customers = (
            item_qs.values("order__user").distinct().count()
        )

        # Latest 5 orders referred
        latest_orders = (
            item_qs.values("order__id", "order__created_at")
            .annotate(total_items=Count("id"))
            .order_by("-order__created_at")[:5]
        )

        # -----------------------------
        # 📊 GRAPH DATA
        # -----------------------------

        # 1️⃣ Daily referral sales (line graph)
        daily_referrals = (
            item_qs
            .annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        # 2️⃣ Daily revenue graph
        daily_revenue = (
            item_qs
            .annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(amount=Sum(F("price") * F("quantity")))
            .order_by("day")
        )

        # 3️⃣ Monthly revenue (bar graph)
        monthly_revenue = (
            item_qs
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum(F("price") * F("quantity")))
            .order_by("month")
        )

        return Response({
            "promoted_products": promoted_products,
            "total_referrals": total_referrals,
            "successful_orders": successful_orders,
            "cancelled_orders": cancelled_orders,
            "total_revenue_generated": total_revenue,
            "unique_customers": unique_customers,
            "latest_referred_orders": list(latest_orders),

            # 📊 GRAPH DATA
            "daily_referrals_graph": list(daily_referrals),
            "daily_revenue_graph": list(daily_revenue),
            "monthly_revenue_graph": list(monthly_revenue),
        })

class AvailableProductsForPromotionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def get(self, request):
        promoter = request.user.promoter

        # Already promoted product IDs
        promoted_ids = PromotedProduct.objects.filter(promoter=promoter)\
                                              .values_list("product_variant_id", flat=True)
        available_variants = ProductVariant.objects.exclude(id__in=promoted_ids)

        serializer = ProductVariantSerializer(
            available_variants, many=True, context={"request": request}
        )

        data = []
        is_paid = promoter.promoter_type == "paid"
        now = timezone.now()
        last_30_days = now - timedelta(days=30)

        for variant_data, variant in zip(serializer.data, available_variants):
            if is_paid:
                # --- Commission ---
                commission_rate = getattr(variant, 'promoter_commission_rate', 5)  # default 5%
                potential_commission = float(variant.final_price) * (commission_rate / 100)

                # --- Projected earnings based on last 30 days sales ---
                total_sales_30d = OrderItem.objects.filter(
                    product_variant=variant,
                    order__status='delivered',
                    order__created_at__gte=last_30_days
                ).aggregate(total=Sum('quantity'))['total'] or 0
                projected_earning = potential_commission * total_sales_30d

                # --- Badges ---
                total_sales_all_time = OrderItem.objects.filter(
                    product_variant=variant,
                    order__status='delivered'
                ).aggregate(total=Sum('quantity'))['total'] or 0

                top_selling_badge = total_sales_all_time >= 100
                trending_badge = total_sales_30d >= 20
                new_arrival_badge = (timezone.now() - variant.created_at).days <= 30
               
                variant_data.update({
                    "potential_commission": round(potential_commission, 2),
                    "projected_earning": round(projected_earning, 2),
                    "top_selling_badge": top_selling_badge,
                    "trending_badge": trending_badge,
                    "new_arrival_badge": new_arrival_badge,
                    
                })

            # Everyone can see stock info
            variant_data["stock_available"] = getattr(variant, 'stock', 0)

            data.append(variant_data)

        return Response(data)


class PaidPromoterDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def get(self, request):
        promoter = request.user.promoter

        if promoter.promoter_type != "paid":
            return Response(
                {"detail": "Only paid promoters can access this dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()
        last_30_days = now - timedelta(days=30)

        commissions = PromoterCommission.objects.filter(promoter=promoter)
        withdrawals = WithdrawalRequest.objects.filter(promoter=promoter)
        order_items = OrderItem.objects.filter(promoter=promoter)

        # --- COMMISSION ---
        total_commission = commissions.aggregate(total=Sum("amount"))["total"] or 0
        commission_last_30_days = commissions.filter(created_at__gte=last_30_days)\
                                             .aggregate(total=Sum("amount"))["total"] or 0
        pending_commission = commissions.filter(status="pending")\
                                       .aggregate(total=Sum("amount"))["total"] or 0
        paid_commission = commissions.filter(status="paid")\
                                     .aggregate(total=Sum("amount"))["total"] or 0

        # --- WALLET ---
        wallet_balance = promoter.wallet_balance
        pending_withdrawals_amount = withdrawals.filter(status="pending")\
                                                .aggregate(total=Sum("amount"))["total"] or 0
        total_withdrawn = withdrawals.filter(
            status__in=["approved", "processing", "completed"]
        ).aggregate(total=Sum("amount"))["total"] or 0
        withdrawable_balance = max(wallet_balance - pending_withdrawals_amount, 0)

        # --- PERFORMANCE ---
        promoted_products = PromotedProduct.objects.filter(promoter=promoter).count()
        total_referrals = order_items.count()
        successful_orders = (
            order_items.filter(order__status="delivered")
            .values("order").distinct().count()
        )

        # --- RECENT ACTIVITY ---
        recent_commissions = commissions.order_by("-created_at")\
                                        .values("amount", "created_at", "status")[:5]

        recent_withdrawals = withdrawals.order_by("-requested_at")\
                                        .values("amount", "requested_at", "status")[:5]

        return Response({
            # Earnings
            "total_commission": total_commission,
            "commission_last_30_days": commission_last_30_days,
            "pending_commission_amount": pending_commission,
            "paid_commission_amount": paid_commission,

            # Wallet
            "wallet_balance": wallet_balance,
            "pending_withdrawals_amount": pending_withdrawals_amount,
            "total_withdrawn": total_withdrawn,
            "withdrawable_balance": withdrawable_balance,

            # Performance
            "promoted_products": promoted_products,
            "total_referrals": total_referrals,
            "successful_orders": successful_orders,

            # Recent Activity
            "recent_commissions": list(recent_commissions),
            "recent_withdrawals": list(recent_withdrawals),
        })


class PromoterWalletSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def get(self, request):
        promoter = request.user.promoter

        if promoter.promoter_type != "paid":
            raise PermissionDenied("Only paid promoters can access wallet info.")

        total_earned = (
            PromoterCommission.objects.filter(promoter=promoter)
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        total_withdrawn = (
            WithdrawalRequest.objects.filter(
                promoter=promoter,
                status__in=["approved", "processing", "completed"]
            ).aggregate(total=Sum("amount"))["total"] or 0
        )
        pending_withdrawals = (
            WithdrawalRequest.objects.filter(promoter=promoter, status="pending")
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        withdrawable_balance = max(promoter.wallet_balance - pending_withdrawals, 0)
        recent_commissions = PromoterCommission.objects.filter(
            promoter=promoter).order_by('-created_at')[:5].values('amount', 'created_at', 'status')

        recent_withdrawals = WithdrawalRequest.objects.filter(
            promoter=promoter).order_by('-requested_at')[:5].values('amount', 'requested_at', 'status')

        return Response({
            "total_earned": total_earned,
            "total_withdrawn": total_withdrawn,
            "available_balance": promoter.wallet_balance,
            "pending_withdrawals": pending_withdrawals,
            "withdrawable_balance": withdrawable_balance,
            "recent_commissions": list(recent_commissions),
            "recent_withdrawals": list(recent_withdrawals),
        })


class PromoterPerformanceAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPromoter]

    def get(self, request):
        promoter = request.user.promoter

        monthly_data = (
            PromoterCommission.objects.filter(promoter=promoter)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )

        return Response(monthly_data)



# class PromoteProductAPIView(APIView):
#     permission_classes=[IsPromoter]

#     def post(self,request):
#         promoter=request.user.promoter
#         product_variant_id=request.data.get('product_variant_id')
#         if not product_variant_id:
#             return Response({'detail':'product_variant_id required'},status=status.HTTP_400_BAD_REQUEST)
#         if PromotedProduct.objects.filter(promoter=promoter,product_variant_id=product_variant_id).exists():
#             return Response({'detail':'Already promoting this product'},status=status.HTTP_400_BAD_REQUEST)
#         PromotedProduct.objects.create(promoter=promoter ,product_variant_id=product_variant_id)
#         return Response({'detail':'Product added for promotion successfully!'})
    
class PromotedProductListAPIView(APIView):
    permission_classes = [IsPromoter]

    def get(self, request):
        promoter = request.user.promoter
        promoted = PromotedProduct.objects.filter(promoter=promoter, is_active=True)
        serializer = PromotedProductSerializer(promoted, many=True, context={'request': request})
        return Response(serializer.data)

class RegisterPromoterClickAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        referral_code = request.data.get('referral_code')
        product_variant_id = request.data.get('product_variant_id')

        # Validate required fields
        if not referral_code or not product_variant_id:
            return Response(
                {"detail": "referral_code and product_variant_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find promoter
        promoter = get_object_or_404(Promoter, referral_code=referral_code)

        # Ensure promoter actually promotes this variant
        promoted_product = PromotedProduct.objects.select_for_update().filter(
            promoter=promoter,
            product_variant_id=product_variant_id
        ).first()

        if not promoted_product:
            return Response(
                {"detail": "This product is not promoted by this promoter"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atomic increment
        promoted_product.click_count = F("click_count") + 1
        promoted_product.save(update_fields=["click_count"])
        promoted_product.refresh_from_db(fields=["click_count"])

        # Calculate total clicks for the promoter
        total_clicks = PromotedProduct.objects.filter(promoter=promoter).aggregate(
            total=Sum("click_count")
        )["total"] or 0

        return Response({
            "detail": "Click registered",
            "product_clicks": promoted_product.click_count,
            "total_clicks": total_clicks
        })
    
# views.py
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class PincodeServiceabilityView(APIView):
    """
    Checks if a given pincode is serviceable via Delhivery API.
    """

    def get(self, request, pin):
        delhivery_url = f"https://track.delhivery.com/c/api/pin-codes/json/?filter_codes={pin}"
        headers = {
            "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
            "Accept": "application/json",
        }

        try:
            response = requests.get(delhivery_url, headers=headers, timeout=5)
            if response.status_code != 200:
                return Response(
                    {
                        "error": "Delhivery API error",
                        "status_code": response.status_code,
                        "details": response.text,
                    },
                    status=response.status_code,
                )

            data = response.json()
            return Response(data, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": "Failed to connect to Delhivery", "details": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ValueError:
            return Response(
                {"error": "Invalid JSON response from Delhivery"},
                status=status.HTTP_502_BAD_GATEWAY,
            )