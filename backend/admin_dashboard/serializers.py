
from django.db.models import Avg, Count, Q, F, ExpressionWrapper, DurationField
from rest_framework import serializers
from products.models import Product, ProductVariant, Category,ProductVariantImage
from orders.models import Order, OrderItem,ReplacementRequest,ReturnRequest
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count,Max
from django.db.models.functions import TruncMonth, TruncDay
from products.serializers import CategorySerializer,ProductVariantSerializer
from django.db import transaction
from orders.serializers import ShippingAddressSerializer
import random
import string
from .models import AdminLog
from products.serializers import ProductVariantImageSerializer
import logging
logger = logging.getLogger('admin_dashboard')
logger.debug("🚨 Logging test: This should appear in your terminal")

User = get_user_model()

class AdminDashboardStatsSerializer(serializers.Serializer):
    # Basic metrics
    total_orders = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    average_order_value = serializers.SerializerMethodField()
    total_products = serializers.SerializerMethodField()
    total_customers = serializers.SerializerMethodField()
    pending_orders = serializers.SerializerMethodField()
    total_returns = serializers.SerializerMethodField()
    total_replacements = serializers.SerializerMethodField()

    # Advanced metrics
    monthly_sales = serializers.SerializerMethodField()
    weekly_sales = serializers.SerializerMethodField()
    top_products = serializers.SerializerMethodField()
    low_stock_products = serializers.SerializerMethodField()
    orders_by_status = serializers.SerializerMethodField()
    orders_by_payment_method = serializers.SerializerMethodField()
    returns_rate = serializers.SerializerMethodField()
    top_customers = serializers.SerializerMethodField()
    new_customers_monthly = serializers.SerializerMethodField()

    # ---------------- Basic Stats ----------------
    def get_total_orders(self, obj):
        return Order.objects.count()
    
    def get_total_sales(self, obj):
        return Order.objects.aggregate(total=Sum('total'))['total'] or 0

    def get_average_order_value(self, obj):
        total_orders = self.get_total_orders(obj)
        total_sales = self.get_total_sales(obj)
        return round(total_sales / total_orders, 2) if total_orders else 0

    def get_total_products(self, obj):
        return Product.objects.count()

    def get_total_customers(self, obj):
        return User.objects.filter(role='customer').count()

    def get_pending_orders(self, obj):
        return Order.objects.filter(status='pending').count()

    # ---------------- Advanced Metrics ----------------
    def get_monthly_sales(self, obj):
        sales = (
            Order.objects.filter(is_paid=True)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('total'))
            .order_by('month')
        )
        return [{"month": s['month'].strftime("%b %Y"), "total": s['total']} for s in sales]
    
    def get_weekly_sales(self, obj):
        sales = (
            Order.objects.filter(is_paid=True)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(total=Sum('total'))
            .order_by('day')
        )
        return [{"day": s['day'].strftime("%d %b"), "total": s['total']} for s in sales]

    def get_top_products(self, obj):
        top_products = (
            OrderItem.objects
            .values('product_variant__product__id', 'product_variant__product__name')
            .annotate(total_sold=Sum('quantity'))
            .order_by('-total_sold')[:5]
        )
        return [{"id": p['product_variant__product__id'], "name": p['product_variant__product__name'], "sold": p['total_sold']} for p in top_products]

    def get_low_stock_products(self, obj):
        return list(ProductVariant.objects.filter(stock__lte=5).values('id', 'product__name', 'stock'))

    def get_orders_by_status(self, obj):
        queryset = Order.objects.values('status').annotate(count=Count('id'))
        return {item['status']: item['count'] for item in queryset}

    def get_orders_by_payment_method(self, obj):
        queryset = Order.objects.values('payment_method').annotate(count=Count('id'))
        return {item['payment_method']: item['count'] for item in queryset}

    def get_returns_rate(self, obj):
        total_orders = self.get_total_orders(obj)
        total_returns = self.get_total_returns(obj)
        return round((total_returns / total_orders) * 100, 2) if total_orders else 0

    def get_top_customers(self, obj):
        top_customers = (
            Order.objects.values('user__id', 'user__email')
            .annotate(order_count=Count('id'), total_spent=Sum('total'))
            .order_by('-total_spent')[:5]
        )
        return [
            {
                "id": c['user__id'],
                "email": c['user__email'],
                "orders": c['order_count'],
                "spent": c['total_spent']
            }
            for c in top_customers
        ]

    def get_new_customers_monthly(self, obj):
        customers = (
            User.objects.filter(role='customer')
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        return [{"month": c['month'].strftime("%b %Y"), "count": c['count']} for c in customers]

    def get_total_returns(self, obj):
        return ReturnRequest.objects.filter(status='approved').count()

    def get_total_replacements(self, obj):
        return ReplacementRequest.objects.filter(status='approved').count()

class ProductVariantAdminSerializer(serializers.ModelSerializer):
    images = ProductVariantImageSerializer(many=True, required=False)
    primary_image_url = serializers.SerializerMethodField()
    remove_images = serializers.ListField(child=serializers.IntegerField(), required=False)
    existing_images = serializers.ListField(child=serializers.DictField(), required=False)
    sku = serializers.CharField(required=False, allow_blank=True)
    allow_return = serializers.BooleanField(required=False)
    return_days = serializers.IntegerField(required=False, allow_null=True)
    allow_replacement = serializers.BooleanField(required=False)
    replacement_days = serializers.IntegerField(required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    promoter_commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id", "variant_name", "base_price", "offer_price", "stock", "featured",
            "sku", "description", "images", "primary_image_url", "remove_images", "existing_images",
            "allow_return", "return_days", "allow_replacement", "replacement_days", "weight",  # <-- add this
            "promoter_commission_rate",  # ✅ Added
        ]

    def validate(self, attrs):
        if attrs.get("allow_return") and (not attrs.get("return_days") or attrs["return_days"] <= 0):
            raise serializers.ValidationError("Return days must be > 0 if returns are allowed.")
        if attrs.get("allow_replacement") and (not attrs.get("replacement_days") or attrs["replacement_days"] <= 0):
            raise serializers.ValidationError("Replacement days must be > 0 if replacement is allowed.")
        return attrs

    def get_primary_image_url(self, obj):
        first_image = obj.images.first()
        return first_image.url if first_image else None

    def create(self, validated_data):
        # Remove nested/non-model keys
        images_data = validated_data.pop("images", [])
        existing_images = validated_data.pop("existingImages", [])
        validated_data.pop("remove_images", None)  # remove if present

        # Auto-generate SKU if missing
        product = self.context["product"]
        validated_data["sku"] = validated_data.get("sku") or self.generate_sku(product.name)

        # Create the variant
        variant = ProductVariant.objects.create(
            product=product,
            weight=validated_data.get("weight", ""),
            promoter_commission_rate=validated_data.get("promoter_commission_rate", ""),
            **validated_data
        )
        # Add all images
        all_images = existing_images + images_data
        for img_data in all_images:
            ProductVariantImage.objects.create(variant=variant, **img_data)

        return variant


    def update(self, instance, validated_data):
        images_data = validated_data.pop("images", [])
        existing_images = validated_data.pop("existingImages", [])
        remove_images = validated_data.pop("remove_images", [])

        if not validated_data.get("sku"):
            validated_data["sku"] = instance.sku or self.generate_sku(instance.product.name)

        # Delete marked images
        if remove_images:
            instance.images.filter(id__in=remove_images).delete()

        for attr in [
            "variant_name", "base_price", "offer_price", "stock", "featured",
            "description", "allow_return", "return_days", "allow_replacement",
            "replacement_days", "weight", "promoter_commission_rate"
        ]:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        instance.save()

        # Merge image data
        all_images = existing_images + images_data
        existing_image_map = {img.id: img for img in instance.images.all()}
        incoming_ids = [img.get("id") for img in all_images if img.get("id")]

        # Delete images not in incoming list
        if incoming_ids:
            for img_id in set(existing_image_map) - set(incoming_ids):
                existing_image_map[img_id].delete()

        # Update or add images
        for img_data in all_images:
            img_id = img_data.get("id")
            if img_id and img_id in existing_image_map:
                img_instance = existing_image_map[img_id]
                for k, v in img_data.items():
                    if k != "id":
                        setattr(img_instance, k, v)
                img_instance.save()
            elif img_data.get("image"):
                ProductVariantImage.objects.create(variant=instance, **img_data)

        return instance

    def generate_sku(self, product_name):
        base = "".join(e for e in product_name if e.isalnum()).upper()[:3]
        rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"{base}-{rand}"

class ProductAdminSerializer(serializers.ModelSerializer):
    variants = ProductVariantAdminSerializer(many=True, required=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), write_only=True, required=True
    )
    category = CategorySerializer(read_only=True)
    image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    image_url = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "is_available", "featured",
            "created_at", "image", "image_url", "category", "category_id", "variants"
        ]
        extra_kwargs = {
            "name": {"required": True},
            "description": {"required": True},
            "slug": {"required": False},
        }

    def validate(self, attrs):
        variant_names = [v["variant_name"] for v in attrs.get("variants", [])]
        if len(variant_names) != len(set(variant_names)):
            raise serializers.ValidationError("Duplicate variant names are not allowed.")
        
        # Ensure each variant has at least one image
        for idx, variant in enumerate(attrs.get("variants", []), start=1):
            images = variant.get("images", [])
            existing_images = variant.get("existingImages", [])  # for updates
            total_images = len(images) + len(existing_images or [])
            if total_images == 0:
                raise serializers.ValidationError(
                    f"Variant #{idx} ('{variant.get('variant_name', '')}') must have at least one image."
                )
        return attrs

    def generate_sku(self, product_name):
        base = "".join(e for e in product_name if e.isalnum()).upper()[:3]
        rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"{base}-{rand}"

    @transaction.atomic
    def create(self, validated_data):
        variants_data = validated_data.pop("variants")
        category = validated_data.pop("category_id")
        product = Product.objects.create(category=category, **validated_data)

        for variant_data in variants_data:
            variant_data["description"] = variant_data.get("description") or product.description
            variant_data["sku"] = variant_data.get("sku") or self.generate_sku(product.name)
            serializer = ProductVariantAdminSerializer(
                data=variant_data, context={"product": product}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        variants_data = validated_data.pop("variants", None)
        category = validated_data.pop("category_id", None)

        # ---------------- Handle main product image removal ----------------
        if request and request.data.get("remove_image"):
            if instance.image:
                instance.image.delete(save=False)
            instance.image = None
            instance.image_url = None

        # ---------------- Update main product fields ----------------
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if category:
            instance.category = category
        instance.save()

        # ---------------- Update variants ----------------
        if variants_data is not None:
            existing_variants = {v.id: v for v in instance.variants.all()}

            for variant_data in variants_data:
                variant_id = variant_data.get("id")
                remove_images = variant_data.pop("remove_images", [])

                # Filter out images marked for removal
                images_to_keep = [
                    img for img in variant_data.get("images", [])
                    if not (isinstance(img, dict) and img.get("id") in remove_images)
                ]
                variant_data["images"] = images_to_keep
                variant_data["existingImages"] = variant_data.get("existingImages", [])
                if variant_id and variant_id in existing_variants:
                    variant_instance = existing_variants.pop(variant_id)

                    # Check remaining images
                    remaining_count = len(images_to_keep) + variant_instance.images.exclude(id__in=remove_images).count()
                    if remaining_count == 0:
                        raise serializers.ValidationError(
                            f"Variant '{variant_instance.variant_name}' must have at least one image."
                        )

                    serializer = ProductVariantAdminSerializer(
                        variant_instance,
                        data=variant_data,
                        context={"product": instance},
                        partial=True
                    )
                    serializer.is_valid(raise_exception=True)
                    variant = serializer.save()

                    # Delete images marked for removal
                    if remove_images:
                        variant.images.filter(id__in=remove_images).delete()
                else:
                    # Create new variant
                    serializer = ProductVariantAdminSerializer(
                        data=variant_data,
                        context={"product": instance}
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()

            # Delete any variants that were removed entirely
            for remaining_variant in existing_variants.values():
                remaining_variant.delete()

            # Ensure at least one variant exists
            if instance.variants.count() == 0:
                raise serializers.ValidationError("A product must have at least one variant.")

        return instance


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    auth_provider_display = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p")
    updated_at = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p")
    last_activation_email_sent = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p", required=False)
    last_password_reset_sent = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p", required=False)
    blocked_until = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p", required=False)
    blocked_until_password_reset = serializers.DateTimeField(format="%d-%b-%Y %I:%M %p", required=False)

    # --- New fields for admin panel ---
    total_orders = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_order_date = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone_number',
            'address', 'pincode', 'district', 'city', 'state',
            'is_active', 'is_verified', 'role', 'auth_provider', 'auth_provider_display',
            'created_at', 'updated_at',
            'social_auth_pro_pic', 'custom_user_profile', 'profile_picture_url',
            'last_activation_email_sent', 'last_password_reset_sent',
            'blocked_until', 'block_count', 'is_permanently_banned',
            'blocked_until_password_reset', 'block_count_password_reset',
            'last_login_ip',
            'total_orders', 'total_spent', 'last_order_date',  # new fields
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_profile_picture_url(self, obj):
        return obj.custom_user_profile if obj.custom_user_profile else obj.social_auth_pro_pic

    def get_auth_provider_display(self, obj):
        return obj.get_auth_provider_display()

    def get_total_orders(self, obj):
        return Order.objects.filter(user=obj).count()

    def get_total_spent(self, obj):
        total = Order.objects.filter(user=obj, status='delivered').aggregate(Sum('total'))['total__sum']
        return total or 0

    def get_last_order_date(self, obj):
        last_order = Order.objects.filter(user=obj, status='delivered').aggregate(Max('created_at'))['created_at__max']
        return last_order.strftime("%d-%b-%Y %I:%M %p") if last_order else None


class AdminOrderItemSerializer(serializers.ModelSerializer):
    # Nested product info (read-only)
    product_variant = ProductVariantSerializer(read_only=True)

    # Optional: dynamically show if return or replacement exists
    return_request = serializers.SerializerMethodField()
    replacement_request = serializers.SerializerMethodField()

    # Write-only IDs (for creation/updating if needed)
    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), write_only=True, source='order', required=False
    )
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), write_only=True, source='product_variant', required=False
    )

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'order_id',
            'product_variant',
            'product_variant_id',
            'quantity',
            'price',
            'status',
            'return_request',
            'replacement_request',
        ]

    def get_return_request(self, obj):
        if hasattr(obj, 'return_request') and obj.return_request:
            return {
                'id': obj.return_request.id,
                'status': obj.return_request.status,
                'created_at': obj.return_request.created_at
            }
        return None

    def get_replacement_request(self, obj):
        if hasattr(obj, 'replacement_request') and obj.replacement_request:
            return {
                'id': obj.replacement_request.id,
                'status': obj.replacement_request.status,
                'created_at': obj.replacement_request.created_at
            }
        return None

    def validate_quantity(self, value):
        product_variant_id = self.initial_data.get('product_variant_id')
        if product_variant_id:
            variant = ProductVariant.objects.filter(id=product_variant_id).first()
            if variant and value > variant.stock:
                raise serializers.ValidationError("Quantity exceeds available stock.")
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value


