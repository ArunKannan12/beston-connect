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
from .models import ReturnRequest, ReplacementRequest, Order, OrderStatus, OrderItem,Refund,ReturnRecoveryAccount,ReturnRecoveryTransaction,OrderItemStatus
from .returnReplacementSerializer import ReturnRequestSerializer, ReplacementRequestSerializer
from accounts.permissions import IsCustomer, IsAdmin, IsAdminOrCustomer
from .utils import process_refund, check_refund_status,create_reverse_pickup,get_delhivery_return_charge,calculate_replacement_delivery,create_repl_shipment
from rest_framework.generics import CreateAPIView, UpdateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404

ACTIVE_RETURN_STATUSES = [
    "pending",        # Customer requested, not yet processed
    "pp_open",        # Pickup open
    "pp_scheduled",   # Pickup scheduled
    "pp_dispatched",  # Pickup dispatched to customer
    "pu_in_transit",  # Pickup in transit to warehouse
    "pu_pending",     # Pickup reached warehouse, pending processing
]
# -------------------- RETURN REQUEST CREATE --------------------
class ReturnRequestCreateAPIView(CreateAPIView):
    """
    API for customers to create return requests.
    Supports single item or full/partial order returns.
    Pickup is triggered only after admin approval.
    """
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        saved = serializer.save()
        # If multiple return requests, return first for API response
        if isinstance(saved, list):
            return saved[0]
        return saved
    


