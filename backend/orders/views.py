from django.utils.dateparse import parse_date
import logging
from accounts.permissions import IsAdmin
from admin_dashboard.utils import  create_warehouse_log
from rest_framework.permissions import IsAuthenticated
from .serializers import (ShippingAddressSerializer,
                        CartCheckoutInputSerializer,
                        ReferralCheckoutInputSerializer,
                        OrderPreviewInputSerializer,
                        OrderPreviewOutputSerializer,
                        CustomerOrderListSerializer,
                        OrderDetailSerializer,
                        )
from products.models import ProductVariant
import requests
from decimal import Decimal

from rest_framework.generics import (ListAPIView,RetrieveAPIView,ListCreateAPIView,
                                    RetrieveUpdateDestroyAPIView)

from accounts.permissions import (IsCustomer,
                                IsAdminOrCustomer
                                )
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from cart.models import CartItem
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from .models import Order,ShippingAddress,OrderItemStatus,Refund,OrderItem
from django.db import transaction
import razorpay
from django.conf import settings
from django.shortcuts import get_object_or_404
import logging
from .utils import (process_refund,get_delivery_charge,
                    cancel_delhivery_shipment,
                    track_delhivery_shipment,
                    get_expected_tat
                    )

from .helpers import( process_checkout,
                    verify_razorpay_payment,
                    calculate_order_preview)

from rest_framework.filters import OrderingFilter


def get_or_create_shipping_address(user, address_data):
    normalized = {k: v.strip() for k, v in address_data.items()}

    return ShippingAddress.objects.get_or_create(
        user=user,
        full_name=normalized["full_name"],
        phone_number=normalized["phone_number"],
        address=normalized["address"],
        locality=normalized["locality"],
        city=normalized["city"],
        district=normalized.get("district", ""),
        state=normalized["state"],
        region=normalized.get("region", ""),
        postal_code=normalized["postal_code"],
        country=normalized["country"]
    )[0]


class ReferralCheckoutAPIView(APIView):
   
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request):
        serializer = ReferralCheckoutInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = process_checkout(
            user=request.user,
            items=data.get("items"),
            shipping_address_input=data.get("shipping_address") or data.get("shipping_address_id"),
            payment_method=data.get("payment_method"),
            promoter_code=request.query_params.get("ref"),
            is_cart=False,
            checkout_session_id=request.data.get("checkout_session_id") or request.data.get("unique_identifier"),
        )

        return Response(result["response"], status=status.HTTP_200_OK)

class CartCheckoutAPIView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request):
        cart_items = CartItem.objects.filter(cart__user=request.user)
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CartCheckoutInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = process_checkout(
            user=request.user,
            items=cart_items,  # cart items include referral_code
            shipping_address_input=data.get("shipping_address") or data.get("shipping_address_id"),
            payment_method=data.get("payment_method"),
            is_cart=True,  # cart mode
            promoter_code=None,  # ❌ never pass promoter_code
            checkout_session_id=request.data.get("checkout_session_id") or request.data.get("unique_identifier"),
        )

        return Response(result["response"], status=status.HTTP_200_OK)

class BuyNowAPIView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request):
        items = request.data.get("items", [])
        if not items or not isinstance(items, list):
            return Response({"detail": "No valid items provided."}, status=status.HTTP_400_BAD_REQUEST)

        for item in items:
            if "product_variant_id" not in item or "quantity" not in item or int(item["quantity"]) <= 0:
                return Response({"detail": "Invalid items or quantity"}, status=status.HTTP_400_BAD_REQUEST)

        shipping_address_input = request.data.get("shipping_address") or request.data.get("shipping_address_id")
        payment_method = request.data.get("payment_method", "").strip()

        if payment_method.lower() != "razorpay":
            return Response({"detail": "Only Razorpay payments are supported"}, status=status.HTTP_400_BAD_REQUEST)

        result = process_checkout(
            user=request.user,
            items=items,        # buy-now items contain their own referral_code
            shipping_address_input=shipping_address_input,
            payment_method=payment_method,
            is_cart=False,
            promoter_code=None,  # ❌ do NOT pass item referral here
            checkout_session_id=request.data.get("checkout_session_id") or request.data.get("unique_identifier"),
        )

        return Response(result["response"], status=status.HTTP_200_OK)


class OrderDetailAPIView(RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsCustomer]
    lookup_field = 'order_number'

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("shipping_address", "promoter")
            .prefetch_related("items__product_variant")
        )
    
