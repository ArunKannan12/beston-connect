# views.py
from django.conf import settings
from django.utils import timezone
from rest_framework.generics import CreateAPIView, UpdateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework import status
from django.shortcuts import get_object_or_404
from decimal import Decimal
from django.db import transaction
from .signals import send_multichannel_notification
from .models import ReturnRequest, ReplacementRequest, Order, OrderStatus, OrderItem,Refund,ReturnRecoveryAccount,ReturnRecoveryTransaction
from .returnReplacementSerializer import ReturnRequestSerializer, ReplacementRequestSerializer
from accounts.permissions import IsCustomer, IsAdmin, IsAdminOrCustomer
from .utils import process_refund, check_refund_status,create_reverse_pickup,get_delhivery_return_charge,apply_return_recovery
from rest_framework.generics import CreateAPIView, UpdateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.generics import CreateAPIView, UpdateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
# -------------------- RETURN REQUEST CREATE --------------------
class ReturnRequestCreateAPIView(CreateAPIView):
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        """
        Customer creates a return request.
        Initially set to 'pending'. Pickup will be triggered only after admin approval.
        """
        return_request = serializer.save(user=self.request.user, status="pending")
        return_request.save(update_fields=["status"])
        return return_request


# -------------------- RETURN REQUEST UPDATE (ADMIN ONLY) --------------------
class ReturnRequestUpdateAPIView(UpdateAPIView):
    queryset = ReturnRequest.objects.all()
    serializer_class = ReturnRequestSerializer
    lookup_field = "id"
    lookup_url_kwarg = "returnId"

    def get_permissions(self):
        role = getattr(self.request.user, "role", None)
        if role == "admin":
            return [IsAdmin()]
        elif role == "customer":
            return [IsCustomer()]
        return super().get_permissions()

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        role = getattr(user, "role", None)

        # 🚫 Customers cannot modify once submitted
        if role == "customer":
            raise PermissionDenied("Customers cannot update return requests once created.")

        # 🟢 Admin actions
        elif role == "admin":
            status_choice = self.request.data.get("status")

            if status_choice not in ["pickup_scheduled", "rejected"]:
                raise ValidationError({"status": "Must be 'pickup_scheduled' or 'rejected'."})

            instance.admin_processed_at = timezone.now()

            # 🟢 PICKUP SCHEDULED
            if status_choice == "pickup_scheduled":
                # Prevent duplicate pickups
                if instance.status in ["pickup_scheduled", "picked_up", "in_transit"]:
                    raise ValidationError({"detail": "Pickup already scheduled or in progress."})

                try:
                    pickup_data = create_reverse_pickup(
                        instance)

                    if pickup_data.get("success"):
                        instance.waybill = pickup_data["waybill"]
                        instance.status = "pickup_scheduled"
                        instance.pickup_date = timezone.now()
                        instance.save(update_fields=["waybill", "status", "pickup_date", "admin_processed_at"])
                    else:
                        instance.status = "pickup_failed"
                        instance.admin_comment = "Delhivery pickup creation failed."
                        instance.save(update_fields=["status", "admin_comment", "admin_processed_at"])
                        raise ValidationError({"pickup": "Reverse pickup creation failed."})

                    

                except Exception as e:
                    instance.admin_comment = f"Reverse pickup creation failed: {str(e)}"
                    instance.status = "pickup_failed"
                    instance.save(update_fields=["admin_comment", "status", "admin_processed_at"])
                    raise ValidationError({"error": str(e)})

            # 🔴 REJECTED
            else:
                instance.status = "rejected"
                instance.save(update_fields=["status", "admin_processed_at"])

                

        else:
            raise PermissionDenied("You do not have permission to update this return request.")

class ReturnRequestRefundAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, return_id):
        try:
            rr = ReturnRequest.objects.get(id=return_id)
        except ReturnRequest.DoesNotExist:
            return Response({'error': 'Return request not found'}, status=404)

        # --- Basic Validations ---
        if not rr.order.is_paid:
            return Response({'error': 'Cannot refund an unpaid order'}, status=400)

        if rr.order.payment_method.lower() != "razorpay":
            return Response({'error': 'Only Razorpay refunds supported'}, status=400)

        if not rr.order.razorpay_payment_id:
            return Response({'error': 'Missing Razorpay payment ID'}, status=400)

        if not rr.refund_amount or Decimal(rr.refund_amount) <= 0:
            return Response({'error': 'Invalid refund amount'}, status=400)

        refund_already_done = (rr.status == "refunded")

        # --- Compute Correct Delhivery Reverse Charge ---
        correct_weight = rr.order_item.product_variant.get_weight_in_grams() * rr.order_item.quantity

        correct_return_charge = get_delhivery_return_charge(
            o_pin=settings.DELHIVERY_PICKUP.get("pin"),
            d_pin=rr.order.shipping_address.postal_code,
            weight_grams=correct_weight,
            payment_type="Pre-paid"
        ).quantize(Decimal("0.01"))

        with transaction.atomic():

            # --- FIRST-TIME REFUND ---
            if not refund_already_done:
                refund = process_refund(rr)

                # Mark RR refunded + attach correct return charge
                rr.mark_refunded(
                    amount=rr.refund_amount,
                    reverse_charge=correct_return_charge
                )

            # --- ALREADY REFUNDED: Fix ONLY the recovery ledger ---
            else:
                refund = Refund.objects.filter(order=rr.order).order_by("-created_at").first()

                # Fix RR fields if needed
                rr.reverse_pickup_charge = correct_return_charge
                rr.save(update_fields=["reverse_pickup_charge"])

            # Always fix ReturnRecovery ledger regardless
            account, _ = ReturnRecoveryAccount.objects.get_or_create(user=rr.user)

            # 1️⃣ Remove all old txns for this RR
            old_txns = ReturnRecoveryTransaction.objects.filter(
                account=account,
                source=f"ReturnRequest #{rr.id}",
                transaction_type="debit",
            )

            old_total = sum(t.amount for t in old_txns)

            if old_total > 0:
                account.total_recovery -= old_total
                account.balance_due -= old_total
                account.save()
                old_txns.delete()

            # 2️⃣ Add correct debit txn
            account.total_recovery += correct_return_charge
            account.balance_due += correct_return_charge
            account.save()

            ReturnRecoveryTransaction.objects.create(
                account=account,
                transaction_type="debit",
                amount=correct_return_charge,
                source=f"ReturnRequest #{rr.id}",
                description="Corrected reverse pickup charge",
            )

        return Response({
            "success": True,
            "message": ("Refund processed & recovery added"
                        if not refund_already_done
                        else "Refund already done earlier — recovery corrected"),
            "refund_id": refund.refund_id if refund else None,
            "refund_status": refund.status if refund else None,
            "refund_amount": float(rr.refund_amount),
            "return_charge": float(correct_return_charge),
        }, status=200)


    # -------------------- RETURN REQUEST LIST --------------------
