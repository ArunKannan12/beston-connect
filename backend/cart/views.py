from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.throttling import UserRateThrottle

from .serializers import CartItemSerializer, CartSummarySerializer,CartItemInputSerializer
from .models import CartItem, Cart
from accounts.permissions import IsCustomer
from products.models import ProductVariant
from products.serializers import ProductVariantSerializer
from .utils import check_stock

class CartItemListCreateApiView(ListCreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        product_variant = serializer.validated_data.get('product_variant')
        quantity = serializer.validated_data.get('quantity')
        existing_item = CartItem.objects.filter(cart=cart, product_variant=product_variant).first()

        if existing_item:
            new_quantity = existing_item.quantity + quantity
            check_stock(product_variant, new_quantity)
            existing_item.quantity = new_quantity
            existing_item.save()
        else:
            check_stock(product_variant, quantity)
            serializer.save(cart=cart)


class CartItemRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]
    lookup_field = 'id'

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)
    @transaction.atomic

    def perform_update(self, serializer):
        item = serializer.instance

        if item.cart.user != self.request.user:
            raise ValidationError("You can't update items in someone else's cart.")

        new_quantity = serializer.validated_data.get('quantity')
        if new_quantity > item.product_variant.stock:
            raise ValidationError("Not enough stock available.")
        check_stock(item.product_variant, new_quantity)
        serializer.save(quantity=new_quantity)

    def perform_destroy(self, instance):
        if instance.cart.user != self.request.user:
            raise ValidationError("You can't remove items from someone else's cart.")
        instance.delete()


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

        serializer = CartSummarySerializer(cart, context={'request': request})
        return Response(serializer.data)


class CartMergeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    throttle_classes = [UserRateThrottle]

    @transaction.atomic
    def post(self, request):
        print(f"[CartMerge] User: {request.user}")

        items = request.data.get("items", [])
        if not isinstance(items, list):
            print(f"[CartMerge] Invalid payload: Expected a list, got {type(items).__name__}")
            return Response({"error": "Expected a list of items"}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        print(f"[CartMerge] Cart ID: {cart.id}")

        merged_items = []
        skipped_items = []
        failed_items = []

        # Prefetch variants for performance
        variant_ids = [i.get("product_variant_id") for i in items if isinstance(i, dict)]
        variants_map = {v.id: v for v in ProductVariant.objects.filter(id__in=variant_ids)}

        for idx, item in enumerate(items):
            print(f"[CartMerge] Processing item {idx + 1}: {item}")

            serializer = CartItemInputSerializer(data=item)
            if not serializer.is_valid():
                print(f"[CartMerge] Skipped: Invalid item data - {serializer.errors}")
                skipped_items.append({
                    "item": item,
                    "errors": serializer.errors
                })
                continue

            validated_data = serializer.validated_data
            variant_id = validated_data['product_variant_id']
            quantity = validated_data['quantity']
            source = item.get("source", "add_to_cart")  # Optional source tag

            variant = variants_map.get(variant_id)
            if not variant:
                print(f"[CartMerge] Failed: Variant {variant_id} not found")
                failed_items.append({
                    "variant_id": variant_id,
                    "error": "Variant not found",
                    "item": item
                })
                continue

            try:
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product_variant=variant,
                    defaults={'quantity': quantity}
                )
                if created:
                    print(f"[CartMerge] Created new cart item")
                    check_stock(variant, quantity)
                else:
                    new_quantity = cart_item.quantity + quantity
                    print(f"[CartMerge] Updated cart item: {cart_item.quantity} → {new_quantity}")
                    check_stock(variant, new_quantity)
                    cart_item.quantity = new_quantity
                    cart_item.save()

                merged_items.append({
                    "variant_id": variant_id,
                    "quantity": cart_item.quantity,
                    "created": created,
                    "source": source
                })

            except Exception as e:
                print(f"[CartMerge] Failed to merge item {variant_id}: {str(e)}")
                failed_items.append({
                    "variant_id": variant_id,
                    "error": str(e),
                    "item": item
                })

        print(f"[CartMerge] Merge complete. Merged: {len(merged_items)}, Skipped: {len(skipped_items)}, Failed: {len(failed_items)}")

        return Response({
            "detail": "Cart merged successfully",
            "cart": CartSummarySerializer(cart, context={'request': request}).data,
            "merged_items": merged_items,
            "skipped_items": skipped_items,
            "failed_items": failed_items
        })


class ProductVariantBulkAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        variant_ids = request.data.get('variant_ids', [])
        if not isinstance(variant_ids, list):
            return Response({"error": "variant_ids must be a list"}, status=400)

        variants = ProductVariant.objects.filter(id__in=variant_ids).prefetch_related('images')
        serializer = ProductVariantSerializer(variants, many=True, context={'request': request})
        return Response(serializer.data)


from decimal import Decimal

class GuestCartDetailsAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        guest_cart = request.data.get("cart", [])
        if not isinstance(guest_cart, list) or not guest_cart:
            return Response({"items": [], "total_quantity": 0, "total_price": "0.00"}, status=200)

        variant_ids = [item.get("product_variant_id") for item in guest_cart if item.get("product_variant_id")]
        variants = ProductVariant.objects.filter(id__in=variant_ids).select_related('product').prefetch_related('images')

        serialized_variants = ProductVariantSerializer(variants, many=True, context={'request': request}).data
        variant_map = {v["id"]: v for v in serialized_variants}

        items = []
        total_quantity = 0
        total_price = Decimal("0.00")

        for cart_item in guest_cart:
            variant_id = cart_item.get("product_variant_id")
            quantity = int(cart_item.get("quantity", 1))
            variant_data = variant_map.get(variant_id)
            if variant_data:
                price = Decimal(str(variant_data.get("final_price", "0.00")))
                items.append({**variant_data, "quantity": quantity, "price": str(price)})
                total_quantity += quantity
                total_price += price * quantity

        return Response({
            "items": items,
            "total_quantity": total_quantity,
            "total_price": str(total_price)
        }, status=200)
