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
            shipping_address_input=data.get("shipping_address") or data.get("shipping_address_id"),  # <-- fixed
            payment_method=data.get("payment_method"),
            promoter_code=request.query_params.get("ref"),
            is_cart=False
        )

        return Response(
            result["response"],
            status=status.HTTP_200_OK if result["order"].payment_method == "Razorpay" else status.HTTP_400_BAD_REQUEST
        )


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
            items=cart_items,
            shipping_address_input=data.get("shipping_address") or data.get("shipping_address_id"),
            payment_method=data.get("payment_method"),
            promoter_code=data.get("referral_code"),
            is_cart=True
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
        if method != "Razorpay":
            raise ValidationError("Only Razorpay payments are supported")

        result = process_checkout(
            user=user,
            existing_order=order,
            payment_method=method
        )

        return Response(result['response'])

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
        item_ids = request.data.get("item_ids", None)
        cancel_reason = request.data.get("cancel_reason", "").strip() or "No reason provided"

        cancellable_statuses = [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING]
        # --- Fetch order safely ---
        try:
            order = (
                Order.objects.get(order_number=order_number)
                if role == "admin"
                else Order.objects.get(order_number=order_number, user=user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # --- Validate item selection ---
        if item_ids:
            items_to_cancel = order.items.filter(
                id__in=item_ids, status__in=cancellable_statuses
            )
            if not items_to_cancel.exists():
                valid_ids = list(
                    order.items.filter(status__in=cancellable_statuses)
                    .values_list("id", flat=True)
                )
                return Response(
                    {
                        "detail": "No valid items to cancel.",
                        "valid_item_ids": valid_ids,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            items_to_cancel = order.items.filter(status__in=cancellable_statuses)

        if not items_to_cancel.exists():
            return Response(
                {"detail": "All items already cancelled or shipped."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Refund (if prepaid) ---
        refund_obj = None
        if order.is_paid:
            try:
                refund_id = process_refund(order)  # external Razorpay refund
                refund_obj = Refund.objects.create(
                    order=order,
                    refund_id=refund_id,
                    amount=order.total,
                    status="processed",
                    processed_at=timezone.now(),
                    notes=f"Auto refund triggered for cancelled order {order.order_number}"
                )
                order.has_refund = True
                order.save(update_fields=["has_refund"])
            except Exception as e:
                print("⚠️ Refund failed:", str(e))
                refund_obj = Refund.objects.create(
                    order=order,
                    amount=order.total,
                    status="failed",
                    notes=f"Refund error: {str(e)}"
                )

        # --- Restock & Cancel items individually ---
        cancelled_items_data = []
        delhivery_cancellations = []

        for item in items_to_cancel:
            variant = item.product_variant
            variant.stock += item.quantity
            variant.save(update_fields=["stock"])

            item.status =  OrderItemStatus.CANCELLED
            item.cancel_reason = cancel_reason
            item.refund_amount = item.price * item.quantity if order.is_paid else 0
            item.save(update_fields=["status", "cancel_reason", "refund_amount"])

            create_warehouse_log(item, updated_by=user, comment="Order item cancelled")

            # --- Cancel Delhivery shipment per item ---
            delhivery_response = None
            if item.waybill:
                delhivery_response = cancel_delhivery_shipment(item.waybill)
                delhivery_cancellations.append(
                    {
                        "item_id": item.id,
                        "waybill": item.waybill,
                        "response": delhivery_response,
                    }
                )

            cancelled_items_data.append(
                {
                    "id": item.id,
                    "product_variant": str(item.product_variant),
                    "quantity": item.quantity,
                    "refund_amount": float(item.refund_amount),
                }
            )

        # --- Update overall order status ---
        active_items = order.items.filter(status__in=cancellable_statuses)
        if active_items.exists():
            order.status = "partially_cancelled"
        else:
            order.status = "cancelled"

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
                    "delhivery_cancellations": delhivery_cancellations,
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

        # Call helper without changing payment method (assume Razorpay)
        result = process_checkout(user=request.user, existing_order=order)

        return Response(result)


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

        result = verify_razorpay_payment(
            order=order,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            user=request.user,
            client=client
        )
        return Response({"success": True, "message": "Payment verified", "data": result})


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
            items=items,
            shipping_address_input=shipping_address_input,
            payment_method=payment_method,
            is_cart=False
        )

        return Response(result["response"], status=status.HTTP_200_OK)

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
        # 1️⃣ Validate input
        serializer = OrderPreviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # 2️⃣ Calculate subtotal using existing logic
        result = calculate_order_preview(data["items"], data["postal_code"])

        # 3️⃣ Calculate total weight (example: 0.5kg per item)
        total_weight_kg = 0
        for item in data['items']:
            variant=ProductVariant.objects.get(id=item['product_variant_id'])
            total_weight_kg += item['quantity'] * variant.weight
        total_weight_g=total_weight_kg * 1000
        # 4️⃣ Get delivery charge from Delhivery
        delivery_info = get_delivery_charge(
            o_pin="643212",                # your warehouse PIN
            d_pin=data["postal_code"],     # customer PIN
            weight_grams=total_weight_g,
            payment_type="Pre-paid"
        )
        tat_info = get_expected_tat(
            origin_pin="643212",
            destination_pin=data["postal_code"],
            mot='E',       # Express
            pdt='B2C'      # Business to customer
        )
        # 5️⃣ Add delivery info to result safely
        result["delivery_charge"] = delivery_info.get("charge", 0)
        result["estimated_delivery_days"] = tat_info.get("tat_days")
        result["total"] = float(result["subtotal"]) + result["delivery_charge"]

        # 6️⃣ Return response
        return Response(OrderPreviewOutputSerializer(result).data, status=status.HTTP_200_OK)


from .serializers import ShipmentTrackingSerializer
class OrderTrackingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        """
        Fetch tracking info for all items in an order from Delhivery API.
        Each OrderItem may have its own waybill and tracking URL.
        """
        # 1️⃣ Validate order existence
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response(
                {"success": False, "message": "Order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2️⃣ Restrict access
        if not request.user.is_staff and order.user != request.user:
            return Response(
                {"success": False, "message": "Not authorized to view this order"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 3️⃣ Prepare tracking details for each order item
        tracking_results = []
        order_items = order.items.all()

        if not order_items.exists():
            return Response(
                {"success": False, "message": "No items found in this order"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in order_items:
            waybill = item.waybill
            ref_id = f"ITEM-{item.id}"

            if not waybill:
                tracking_results.append({
                    "item_id": item.id,
                    "product": str(item.product_variant),
                    "waybill": None,
                    "tracking_url": None,
                    "tracking": None,
                    "message": "Waybill not yet generated."
                })
                continue

            tracking_info = track_delhivery_shipment(waybill=waybill, ref_id=ref_id)

            if tracking_info.get("success"):
                summary = tracking_info.get("summary")
                serializer = ShipmentTrackingSerializer(
                    summary, many=isinstance(summary, list)
                )
                tracking_data = serializer.data
                message = "Tracking fetched successfully"
            else:
                tracking_data = None
                message = tracking_info.get("message", "Tracking unavailable")

            tracking_results.append({
                "item_id": item.id,
                "product": str(item.product_variant),
                "waybill": waybill,
                "tracking_url": item.tracking_url,
                "tracking": tracking_data,
                "message": message,
            })

        # 4️⃣ Return combined response
        return Response(
            {
                "success": True,
                "order_number": order.order_number,
                "tracking_items": tracking_results,
            },
            status=status.HTTP_200_OK,
        )

class GenerateDelhiveryLabelsAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, order_number):
        """
        Generate Delhivery packing slips (PDF labels) for all items in an order.
        """
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({"success": False, "message": "Order not found"}, status=404)

        # get all items that already have a waybill
        items = order.items.filter(waybill__isnull=False)
        if not items.exists():
            return Response({"success": False, "message": "No waybills found for this order"}, status=400)

        # combine all waybills into a single comma-separated string
        waybills = ",".join(items.values_list("waybill", flat=True))

        url = "https://track.delhivery.com/api/p/packing_slip"
        headers = {
            "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
            "Accept": "application/json",
        }
        params = {
            "wbns": waybills,
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

        packages = data.get("packages", [])
        if not packages:
            return Response({"success": False, "message": "No packages found in response"}, status=400)

        updated_items = []
        for package in packages:
            waybill = package.get("waybill")
            pdf_link = package.get("pdf_download_link")
            if not (waybill and pdf_link):
                continue

            item = items.filter(waybill=waybill).first()
            if item:
                item.label_url = pdf_link
                item.label_generated_at = timezone.now()
                item.save(update_fields=["label_url", "label_generated_at"])
                updated_items.append({
                    "item_id": item.id,
                    "waybill": waybill,
                    "label_url": pdf_link,
                })

        create_warehouse_log(
            order,
            updated_by=request.user,
            comment=f"Generated Delhivery labels for {len(updated_items)} item(s)"
        )

        return Response({
            "success": True,
            "message": f"Delhivery labels generated for {len(updated_items)} item(s)",
            "order_number": order.order_number,
            "labels": updated_items,
        })

