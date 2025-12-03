from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.exceptions import ValidationError
from rest_framework import status,serializers
from django.db import transaction
from rest_framework.throttling import UserRateThrottle

from .serializers import (
    CartItemSerializer,
    CartSummarySerializer,
    CartItemInputSerializer,
)
from .models import CartItem, Cart
from accounts.permissions import IsCustomer
from products.models import ProductVariant
from .utils import check_stock
from decimal import Decimal


# =====================================================
# CART ITEM LIST + CREATE
# =====================================================
class CartItemListCreateApiView(ListCreateAPIView):
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CartItemInputSerializer  # WRITE SERIALIZER 
        return CartItemSerializer          # READ SERIALIZER

    @transaction.atomic
    def perform_create(self, serializer):
        """
        serializer = CartItemInputSerializer → validated_data contains:
        { product_variant_id, quantity, referral_code }
        """
        cart, _ = Cart.objects.get_or_create(user=self.request.user)

        variant_id = serializer.validated_data["product_variant_id"]
        quantity = serializer.validated_data["quantity"]
        ref_code = serializer.validated_data.get("referral_code")

        product_variant = ProductVariant.objects.get(id=variant_id)

        # Check if item already exists
        existing_item = CartItem.objects.filter(
            cart=cart, product_variant=product_variant
        ).first()

        if existing_item:
            new_quantity = existing_item.quantity + quantity
            check_stock(product_variant, new_quantity)
            existing_item.quantity = new_quantity
            if ref_code is not None:
                existing_item.referral_code = ref_code
            existing_item.save()
        else:
            check_stock(product_variant, quantity)
            CartItem.objects.create(
                cart=cart,
                product_variant=product_variant,
                quantity=quantity,
                referral_code=ref_code,
            )


# =====================================================
# CART ITEM RETRIEVE + UPDATE + DELETE
# =====================================================
class CartItemRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    lookup_field = "id"
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CartItemInputSerializer  # WRITE
        return CartItemSerializer          # READ

    @transaction.atomic
    def perform_update(self, serializer):
        item = self.get_object()
        if item.cart.user != self.request.user:
            raise ValidationError("Not allowed.")

        quantity = serializer.validated_data["quantity"]
        check_stock(item.product_variant, quantity)

        item.quantity = quantity
        ref_code = serializer.validated_data.get("referral_code")
        if ref_code is not None:
            item.referral_code = ref_code
        item.save()

    def perform_destroy(self, instance):
        if instance.cart.user != self.request.user:
            raise ValidationError("Not allowed.")
        instance.delete()


# =====================================================
# CART SUMMARY
# =====================================================
class CartSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({
                "items": [],
                "total_quantity": 0,
                "total_price": 0,
            })

        serializer = CartSummarySerializer(cart, context={"request": request})
        return Response(serializer.data)

class CartMergeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    throttle_classes = [UserRateThrottle]

    @transaction.atomic
    def post(self, request):
        items = request.data.get("items", [])
        if not isinstance(items, list) or not items:
            return Response({"detail": "Expected a non-empty list of items"}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.get_or_create(user=request.user)

        merged_items, skipped_items, failed_items = [], [], []

        # Pre-fetch variants to reduce DB queries
        variant_ids = [i.get("product_variant_id") for i in items]
        variants_map = {v.id: v for v in ProductVariant.objects.filter(id__in=variant_ids)}

        for item in items:
            serializer = CartItemInputSerializer(data=item)
            if not serializer.is_valid():
                skipped_items.append({"item": item, "errors": serializer.errors})
                continue

            data = serializer.validated_data
            variant_id = data["product_variant_id"]
            quantity = data["quantity"]
            ref_code = data.get("referral_code")

            variant = variants_map.get(variant_id)
            if not variant:
                failed_items.append({"item": item, "error": "Variant not found"})
                continue

            try:
                # Check stock
                check_stock(variant, quantity)

                # Merge into cart
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product_variant=variant,
                    defaults={"quantity": quantity, "referral_code": ref_code},
                )

                if not created:
                    new_qty = cart_item.quantity + quantity
                    check_stock(variant, new_qty)
                    cart_item.quantity = new_qty
                    if ref_code is not None:
                        cart_item.referral_code = ref_code
                    cart_item.save()

                merged_items.append({
                    "variant_id": variant_id,
                    "quantity": cart_item.quantity,
                    "created": created,
                })

            except serializers.ValidationError as e:
                failed_items.append({"item": item, "error": e.detail})
            except Exception as e:
                failed_items.append({"item": item, "error": str(e)})

        return Response({
            "detail": "Cart merged successfully",
            "cart": CartSummarySerializer(cart).data,
            "merged_items": merged_items,
            "skipped_items": skipped_items,
            "failed_items": failed_items,
        }, status=status.HTTP_200_OK)


# =====================================================
# PRODUCT VARIANT BULK FETCH
# =====================================================
class ProductVariantBulkAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        variant_ids = request.data.get("variant_ids", [])
        if not isinstance(variant_ids, list):
            return Response({"error": "variant_ids must be a list"}, status=400)

        variants = ProductVariant.objects.filter(id__in=variant_ids).prefetch_related(
            "images"
        )
        from products.serializers import ProductVariantSerializer

        serializer = ProductVariantSerializer(variants, many=True)
        return Response(serializer.data)


# =====================================================
# GUEST CART DETAILS
# =====================================================
class GuestCartDetailsAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        guest_cart = request.data.get("cart", [])
        if not guest_cart:
            return Response({"items": [], "total_quantity": 0, "total_price": "0.00"})

        variant_ids = [i["product_variant_id"] for i in guest_cart]
        variants = ProductVariant.objects.filter(id__in=variant_ids).prefetch_related(
            "images"
        )

        from products.serializers import ProductVariantSerializer
        serialized = ProductVariantSerializer(variants, many=True).data
        variant_map = {v["id"]: v for v in serialized}

        items, total_qty, total_price = [], 0, Decimal("0.00")

        for item in guest_cart:
            vid = item["product_variant_id"]
            qty = int(item.get("quantity", 1))
            v = variant_map.get(vid)

            if v:
                price = Decimal(str(v["final_price"]))
                items.append({**v, "quantity": qty, "price": str(price)})
                total_qty += qty
                total_price += price * qty

        return Response({
            "items": items,
            "total_quantity": total_qty,
            "total_price": str(total_price)
        })
