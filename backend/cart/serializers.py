from django.contrib.auth import get_user_model
from rest_framework import serializers
from products.models import ProductVariant
from .models import Cart, CartItem

User = get_user_model()


# =========================
# CART SERIALIZER
# =========================
class CartSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Cart
        fields = ["id", "created_at"]
        read_only_fields = ["id", "created_at"]


# =========================
# CART ITEM - INPUT (WRITE)
# =========================
class CartItemInputSerializer(serializers.Serializer):
    """
    Used for CREATE / UPDATE.
    """
    product_variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField()
    referral_code = serializers.CharField(required=False, allow_blank=True,allow_null=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


# =========================
# CART ITEM - OUTPUT (READ)
# =========================
class CartItemSerializer(serializers.ModelSerializer):
    # --- Variant core (READ ONLY) ---
    variant_id = serializers.IntegerField(source="product_variant.id", read_only=True)
    variant_name = serializers.CharField(source="product_variant.variant_name", read_only=True)
    sku = serializers.CharField(source="product_variant.sku", read_only=True)

    base_price = serializers.DecimalField(source="product_variant.base_price", max_digits=10, decimal_places=2, read_only=True)
    offer_price = serializers.DecimalField(source="product_variant.offer_price", max_digits=10, decimal_places=2, read_only=True)
    final_price = serializers.DecimalField(source="product_variant.final_price", max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(source="product_variant.stock", read_only=True)
    is_active = serializers.BooleanField(source="product_variant.is_active", read_only=True)

    # Return/Replacement flags
    is_returnable = serializers.BooleanField(source="product_variant.allow_return", read_only=True)
    is_replaceable = serializers.BooleanField(source="product_variant.allow_replacement", read_only=True)
    return_days = serializers.IntegerField(source="product_variant.return_days", read_only=True)
    replacement_days = serializers.IntegerField(source="product_variant.replacement_days", read_only=True)

    # Product fields
    product_id = serializers.IntegerField(source="product_variant.product.id", read_only=True)
    product_name = serializers.CharField(source="product_variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="product_variant.product.slug", read_only=True)
    product_category = serializers.CharField(source="product_variant.product.category.name", read_only=True)

    # Images
    images = serializers.SerializerMethodField()

    # Cart data
    price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "quantity", "added_at",
            "variant_id", "variant_name", "sku",
            "base_price", "offer_price", "final_price",
            "stock", "is_active",
            "is_returnable", "return_days", "is_replaceable", "replacement_days",
            "images",
            "product_id", "product_name", "product_slug", "product_category",
            "price", "subtotal",
        ]
        read_only_fields = fields

    def get_images(self, obj):
        variant = obj.product_variant
        if variant and hasattr(variant, "images"):
            return [{"id": img.id, "url": getattr(img, "url", None) or img.image.url} for img in variant.images.all()]
        return []

    def get_price(self, obj):
        return obj.product_variant.final_price

    def get_subtotal(self, obj):
        return obj.quantity * obj.product_variant.final_price


# =========================
# CART SUMMARY SERIALIZER
# =========================
class CartSummarySerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source="cartitem_set", many=True, read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "created_at", "items", "total_quantity", "total_price"]
