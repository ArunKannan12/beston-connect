from django.contrib.auth import get_user_model
from products.models import ProductVariant
from products.serializers import ProductVariantSerializer
from rest_framework import serializers
from .models import Cart,CartItem

User=get_user_model()
# Create your models here.


class CartSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    class Meta:
        model=Cart
        fields=['id','created_at']
        read_only_fields = ['id', 'created_at']

class CartItemSerializer(serializers.ModelSerializer):
    # --- ProductVariant fields ---
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

    # Variant images
    images = serializers.SerializerMethodField()

    # --- Product fields ---
    product_id = serializers.IntegerField(source="product_variant.product.id", read_only=True)
    product_name = serializers.CharField(source="product_variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="product_variant.product.slug", read_only=True)
    product_category = serializers.CharField(source="product_variant.product.category.name", read_only=True)

    # --- Cart-specific ---
    quantity = serializers.IntegerField()
    price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product_variant', 'quantity', 'added_at',
            'variant_id', 'variant_name', 'sku', 'base_price', 'offer_price', 'final_price',
            'stock', 'is_active',
            'is_returnable', 'return_days', 'is_replaceable', 'replacement_days',
            'images',
            'product_id', 'product_name', 'product_slug', 'product_category',
            'price', 'subtotal'
        ]
        read_only_fields = [
            'id', 'added_at', 'variant_id', 'variant_name', 'sku', 'base_price', 'offer_price',
            'final_price', 'stock', 'is_active',
            'is_returnable', 'return_days', 'is_replaceable', 'replacement_days',
            'images', 'product_id', 'product_name', 'product_slug', 'product_category',
            'price', 'subtotal'
        ]

    def get_images(self, obj):
        if obj.product_variant and obj.product_variant.images.exists():
            return [{"id": img.id, "url": img.url} for img in obj.product_variant.images.all()]
        return []

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def get_price(self, obj):
        return obj.product_variant.final_price if obj.product_variant else 0

    def get_subtotal(self, obj):
        return obj.quantity * self.get_price(obj)  
    
class CartSummarySerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source='cartitem_set', many=True, read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'created_at', 'items', 'total_quantity', 'total_price']

        
class CartItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.IntegerField()
    quantity=serializers.IntegerField(min_value=1)