class OrderPaymentAPIView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request, order_number):
        user = request.user
        order = get_object_or_404(Order, order_number=order_number, user=user)

        if order.is_paid:
            raise ValidationError("Order is already paid")

        method = request.data.get("payment_method", "Razorpay").strip()
        if method.lower() != "razorpay":
            raise ValidationError("Only Razorpay payments are supported")

        result = process_checkout(
            user=user,
            existing_order=order,
            payment_method=method,
            checkout_session_id=request.data.get("checkout_session_id") or request.data.get("unique_identifier"),
        )

        return Response(result["response"], status=status.HTTP_200_OK)


class CancelOrderAPIView(APIView):
    permission_classes = [IsAdminOrCustomer]

    @transaction.atomic
    def post(self, request, order_number):
        """
        Cancel an order (fully or partially).
        Example body:
        {
            "item_ids": [1, 2],      # optional — for partial cancellation
            "cancel_reason": "Customer requested cancellation"
        }
        """
        user = request.user
        role = getattr(user, "role", None)
        item_ids = request.data.get("item_ids")
        cancel_reason = request.data.get("cancel_reason", "").strip() or "No reason provided"

        cancellable_statuses = [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING]

        # --- Fetch order ---
        try:
            order = (
                Order.objects.get(order_number=order_number)
                if role == "admin"
                else Order.objects.get(order_number=order_number, user=user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # --- Identify items to cancel ---
        if item_ids:
            items_to_cancel = order.items.filter(id__in=item_ids, status__in=cancellable_statuses)
            if not items_to_cancel.exists():
                valid_ids = list(
                    order.items.filter(status__in=cancellable_statuses)
                    .values_list("id", flat=True)
                )
                return Response(
                    {"detail": "No valid items to cancel.", "valid_item_ids": valid_ids},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            items_to_cancel = order.items.filter(status__in=cancellable_statuses)

        if not items_to_cancel.exists():
            return Response(
                {"detail": "All items already cancelled or shipped."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Refund logic (if prepaid) ---
        refund_obj = None
        if order.is_paid:
            try:
                refund_id = process_refund(order)  # external Razorpay refund call
                refund_obj = Refund.objects.create(
                    order=order,
                    refund_id=refund_id,
                    amount=order.total,
                    status="processed",
                    processed_at=timezone.now(),
                    notes=f"Auto refund triggered for cancelled order {order.order_number}",
                )
                order.has_refund = True
                order.save(update_fields=["has_refund"])
            except Exception as e:
               
                refund_obj = Refund.objects.create(
                    order=order,
                    amount=order.total,
                    status="failed",
                    notes=f"Refund error: {str(e)}",
                )

        # --- Cancel items & restock ---
        cancelled_items_data = []
        for item in items_to_cancel:
            variant = item.product_variant
            variant.stock += item.quantity
            variant.save(update_fields=["stock"])

            item.status = OrderItemStatus.CANCELLED
            item.cancel_reason = cancel_reason
            item.refund_amount = item.price * item.quantity if order.is_paid else 0
            item.save(update_fields=["status", "cancel_reason", "refund_amount"])

            create_warehouse_log(item, updated_by=user, comment="Order item cancelled")

            cancelled_items_data.append(
                {
                    "id": item.id,
                    "product_variant": str(item.product_variant),
                    "quantity": item.quantity,
                    "refund_amount": float(item.refund_amount),
                }
            )

        # --- Cancel the Delhivery shipment (one per order) ---
        delhivery_response = None
        if order.waybill:
            try:
                delhivery_response = cancel_delhivery_shipment(order.waybill)
            except Exception as e:
                delhivery_response = {"success": False, "message": str(e)}

        # --- Update order status ---
        remaining_active = order.items.filter(status__in=cancellable_statuses)
        order.status = "partially_cancelled" if remaining_active.exists() else "cancelled"

        order.cancel_reason = cancel_reason
        order.cancelled_at = timezone.now()
        order.cancelled_by = user
        order.cancelled_by_role = role
        order.is_restocked = True
        order.save(
            update_fields=[
                "status",
                "cancel_reason",
                "cancelled_at",
                "cancelled_by",
                "cancelled_by_role",
                "is_restocked",
            ]
        )

        create_warehouse_log(order, updated_by=user, comment="Order cancelled")

        # --- Response ---
        return Response(
            {
                "success": True,
                "message": "Order cancellation processed successfully.",
                "refund_id": refund_obj.refund_id if refund_obj else None,
                "order": {
                    "order_number": order.order_number,
                    "status": order.status,
                    "cancel_reason": order.cancel_reason,
                    "cancelled_by": getattr(order.cancelled_by, "email", None),
                    "cancelled_by_role": order.cancelled_by_role,
                    "waybill": order.waybill,
                    "delhivery_response": delhivery_response,
                    "cancelled_items": cancelled_items_data,
                },
            },
            status=status.HTTP_200_OK,
        )

class RazorpayOrderCreateAPIView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, user=request.user)

        if order.is_paid or order.status.lower() in ["processing", "delivered", "cancelled"]:
            raise ValidationError("Cannot initiate payment for this order")

        result = process_checkout(
            user=request.user,
            existing_order=order,
            checkout_session_id=request.data.get("checkout_session_id") or request.data.get("unique_identifier"),
        )

        return Response(result["response"], status=status.HTTP_200_OK)


# --------- RazorpayPaymentVerifyAPIView (input changed) ---------
class RazorpayPaymentVerifyAPIView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request):
        razorpay_order_id = request.data.get("razorpay_order_id")
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_signature = request.data.get("razorpay_signature")
        order_number = request.data.get("order_number")

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, order_number]):
            raise ValidationError("Missing Razorpay payment details")

        order = get_object_or_404(Order, order_number=order_number, user=request.user)
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        # Verify payment with Razorpay
        result = verify_razorpay_payment(
            order=order,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            user=request.user,
            client=client
        )

        # ✅ Mark order paid and deduct stock
        if not order.is_paid:
            order.is_paid = True
            order.save(update_fields=["is_paid"])

            for item in order.items.all():
                variant = item.product_variant
                if variant.stock < item.quantity:
                    raise ValidationError(f"Not enough stock for {variant}")
                variant.stock -= item.quantity
                variant.save(update_fields=["stock"])

        # ✅ Apply recovery now
        if hasattr(order.user, "recovery_account"):
            from orders.utils import apply_return_recovery
            delivery_charge_with_recovery, applied_recovery = apply_return_recovery(
                user=order.user,
                order=order,
                delivery_charge=order.delivery_charge
            )
            order.delivery_charge = delivery_charge_with_recovery
            order.total = (order.subtotal + delivery_charge_with_recovery).quantize(Decimal("0.01"))
            order.save(update_fields=["delivery_charge", "total"])

        return Response({
            "success": True,
            "message": "Payment verified, stock updated, recovery applied",
            "data": result
        })


class ShippingAddressListCreateView(ListCreateAPIView):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        logger = logging.getLogger(__name__)

        # Optional: deduplication check
        new_data = serializer.validated_data
        existing = ShippingAddress.objects.filter(
            user=user,
            postal_code=new_data.get('postal_code'),
            locality=new_data.get('locality'),
            address=new_data.get('address'),
            city=new_data.get('city'),
            state=new_data.get('state')
        ).first()

        if existing:
            logger.info(f"Duplicate address attempt by {user.email} for pincode {new_data.get('pincode')}")
            raise ValidationError("This address already exists in your saved list.")

        serializer.save(user=user)
        logger.info(f"New shipping address created for {user.email}")

class ShippingAddressRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsCustomer]
    lookup_field = 'id'

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        logger = logging.getLogger(__name__)
        serializer.save()
        logger.info(f"Shipping address {serializer.instance.id} updated by {self.request.user.email}")

    def perform_destroy(self, instance):
        logger = logging.getLogger(__name__)
        instance.delete()
        logger.info(f"Shipping address {instance.id} deleted by {self.request.user.email}")