class ReturnRequestBulkUpdateAPIView(APIView):
    """
    Admin can update multiple return requests at once.
    Actions allowed: schedule reverse pickup or reject the requests.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        return_ids = request.data.get("return_ids", [])
        action = request.data.get("action")

        if not return_ids or not isinstance(return_ids, list):
            return Response({"error": "return_ids must be a non-empty list"}, status=400)

        if action not in ["pickup_scheduled", "rejected"]:
            return Response({"error": "Action must be 'pickup_scheduled' or 'rejected'"}, status=400)

        results = []

        # Wrap entire operation in a transaction to allow select_for_update
        with transaction.atomic():
            for rr_id in return_ids:
                try:
                    # Lock row to prevent concurrent updates
                    rr = ReturnRequest.objects.select_for_update().get(id=rr_id)
                except ReturnRequest.DoesNotExist:
                    results.append({"id": rr_id, "status": "not_found"})
                    continue

                rr.admin_processed_at = timezone.now()

                # -------------------- Reject --------------------
                if action == "rejected":
                    rr.status = "rejected"
                    rr.save(update_fields=["status", "admin_processed_at"])
                    results.append({"id": rr_id, "status": "rejected"})
                    continue

                # -------------------- Schedule Pickup --------------------
                if action == "pickup_scheduled":
                    # Prevent scheduling if already in progress
                    if rr.status in ["pp_scheduled", "pp_dispatched"]:
                        results.append({"id": rr_id, "status": "already_in_progress"})
                        continue

                    try:
                        # Call your pickup creation helper
                        pickup_data = create_reverse_pickup(rr)

                        if pickup_data.get("success"):
                            rr.waybill = pickup_data["waybill"]
                            rr.status = "pp_scheduled"
                            rr.pickup_date = timezone.now()
                            rr.save(update_fields=["waybill", "status", "pickup_date", "admin_processed_at"])
                            results.append({
                                "id": rr_id,
                                "status": "pickup_scheduled",
                                "waybill": rr.waybill
                            })
                        else:
                            rr.status = "pickup_failed"
                            rr.admin_comment = "Delhivery pickup creation failed."
                            rr.save(update_fields=["status", "admin_comment", "admin_processed_at"])
                            results.append({"id": rr_id, "status": "pickup_failed"})

                    except Exception as e:
                        rr.status = "pickup_failed"
                        rr.admin_comment = f"Exception: {str(e)}"
                        rr.save(update_fields=["status", "admin_comment", "admin_processed_at"])
                        results.append({
                            "id": rr_id,
                            "status": "pickup_failed",
                            "error": str(e)
                        })

        return Response({
            "success": True,
            "action": action,
            "results": results
        }, status=200)


class ReturnRequestRefundAPIView(APIView):
    """
    Refund multiple return requests.
    Accepts a list of return IDs for partial or full order refunds.
    Refunds are only allowed if the item has been delivered back to the warehouse.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        return_ids = request.data.get("return_ids")
        if not return_ids or not isinstance(return_ids, list):
            return Response(
                {"error": "Provide return_ids as a non-empty list"},
                status=400
            )

        return_requests = ReturnRequest.objects.filter(id__in=return_ids)
        if not return_requests.exists():
            return Response({"error": "No return requests found"}, status=404)

        refunds_data = []

        with transaction.atomic():
            for rr in return_requests:
                # --- Check if item delivered back to warehouse ---
                if rr.status != "dto":
                    refunds_data.append({
                        "return_id": rr.id,
                        "error": "Item not yet delivered to warehouse"
                    })
                    continue

                # --- Basic validations ---
                if not rr.order.is_paid:
                    refunds_data.append({"return_id": rr.id, "error": "Order not paid"})
                    continue

                if rr.order.payment_method.lower() != "razorpay":
                    refunds_data.append({"return_id": rr.id, "error": "Only Razorpay refunds supported"})
                    continue

                if not rr.order.razorpay_payment_id:
                    refunds_data.append({"return_id": rr.id, "error": "Missing Razorpay payment ID"})
                    continue

                if not rr.refund_amount or rr.refund_amount <= 0:
                    refunds_data.append({"return_id": rr.id, "error": "Invalid refund amount"})
                    continue

                refund_already_done = rr.status == "refunded"

                # --- Compute reverse pickup charge ---
                correct_weight = rr.order_item.product_variant.get_weight_in_grams() * rr.order_item.quantity
                correct_return_charge = get_delhivery_return_charge(
                    o_pin=settings.DELHIVERY_PICKUP.get("pin"),
                    d_pin=rr.order.shipping_address.postal_code,
                    weight_grams=correct_weight,
                    payment_type="Pre-paid"
                ).quantize(Decimal("0.01"))

                # --- Process refund ---
                if not refund_already_done:
                    refund = process_refund(rr)
                    rr.mark_refunded(amount=rr.refund_amount, reverse_charge=correct_return_charge)
                else:
                    refund = Refund.objects.filter(order=rr.order).order_by("-created_at").first()
                    rr.reverse_pickup_charge = correct_return_charge
                    rr.save(update_fields=["reverse_pickup_charge"])

                # --- Update ReturnRecovery ledger ---
                account, _ = ReturnRecoveryAccount.objects.get_or_create(user=rr.user)
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

                refunds_data.append({
                    "return_id": rr.id,
                    "refund_id": refund.refund_id if refund else None,
                    "refund_status": refund.status if refund else None,
                    "refund_amount": float(rr.refund_amount),
                    "return_charge": float(correct_return_charge),
                    "already_refunded": refund_already_done
                })

        return Response({
            "success": True,
            "message": "Refunds processed for eligible return requests.",
            "refunds": refunds_data
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


import logging
logger = logging.getLogger(__name__)


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


class ReplacementRequestUpdateAPIView(UpdateAPIView):
    queryset = ReplacementRequest.objects.select_related(
        "order", "order_item", "new_order"
    )
    serializer_class = ReplacementRequestSerializer
    permission_classes = [IsAdmin]

    def get_permissions(self):
        if getattr(self.request.user, "role", None) != "admin":
            raise PermissionDenied("Only admins can update replacement requests.")
        return super().get_permissions()

    def perform_update(self, serializer):
        instance = serializer.instance
        data = self.request.data

        admin_decision = data.get("admin_decision")
        admin_comment = data.get("admin_comment", instance.admin_comment)
        rerun_recovery = bool(data.get("rerun_recovery"))
        retry_shipment = bool(data.get("retry_shipment"))

        # ------------------ VALIDATION ------------------
        if admin_decision not in ["approved", "rejected"]:
            raise ValidationError({"admin_decision": "Must be approved or rejected."})

        # ------------------ REJECT ------------------
        if admin_decision == "rejected":
            instance.status = "rejected"
            instance.admin_decision = "rejected"
            instance.admin_comment = admin_comment
            instance.save(update_fields=[
                "status",
                "admin_decision",
                "admin_comment",
            ])
            return

        # ------------------ RERUN RECOVERY ------------------
        if rerun_recovery:
            if instance.status != "approved":
                raise ValidationError("Recovery can be rerun only for approved replacements.")
            if not instance.new_order:
                raise ValidationError("Replacement order missing.")

            result = calculate_replacement_delivery(
                user=instance.new_order.user,
                order=instance.new_order
            )

            instance.add_replacement_recovery(result["total_charge"])
            instance.admin_comment = admin_comment
            instance.save(update_fields=["admin_comment"])
            return

        # ------------------ RETRY FAILED SHIPMENT ------------------
        if retry_shipment:
            if instance.status != "failed":
                raise ValidationError("Only failed replacements can retry shipment.")
            if not instance.new_order:
                raise ValidationError("Replacement order missing.")

            resp = create_repl_shipment(replacement_request=instance)
            if not resp.get("success"):
                instance.delhivery_status = resp.get("error", "Retry failed")
                instance.save(update_fields=["delhivery_status"])
                raise ValidationError(instance.delhivery_status)

            try:
                repl_waybill = resp["packages"][0]["waybill"]
            except (KeyError, IndexError):
                raise ValidationError("Invalid Delhivery response.")

            with transaction.atomic():
                new_order = instance.new_order

                result = calculate_replacement_delivery(
                    user=new_order.user,
                    order=new_order
                )
                instance.add_replacement_recovery(result["total_charge"])

                new_order.delivery_charge = Decimal("0.00")
                new_order.total = new_order.subtotal
                new_order.waybill = repl_waybill
                new_order.tracking_url = (
                    f"https://www.delhivery.com/tracking?waybill={repl_waybill}"
                )
                new_order.courier = "Delhivery"
                new_order.save(update_fields=[
                    "delivery_charge",
                    "total",
                    "waybill",
                    "tracking_url",
                    "courier",
                ])

                instance.status = "approved"
                instance.delhivery_status = "Replacement shipment retried successfully"
                instance.admin_comment = admin_comment
                instance.save(update_fields=[
                    "status",
                    "delhivery_status",
                    "admin_comment",
                ])
            return

        # ------------------ APPROVAL FLOW ------------------
        order = instance.order
        item = instance.order_item
        variant = item.product_variant

        days_passed = (timezone.now().date() - order.created_at.date()).days
        if not variant.allow_replacement or days_passed > variant.replacement_days:
            raise ValidationError("Replacement period has expired.")

        if not order.waybill:
            raise ValidationError("Original order must have a waybill.")

        resp = create_repl_shipment(replacement_request=instance)
        if not resp.get("success"):
            instance.status = "failed"
            instance.delhivery_status = resp.get("error", "Shipment failed")
            instance.admin_comment = admin_comment
            instance.save(update_fields=[
                "status",
                "delhivery_status",
                "admin_comment",
            ])
            raise ValidationError(instance.delhivery_status)

        try:
            repl_waybill = resp["packages"][0]["waybill"]
        except (KeyError, IndexError):
            raise ValidationError("Invalid Delhivery response.")

        with transaction.atomic():
            if not instance.new_order:
                subtotal = item.price * item.quantity
                new_order = Order.objects.create(
                    user=order.user,
                    shipping_address=order.shipping_address,
                    subtotal=subtotal,
                    total=subtotal,
                    delivery_charge=Decimal("0.00"),
                    is_paid=True,
                    paid_at=timezone.now(),
                    payment_method=order.payment_method,
                    status=OrderStatus.PENDING,
                    promoter=None,
                    is_commission_applied=True,
                )
                OrderItem.objects.create(
                    order=new_order,
                    product_variant=item.product_variant,
                    quantity=item.quantity,
                    price=item.price,
                )
                instance.new_order = new_order
            else:
                new_order = instance.new_order

            result = calculate_replacement_delivery(
                user=new_order.user,
                order=new_order
            )
            instance.add_replacement_recovery(result["total_charge"])

            new_order.delivery_charge = Decimal("0.00")
            new_order.total = new_order.subtotal
            new_order.waybill = repl_waybill
            new_order.tracking_url = (
                f"https://www.delhivery.com/tracking?waybill={repl_waybill}"
            )
            new_order.courier = "Delhivery"
            new_order.save(update_fields=[
                "delivery_charge",
                "total",
                "waybill",
                "tracking_url",
                "courier",
            ])

            instance.status = "approved"
            instance.admin_decision = "approved"
            instance.delhivery_status = "Replacement shipment created"
            instance.admin_comment = admin_comment
            instance.save(update_fields=[
                "status",
                "admin_decision",
                "delhivery_status",
                "admin_comment",
                "new_order",
            ])
