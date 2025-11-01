
from rest_framework import serializers
from .serializers import OrderItemLightSerializer,OrderLightSerializer,ShippingAddressSerializer
from .models import ReturnRequest,ReplacementRequest,Order,OrderItem
from django.utils import timezone

class ReturnRequestSerializer(serializers.ModelSerializer):
    order = OrderLightSerializer(read_only=True)
    order_item = OrderItemLightSerializer(read_only=True)
    shipping_address = serializers.SerializerMethodField(read_only=True)
    product = serializers.SerializerMethodField(read_only=True)
    variant = serializers.SerializerMethodField(read_only=True)
    variant_images = serializers.SerializerMethodField(read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True)
    order_number = serializers.CharField(write_only=True)
    order_item_id = serializers.PrimaryKeyRelatedField(queryset=OrderItem.objects.all(), write_only=True)

    class Meta:
        model = ReturnRequest
        fields = [
            "id", "order", "order_item", "order_number", "order_item_id",
            "reason", "status", "refund_amount",
            "waybill", "pickup_date", "delivered_back_date",
            "admin_comment", "created_at", "updated_at", "refunded_at",
            "product", "variant", "variant_images", "product_image", "shipping_address"
        ]
        read_only_fields = [
            "order", "order_item", "refund_amount", "waybill",
            "pickup_date", "delivered_back_date", "admin_comment",
            "created_at", "updated_at", "refunded_at",
            "product", "variant", "variant_images", "product_image", "shipping_address"
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None:
            order_number = attrs.get("order_number")
            order_item = attrs.get("order_item_id")

            if not order_number or not order_item:
                raise serializers.ValidationError("Both 'order_number' and 'order_item_id' are required.")

            try:
                order = Order.objects.get(order_number=order_number)
            except Order.DoesNotExist:
                raise serializers.ValidationError({"order_number": "Order not found."})

            if order_item.order != order:
                raise serializers.ValidationError({"order_item_id": "Order item not found for this order."})

            if order.user != user:
                raise serializers.ValidationError("You can only request a return for your own orders.")

            if order.status.lower() != "delivered":
                raise serializers.ValidationError("Return requests can only be created for delivered orders.")
            variant = order_item.product_variant
            if not variant.allow_return:
                raise serializers.ValidationError("This product is not eligible for return.")

            attrs["order"] = order
            attrs["order_item"] = order_item

        return attrs

    def create(self, validated_data):
        order = validated_data.pop("order")
        order_item = validated_data.pop("order_item")
        validated_data.pop("order_number", None)
        validated_data.pop("order_item_id", None)

        refund_amount = order_item.price * order_item.quantity
        
        return ReturnRequest.objects.create(
            order=order,
            order_item=order_item,
            refund_amount=refund_amount,
            **validated_data
        )

    def get_shipping_address(self, obj):
        if obj.order and hasattr(obj.order, "shipping_address"):
            return ShippingAddressSerializer(obj.order.shipping_address).data
        return None

    def get_product(self, obj):
        return getattr(obj.order_item.product_variant.product, "name", None)

    def get_variant(self, obj):
        return getattr(obj.order_item.product_variant, "variant_name", None)

    def get_variant_images(self, obj):
        if obj.order_item and obj.order_item.product_variant:
            return [img.url for img in obj.order_item.product_variant.images.all() if img.url]
        return []

    def get_product_image(self, obj):
        product = getattr(obj.order_item.product_variant, "product", None)
        return getattr(product, "image_url", None) or getattr(product, "image", None)
    
class ReplacementRequestSerializer(serializers.ModelSerializer):
    order = OrderLightSerializer(read_only=True)
    order_item = OrderItemLightSerializer(read_only=True)
    new_order = OrderLightSerializer(read_only=True)
    shipping_address = serializers.SerializerMethodField(read_only=True)
    product = serializers.SerializerMethodField(read_only=True)
    variant = serializers.SerializerMethodField(read_only=True)
    variant_images = serializers.SerializerMethodField(read_only=True)
    replacement_days_remaining = serializers.SerializerMethodField(read_only=True)
    is_replacement_eligible = serializers.SerializerMethodField(read_only=True)

    variant_policy_snapshot = serializers.JSONField(read_only=True)

    order_number = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all(), write_only=True, required=False)
    order_item_id = serializers.PrimaryKeyRelatedField(queryset=OrderItem.objects.all(), write_only=True, required=False)

    class Meta:
        model = ReplacementRequest
        fields = [
            "id", "order", "order_item", "new_order",
            "order_number", "order_item_id", "reason", "status",
            "created_at", "updated_at",
            "product", "variant", "variant_images", "shipping_address",
            "replacement_days_remaining", "is_replacement_eligible",
            "variant_policy_snapshot"
        ]
        read_only_fields = [
            "order", "order_item", "new_order",
            "product", "variant", "variant_images", "shipping_address",
            "replacement_days_remaining", "is_replacement_eligible",
            "variant_policy_snapshot"
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance:
            order = self.instance.order
            order_item = self.instance.order_item
        else:
            order = attrs.get("order_number")
            order_item = attrs.get("order_item_id")

            if not order or not order_item:
                raise serializers.ValidationError("Order and order item are required.")

            if order.user != user:
                raise serializers.ValidationError("You can only request a replacement for your own orders.")

            if order_item.order != order:
                raise serializers.ValidationError("Order item does not belong to this order.")

            if order.status.lower() != "delivered":
                raise serializers.ValidationError("Replacement requests can only be created for delivered orders.")

            if not order_item.product_variant.allow_replacement:
                raise serializers.ValidationError("This product is not eligible for replacement.")

        return attrs

    def create(self, validated_data):
        order = validated_data.pop("order_number")
        order_item = validated_data.pop("order_item_id")

        variant = order_item.product_variant
        validated_data["variant_policy_snapshot"] = {
            "allow_replacement": variant.allow_replacement,
            "replacement_days": variant.replacement_days,
        }

        instance = ReplacementRequest.objects.create(
            order=order,
            order_item=order_item,
            **validated_data
        )

        new_order = Order.objects.create(
            user=order.user,
            shipping_address=order.shipping_address,
            subtotal=order_item.price * order_item.quantity,
            total=order_item.price * order_item.quantity,
            payment_method=order.payment_method,
            status='pending'
        )

        OrderItem.objects.create(
            order=new_order,
            product_variant=order_item.product_variant,
            quantity=order_item.quantity,
            price=order_item.price
        )

        instance.new_order = new_order
        instance.save(update_fields=["new_order"])
        return instance

    def get_shipping_address(self, obj):
        return ShippingAddressSerializer(obj.order.shipping_address).data if obj.order.shipping_address else None

    def get_product(self, obj):
        return getattr(obj.order_item.product_variant.product, "name", None)

    def get_variant(self, obj):
        return getattr(obj.order_item.product_variant, "variant_name", None)

    def get_variant_images(self, obj):
        if obj.order_item and obj.order_item.product_variant:
            return [img.url for img in obj.order_item.product_variant.images.all() if img.url]
        return []

    def get_replacement_days_remaining(self, obj):
        variant = obj.order_item.product_variant
        delta = (timezone.now().date() - obj.order.created_at.date()).days
        return max(variant.replacement_days - delta, 0) if variant.allow_replacement else 0

    def get_is_replacement_eligible(self, obj):
        variant = obj.order_item.product_variant
        delta = (timezone.now().date() - obj.order.created_at.date()).days
        return variant.allow_replacement and delta <= variant.replacement_days