from rest_framework import serializers
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import (
                Category, 
                Product, 
                ProductVariant, 
                ProductVariantImage, 
                Banner,
                ProductRating,
                
                )

# Configurable thresholds
LOW_STOCK_THRESHOLD = getattr(settings, "LOW_STOCK_THRESHOLD", 5)
NEW_PRODUCT_DAYS = getattr(settings, "NEW_PRODUCT_DAYS", 7)

# -------------------- CATEGORY --------------------
class CategorySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'image_url']
        read_only_fields = ['id', 'image_url', 'slug']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image_url:
            return obj.image_url
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    def create(self, validated_data):
        image_file = validated_data.pop("image", None)
        category = Category(**validated_data)

        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(
                    image_file,
                    folder="ecommerce/category_images"
                )
                category.image_url = upload_result.get("secure_url")
            except Exception as e:
                raise serializers.ValidationError(f"Cloudinary upload failed: {e}")

        category.save()
        return category

    def update(self, instance, validated_data):
        request = self.context.get('request')
        image_file = validated_data.pop("image", None)

        # Remove existing image if requested
        if request and request.data.get("remove_image") and instance.image:
            instance.image.delete(save=False)
            instance.image = None
            instance.image_url = None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(
                    image_file,
                    folder="ecommerce/category_images"
                )
                instance.image_url = upload_result.get("secure_url")
            except Exception as e:
                raise serializers.ValidationError(f"Cloudinary upload failed: {e}")

        instance.save()
        return instance


# -------------------- PRODUCT VARIANT IMAGE --------------------
class ProductVariantImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariantImage
        fields = ['id', 'alt_text', 'image_url','image']
        extra_kwargs = {
            'alt_text': {'required': False}
        }

    def get_image_url(self, obj):
        return obj.url

# -------------------- PRODUCT VARIANT --------------------
class ProductVariantSerializer(serializers.ModelSerializer):
    images = ProductVariantImageSerializer(many=True, read_only=True)
    final_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    primary_image_url = serializers.SerializerMethodField()
    is_new = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    # Parent product info
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_category = serializers.CharField(source="product.category.name", read_only=True)
    product_created_at = serializers.DateTimeField(source="product.created_at", read_only=True)

    # Simplified flags
    is_returnable = serializers.BooleanField(source='allow_return', read_only=True)
    is_replaceable = serializers.BooleanField(source='allow_replacement', read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'variant_name', 'description', 'sku', 'base_price', 'featured',
            'offer_price', 'final_price', 'discount_percent', 'stock',
            'is_low_stock', 'is_active', 'images', 'primary_image_url', 'weight', 'promoter_commission_rate',
            'product_id', 'product_name', 'product_slug', 'product_category', 'product_created_at', 'is_new','average_rating','rating_count',
            'allow_return', 'return_days', 'allow_replacement', 'replacement_days', 'is_returnable', 'is_replaceable',
        ]
        extra_kwargs = {
            'variant_name': {'required': True},
            'stock': {'required': True},
            'base_price': {'required': True},
            'sku': {'required': False}
        }

    # ---------------- SerializerMethodFields ----------------
    def get_final_price(self, obj):
        return Decimal(obj.offer_price or obj.base_price)

    def get_discount_percent(self, obj):
        if obj.offer_price and obj.base_price and obj.offer_price < obj.base_price:
            return round(((obj.base_price - obj.offer_price) / obj.base_price) * 100)
        return 0

    def get_is_low_stock(self, obj):
        return 0 < obj.stock < LOW_STOCK_THRESHOLD

    def get_primary_image_url(self, obj):
        first_image = obj.images.first()
        if first_image and hasattr(first_image, 'url'):
            return first_image.url
        return getattr(obj.product, 'image_url', None)

    def get_is_new(self, obj):
        return obj.product.created_at >= timezone.now() - timedelta(days=NEW_PRODUCT_DAYS)

    def get_description(self, obj):
        return obj.description or obj.product.description

    # ---------------- Validation ----------------
    def validate(self, attrs):
        for flag_field, days_field in [('allow_return', 'return_days'), ('allow_replacement', 'replacement_days')]:
            if attrs.get(flag_field):
                days = attrs.get(days_field)
                if not days or days <= 0:
                    raise serializers.ValidationError(
                        {days_field: f"{days_field.replace('_', ' ').title()} must be greater than 0 if {flag_field.replace('_', ' ')} is True."}
                    )
            else:
                attrs[days_field] = None
        return attrs

    # ---------------- Update with multiple image removal ----------------
    def update(self, instance, validated_data):
        request = self.context.get('request')

        # Remove main image if requested
        if request and request.data.get('remove_image') and getattr(instance, 'image', None):
            instance.image.delete(save=False)
            instance.image = None

        # Remove multiple images if IDs provided
        remove_image_ids = []
        if request:
            if hasattr(request.data, 'getlist'):
                remove_image_ids = request.data.getlist('remove_images')
            else:
                remove_image_ids = request.data.get('remove_images', [])

        if remove_image_ids and hasattr(instance, 'images'):
            images_to_remove = instance.images.filter(id__in=remove_image_ids)
            for img in images_to_remove:
                img.image.delete(save=False)
                img.delete()

        return super().update(instance, validated_data)
    
