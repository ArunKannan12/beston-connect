from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated,IsAdminUser
from accounts.permissions import IsInvestorOrAdmin,IsAdmin
from .utils import create_sale_shares_for_investment,generate_product_sale_shares
from datetime import datetime
from rest_framework.exceptions import PermissionDenied
from .models import (Investment,
                     Investor,
                     InvestorWallet,
                     Payout,
                     ProductSaleShare,InvestmentPayment
                     )
from .serializers import (InvestmentSerializer,
                        InvestorSerializer,
                        InvestorWalletSerializer,
                        PayoutSerializer,
                        ProductSaleShareSerializer
                        )
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum
import razorpay
from django.conf import settings
from datetime import timezone

class InvestorListCreateAPIView(generics.ListCreateAPIView):
    permission_classes=[IsAuthenticated,IsInvestorOrAdmin]
    serializer_class=InvestorSerializer

    def get_queryset(self):
        user=self.request.user
        if user.is_staff or user.role == 'admin':
            return Investor.objects.all()
        return Investor.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        user = self.request.user
        if Investor.objects.filter(user=user).exists():
            raise ValidationError({'detail': 'Investor already exists'})
        serializer.save(user=user)

    
class InvestorDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes=[IsAuthenticated,IsInvestorOrAdmin]
    serializer_class=InvestorSerializer

    def get_queryset(self):
        user=self.request.user
        if user.is_staff or user.role == 'admin':
            return Investor.objects.all()
        return Investor.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        user=self.request.user
        if not (user.is_staff or user.role =='admin'):
            raise PermissionDenied('Only admins are allowed to update investor profiles.')

        serializer.save()
    
    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_staff or user.role == 'admin'):
            raise PermissionDenied('Only admin can delete')
        instance.delete()



class InvestmentListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsInvestorOrAdmin]
    serializer_class = InvestmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff and user.role == 'admin':
            return Investment.objects.all()
        return Investment.objects.filter(investor__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        try:
            investor = Investor.objects.get(user=user)
        except Investor.DoesNotExist:
            raise ValidationError("No investor found for this user.")
        serializer.save(investor=investor,confirmed=False)



class InvestmentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated,IsInvestorOrAdmin]
    serializer_class = InvestmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'admin':
            return Investment.objects.all()
        return Investment.objects.filter(investor__user=user)
    
    def perform_update(self, serializer):
        user = self.request.user
        data=self.request.data
        amount=data.get('amount')
        instance=serializer.instance

        if instance.confirmed and amount:
            raise PermissionDenied('confirmed amount cannot be updated')
        
        if 'confirmed' in data and not (user.is_staff or getattr(user, 'role', None) == 'admin'):
            raise PermissionDenied("Only admin can change the confirmed status.")
        
        updated_investment=serializer.save()

        if not instance.confirmed and updated_investment.confirmed:
            create_sale_shares_for_investment(updated_investment)

             
    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff:
            raise PermissionDenied("Only admins can delete investments.")
        instance.delete()

class InvestmentSummaryDetailedAPIView(APIView):
    permission_classes=[IsInvestorOrAdmin]

    def get(self,request):
        user=request.user

        if user.is_staff or getattr(user,'role','') == 'admin':
            confirmed=Investment.objects.filter(confirmed=True)
            pending=Investment.objects.filter(confirmed=False)
        else:
            try:
                investor=Investor.objects.get(user=user)
            except Investor.DoesNotExist:
                return Response({"detail":"Investor profile not found"},status=status.HTTP_404_NOT_FOUND)
            confirmed=Investment.objects.filter(investor=investor,confirmed=True)
            pending=Investment.objects.filter(investor=investor,confirmed=False)
        
        return Response({
                   "confirmed_total": sum(i.amount for i in confirmed),
                   "pending_total": sum(i.amount for i in pending),
                   "confirmed_investments": InvestmentSerializer(confirmed, many=True).data,
                   "pending_investments": InvestmentSerializer(pending, many=True).data
               })  