class AdminOrderSerializer(serializers.ModelSerializer):
    shipping_address = ShippingAddressSerializer(read_only=True)
    items = AdminOrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    refund_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id','order_number','user','shipping_address','status','subtotal',
                  'delivery_charge','total_commission','total','payment_method','is_paid',
                  'paid_at','razorpay_order_id','razorpay_payment_id','has_refund',
                  'refund_status','promoter','cancel_reason','cancelled_at','cancelled_by','cancelled_by_role','is_restocked','courier','waybill','tracking_url','label_url','label_generated_at','shipped_at','handoff_timestamp','delivered_at','checkout_session_id','items','created_at','updated_at',
        ]
        read_only_fields = fields

    def get_refund_status(self, obj):
        # Return status of latest approved return request if exists
        latest_return = getattr(obj, 'return_requests', None)
        if latest_return:
            latest = obj.return_requests.order_by('-created_at').first()
            return latest.status if latest else None
        return None

class AdminLogSerializer(serializers.ModelSerializer):
    order_item = serializers.SerializerMethodField()
    order = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()
    formatted_timestamp = serializers.SerializerMethodField()

    class Meta:
        model = AdminLog
        fields = [
            'id', 'order_item', 'order', 'formatted_timestamp',
            'action', 'updated_by', 'comment', 'timestamp', 'action_display'
        ]
        read_only_fields = ['id', 'timestamp', 'updated_by']

    def get_action_display(self, obj):
        return obj.get_action_display()

    def get_order_item(self, obj):
        variant = getattr(obj.order_item, 'product_variant', None)
        product = getattr(variant, 'product', None)

        product_image = (
            getattr(variant, 'image_url', None)
            or (variant.images.first().url if hasattr(variant, 'images') and variant.images.exists() else None)
            or getattr(product, 'image_url', None)
            or ''
        )

        return {
            "id": obj.order_item.id,
            "product": getattr(product, 'name', ''),
            "variant": getattr(variant, 'variant_name', ''),
            "quantity": obj.order_item.quantity,
            "product_image": product_image,
            "status": obj.order_item.status
        }

    def get_order(self, obj):
        order = obj.order
        if order:
            return {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status,
                'total': order.total
            }
        return None

    def get_updated_by(self, obj):
        user = obj.updated_by
        if user:
            return {
                'id': user.id,
                'name': user.get_full_name() or user.get_short_name() or user.username,
                'email': user.email
            }
        return None

    def get_formatted_timestamp(self, obj):
        return obj.timestamp.strftime('%d %b %Y, %I:%M %p')