# -------------------- PRODUCT --------------------
class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    matched_variant = serializers.SerializerMethodField()

    # Pricing & stock
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    # Merchandising flags
    is_new = serializers.SerializerMethodField()
    has_returnable_variant = serializers.SerializerMethodField()
    has_replaceable_variant = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'is_available', 'featured',
            'created_at', 'image_url', 'category', 'variants', 'matched_variant',
            'min_price', 'max_price', 'total_stock', 'is_low_stock', 'is_new',
            'has_returnable_variant', 'has_replaceable_variant'
        ]

    def get_image_url(self, obj):
        try:
            return obj.image_url or (obj.image.url if obj.image else None)
        except ValueError:
            return obj.image_url or None

    def get_matched_variant(self, obj):
        query = self.context.get("search_query", "").lower()
        if not query:
            return None
        match = obj.variants.filter(
            Q(variant_name__icontains=query) |
            Q(description__icontains=query) |
            Q(sku__icontains=query)
        ).first()
        return ProductVariantSerializer(match, context=self.context).data if match else None

    def get_min_price(self, obj):
        return min((v.final_price for v in obj.variants.all()), default=None)

    def get_max_price(self, obj):
        return max((v.final_price for v in obj.variants.all()), default=None)

    def get_total_stock(self, obj):
        return sum(v.stock for v in obj.variants.all())

    def get_is_low_stock(self, obj):
        return any(v.stock <= LOW_STOCK_THRESHOLD for v in obj.variants.all())

    def get_is_new(self, obj):
        return obj.created_at >= timezone.now() - timedelta(days=NEW_PRODUCT_DAYS)

    def get_has_returnable_variant(self, obj):
        return any(v.allow_return for v in obj.variants.all())

    def get_has_replaceable_variant(self, obj):
        return any(v.allow_replacement for v in obj.variants.all())
# -------------------- BANNER --------------------
import cloudinary.uploader
class BannerSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            "id", "title", "subtitle", "image", "image_url",
            "link_url", "order", "is_active", "preview_url"
        ]
        read_only_fields = ["id", "image_url", "preview_url"]

    def validate_order(self, value):
        if value < 1:
            raise serializers.ValidationError("Order must be greater than or equal to 1")
        return value

    def get_preview_url(self, obj):
        return obj.image_url

    def create(self, validated_data):
        image_file = validated_data.pop("image", None)
        banner = Banner(**validated_data)

        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(
                    image_file,
                    folder="ecommerce/banners"
                )
                banner.image_url = upload_result.get("secure_url")
            except Exception as e:
                raise serializers.ValidationError(f"Cloudinary upload failed: {e}")

        banner.save()
        return banner

    def update(self, instance, validated_data):
        image_file = validated_data.pop("image", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(
                    image_file,
                    folder="ecommerce/banners"
                )
                instance.image_url = upload_result.get("secure_url")
            except Exception as e:
                raise serializers.ValidationError(f"Cloudinary upload failed: {e}")

        instance.save()
        return instance

class ProductRatingCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductRating
        fields = ["rating", "review"]

class ProductRatingListSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductRating
        fields = ["id", "rating", "review", "created_at", "user_name"]

    def get_user_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.first_name