# --------- OrderListAPIView (customer-facing response) ---------
class OrderListAPIView(ListAPIView):
    serializer_class = CustomerOrderListSerializer
    permission_classes = [IsCustomer]
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user


        queryset = Order.objects.filter(user=user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        refunded_filter = self.request.query_params.get("is_refunded")
        if refunded_filter in ["true", "false"]:
            queryset = queryset.filter(is_refunded=(refunded_filter == "true"))

        start_date = self.request.query_params.get("start")
        end_date = self.request.query_params.get("end")
        if start_date and end_date:
            queryset = queryset.filter(
                created_at__date__range=(parse_date(start_date), parse_date(end_date))
            )

        return queryset
    
class OrderPreviewAPIView(APIView):
    permission_classes = [IsCustomer]
    
    def post(self, request):
        serializer = OrderPreviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user

        # 1️⃣ Calculate subtotal
        result = calculate_order_preview(data["items"], data["postal_code"])

        # 2️⃣ Total weight in grams
        total_weight_kg = 0
        for item in data['items']:
            variant = ProductVariant.objects.get(id=item['product_variant_id'])
            total_weight_kg += item['quantity'] * variant.weight
        total_weight_g = total_weight_kg * 1000

        # 3️⃣ Base delivery charge from Delhivery
        delivery_info = get_delivery_charge(
            o_pin=settings.DELHIVERY_PICKUP.get('pin'),
            d_pin=data["postal_code"],
            weight_grams=total_weight_g,
            payment_type="Pre-paid"
        )
        base_delivery_charge = Decimal(delivery_info.get("charge", 0))

        # 4️⃣ Estimated TAT
        tat_info = get_expected_tat(
            origin_pin=settings.DELHIVERY_PICKUP.get('pin'),
            destination_pin=data["postal_code"],
            mot='E',
            pdt='B2C'
        )

        # 5️⃣ Add recovery amount for display only
        recovery_for_preview = Decimal("0.00")
        if hasattr(user, "recovery_account") and user.recovery_account.balance_due > 0:
            dynamic_recovery = (user.recovery_account.balance_due * Decimal("0.10")).quantize(Decimal("0.01"))
            recovery_for_preview = min(max(dynamic_recovery, Decimal("5.00")), Decimal("10.00"), user.recovery_account.balance_due)

        # FINAL delivery charge = base + recovery (preview only, not debited)
        final_delivery_charge = base_delivery_charge + recovery_for_preview

        # 6️⃣ Assign into result
        result["delivery_charge"] = float(final_delivery_charge)
        result["estimated_delivery_days"] = tat_info.get("tat_days")
        result["total"] = float(result["subtotal"]) + float(final_delivery_charge)

        return Response(OrderPreviewOutputSerializer(result).data, status=status.HTTP_200_OK)

from .serializers import ShipmentTrackingSerializer
class OrderTrackingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        """
        Fetch tracking info for the order's waybill (single shipment).
        """
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({"success": False, "message": "Order not found"}, status=404)

        if not request.user.is_staff and order.user != request.user:
            return Response({"success": False, "message": "Not authorized"}, status=403)

        if not order.waybill:
            return Response({"success": False, "message": "Waybill not yet generated"}, status=400)

        tracking_info = track_delhivery_shipment(waybill=order.waybill, ref_id=f"ORDER-{order.id}")
        if tracking_info.get("success"):
            summary = tracking_info.get("summary")
            serializer = ShipmentTrackingSerializer(summary, many=isinstance(summary, list))
            tracking_data = serializer.data
            message = "Tracking fetched successfully"
        else:
            tracking_data = None
            message = tracking_info.get("message", "Tracking unavailable")

        return Response({
            "success": True,
            "order_number": order.order_number,
            "waybill": order.waybill,
            "courier": order.courier,
            "tracking_url": order.delhivery_tracking_url,
            "tracking": tracking_data,
            "message": message,
        })


class GenerateDelhiveryLabelsAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, order_number):
        """
        Generate Delhivery packing slip (PDF label) for the order's single shipment.
        """
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({"success": False, "message": "Order not found"}, status=404)

        if not order.waybill:
            return Response({"success": False, "message": "No waybill assigned to this order"}, status=400)

        url = "https://track.delhivery.com/api/p/packing_slip"
        headers = {
            "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
            "Accept": "application/json",
        }
        params = {
            "wbns": order.waybill,
            "pdf": "true",
            "pdf_size": "A4",
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()
        except requests.Timeout:
            return Response({"success": False, "message": "Delhivery API timeout"}, status=504)
        except requests.RequestException as e:
            return Response({"success": False, "message": f"Delhivery request failed: {str(e)}"}, status=502)

        package = next((p for p in data.get("packages", []) if p.get("waybill") == order.waybill), None)
        if not package or not package.get("pdf_download_link"):
            return Response({"success": False, "message": "No label found for this waybill"}, status=400)

        order.label_url = package["pdf_download_link"]
        order.label_generated_at = timezone.now()
        order.save(update_fields=["label_url", "label_generated_at"])

        create_warehouse_log(order, updated_by=request.user, comment="Delhivery label generated")

        return Response({
            "success": True,
            "message": "Delhivery label generated successfully",
            "order_number": order.order_number,
            "waybill": order.waybill,
            "label_url": order.label_url,
        })