class ProductSaleShareListAPIView(generics.ListAPIView):
    permission_classes=[IsInvestorOrAdmin]
    serializer_class=ProductSaleShareSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user,'role','')== 'admin':
            return ProductSaleShare.objects.all()
        return ProductSaleShare.objects.filter(investor__user=user)

    
class PayoutListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsInvestorOrAdmin]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Payout.objects.all()
        return Payout.objects.filter(investor__user=user)

    def perform_create(self, serializer):
        user=self.request.user
        investor=Investor.objects.get(user=user)
        serializer.save(investor=investor)

class PayoutDetailUpdateAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsInvestorOrAdmin]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            return Payout.objects.all()
        return Payout.objects.filter(investor__user=user)


class InvestorWalletDetailAPIView(generics.RetrieveAPIView):
    permission_classes=[IsInvestorOrAdmin]
    serializer_class=InvestorWalletSerializer

    def get_object(self):
        user=self.request.user
        if user.is_staff or getattr(user,'role','')=='admin':
            investor_id=self.kwargs.get("investor_id")
            return InvestorWallet.objects.get(investor__id=investor_id)
        return InvestorWallet.objects.get(investor__user=user)
    

class GenerateProductSalesShareAPIView(APIView):
    permission_classes=[IsAdmin]

    def post(self,request):
        start_date=request.data.get('start_date')
        end_date=request.data.get('end_date')

        if not start_date or not end_date:
            raise ValidationError({"detail":"start date and end date are required."})
        
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError({"detail": "Invalid date format. Use YYYY-MM-DD."})

        if start > end:
            raise ValidationError({"detail": "start_date must be before end_date"})

        generate_product_sale_shares(start, end)

        return Response({
            "message": f"Product sale shares generated for period {start} to {end}."})
    

class RazorpayInvestmentOrderCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        investment_ids = request.data.get("investment_ids")

        if not investment_ids or not isinstance(investment_ids, list):
            raise ValidationError({"investment_ids": "This field is required and must be a list."})

        investments = Investment.objects.filter(id__in=investment_ids, investor__user=request.user, confirmed=False)

        if investments.count() != len(investment_ids):
            raise ValidationError("One or more investment IDs are invalid or already confirmed.")

        total_amount = sum(inv.amount for inv in investments)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        razorpay_order = client.order.create({
            "amount": int(total_amount * 100),  # Razorpay expects amount in paise
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "investment_ids": ",".join(str(inv.id) for inv in investments),
                "investor_email": request.user.email,
            }
        })

        return Response({
            "razorpay_order_id": razorpay_order['id'],
            "investment_ids": investment_ids,
            "amount": total_amount,
            "currency": "INR"
        })




class RazorpayInvestmentVerifyAPIView(APIView):
    permission_classes = [IsInvestorOrAdmin]

    def post(self, request):
        user = request.user
        data = request.data

        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_payment_id = data.get("razorpay_payment_id")
        razorpay_signature = data.get("razorpay_signature")

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            raise ValidationError("Missing Razorpay verification data.")

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

            # Step 1: Verify signature
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })

            # Step 2: Fetch order details
            order = client.order.fetch(razorpay_order_id)

            investment_ids_str = order['notes'].get("investment_ids")
            if not investment_ids_str:
                raise ValidationError("No investment IDs found in Razorpay order notes.")

            investment_ids = investment_ids_str.split(",")

            # Step 3: Find all investments (ensure they belong to the current user)
            investments = Investment.objects.filter(id__in=investment_ids, investor__user=user)

            if investments.count() != len(investment_ids):
                raise ValidationError("One or more investments not found or do not belong to you.")

            # Step 4: Save payment and confirm each investment
            for investment in investments:
                if investment.confirmed:
                    continue

                InvestmentPayment.objects.create(
                    investment=investment,
                    payment_gateway="razorpay",
                    transaction_id=razorpay_payment_id,
                    amount=investment.amount,
                    status="success",
                    paid_at=timezone.now()
                )

                investment.confirmed = True
                investment.save()

            return Response({"detail": "Investments confirmed successfully."})

        except razorpay.errors.SignatureVerificationError:
            return Response({"detail": "Invalid Razorpay signature."}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
