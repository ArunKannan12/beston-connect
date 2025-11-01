# views.py
from django.utils import timezone
from rest_framework.generics import CreateAPIView, UpdateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework import status
from django.shortcuts import get_object_or_404
from decimal import Decimal

from .models import ReturnRequest, ReplacementRequest, Order, OrderStatus, OrderItem
from .returnReplacementSerializer import ReturnRequestSerializer, ReplacementRequestSerializer
from accounts.permissions import IsCustomer, IsAdmin, IsAdminOrCustomer
from .utils import process_refund, check_refund_status,create_reverse_pickup

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


# -------------------- CREATE RETURN REQUEST --------------------
class ReturnRequestCreateAPIView(CreateAPIView):
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        """
        Customer creates a return request.
        Automatically sets status to 'pending' and initiates Delhivery reverse pickup.
        """
        return_request = serializer.save(user=self.request.user, status="pending")

        try:
            # Trigger Delhivery reverse pickup API
            pickup_data = create_reverse_pickup(return_request)

            if pickup_data.get("success"):
                return_request.waybill = pickup_data.get("waybill")
                return_request.pickup_date = timezone.now()
                return_request.status = "pickup_scheduled"
                return_request.save(update_fields=["waybill", "pickup_date", "status"])
            else:
                return_request.status = "pickup_failed"
                return_request.save(update_fields=["status"])
        except Exception as e:
            print(f"Delhivery pickup failed: {e}")
            return_request.status = "pickup_failed"
            return_request.save(update_fields=["status"])


# -------------------- UPDATE RETURN REQUEST (ADMIN ONLY) --------------------
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

        # Customers cannot modify return requests once created
        if role == "customer":
            raise PermissionDenied("Customers cannot update return requests once created.")

        # -------------------- ADMIN --------------------
        elif role == "admin":
            status_choice = self.request.data.get("status")

            if status_choice not in ["approved", "rejected"]:
                raise ValidationError({"status": "Must be 'approved' or 'rejected'."})

            instance.admin_processed_at = timezone.now()

            # 🟢 APPROVED: trigger Razorpay refund
            if status_choice == "approved":
                try:
                    refund_id = process_refund(instance)
                    # Refund success or in-progress handled by helper
                    instance.admin_comment = f"Refund initiated with Razorpay ID {refund_id}"
                    instance.save(update_fields=["status", "admin_processed_at", "admin_comment"])
                except Exception as e:
                    raise ValidationError({"refund": f"Refund failed: {str(e)}"})

            # 🔴 REJECTED
            else:
                instance.status = "rejected"
                instance.save(update_fields=["status", "admin_processed_at"])

        else:
            raise PermissionDenied("You do not have permission to update this return request.")


# -------------------- LIST RETURN REQUESTS --------------------
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