class ReturnRequestListAPIView(ListAPIView):
    serializer_class = ReturnRequestSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        qs = ReturnRequest.objects.all().order_by("-created_at")

        if role == "customer":
            return qs.filter(user=user)
        elif role == "admin" or user.is_staff:
            return qs
        return ReturnRequest.objects.none()


# -------------------- RETURN REQUEST DETAIL --------------------
class ReturnRequestDetailAPIView(RetrieveAPIView):
    serializer_class = ReturnRequestSerializer
    lookup_field = "id"
    lookup_url_kwarg = "returnId"

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        qs = ReturnRequest.objects.all()

        if role == "customer":
            return qs.filter(user=user)
        elif role == "admin" or user.is_staff:
            return qs
        return ReturnRequest.objects.none()


# -------------------- REFUND STATUS CHECK --------------------
class RefundStatusAPIView(APIView):
    permission_classes = [IsAdminOrCustomer]

    def get(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        result = check_refund_status(order_number)

        if not result.get("success"):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)

# ---------------- REPLACEMENT REQUEST ----------------

class ReplacementRequestCreateAPIView(CreateAPIView):
    serializer_class = ReplacementRequestSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status="pending")


class ReplacementRequestUpdateAPIView(UpdateAPIView):
    queryset = ReplacementRequest.objects.all()
    serializer_class = ReplacementRequestSerializer

    def get_permissions(self):
        role = getattr(self.request.user, "role", None)
        if role == "admin":
            return [IsAdmin()]
        elif role == "customer":
            return [IsCustomer()]
        return super().get_permissions()

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        role = getattr(user, "role", None)

        # ---------------- CUSTOMER ----------------
        if role == "customer":
            raise PermissionDenied("Customers cannot update replacement requests once created.")

        # ---------------- ADMIN ----------------
        elif role == "admin":
            admin_decision = self.request.data.get("admin_decision")
            if not admin_decision:
                raise ValidationError({"admin_decision": "This field is required."})
            admin_comment = self.request.data.get("admin_comment", instance.admin_comment)

            instance.admin_decision = admin_decision
            instance.admin_comment = admin_comment

            if admin_decision.lower() == "approved" and not instance.new_order:
                old_item = instance.order_item
                subtotal = old_item.price * old_item.quantity
                total = subtotal + instance.order.delivery_charge

                new_order = Order.objects.create(
                    user=instance.user,
                    shipping_address=instance.order.shipping_address,
                    subtotal=subtotal,
                    total=total,
                    delivery_charge=Decimal("0.00"),  # free replacement
                    is_paid=True,
                    paid_at=timezone.now(),
                    payment_method=instance.order.payment_method,
                    status=OrderStatus.PENDING,
                    promoter=None,
                    commission=Decimal("0.00"),
                    commission_applied=True,
                )

                OrderItem.objects.create(
                    order=new_order,
                    product_variant=old_item.product_variant,
                    quantity=old_item.quantity,
                    price=old_item.price,
                )

                instance.new_order = new_order

            instance.save(update_fields=["admin_decision", "admin_comment", "new_order"])
            return

        else:
            raise PermissionDenied("You do not have permission to update this replacement request.")


class ReplacementRequestListAPIView(ListAPIView):
    serializer_class = ReplacementRequestSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        qs = ReplacementRequest.objects.all().order_by("-created_at")

        if role == "customer":
            return qs.filter(user=user)
        elif role in ["admin", None] or user.is_staff:
            return qs
        return ReplacementRequest.objects.none()


class ReplacementRequestDetailAPIView(RetrieveAPIView):
    serializer_class = ReplacementRequestSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        qs = ReplacementRequest.objects.all()
        if role == "customer":
            return qs.filter(user=user)
        elif role in ["admin", None] or user.is_staff:
            return qs
        return ReplacementRequest.objects.none()
