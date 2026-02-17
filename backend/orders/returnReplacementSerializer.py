
from rest_framework import serializers
from .serializers import OrderItemLightSerializer,OrderLightSerializer,ShippingAddressSerializer
from .models import ReturnRequest,ReplacementRequest,Order,OrderItem,OrderItemStatus,OrderStatus
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal



ACTIVE_RETURN_STATUSES = [
    "pending",
    "pp_open",
    "pp_scheduled",
    "pp_dispatched",
    "pu_in_transit",
    "pu_pending",
]

class ReturnRequestSerializer(serializers.ModelSerializer):
    # Nested read-only serializers
    order = OrderLightSerializer(read_only=True)
    order_item = OrderItemLightSerializer(read_only=True)

    # Write-only fields
    order_number = serializers.CharField(write_only=True, required=True)
    order_item_list = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=OrderItem.objects.all()),
        write_only=True,
        required=True
    )

    # Computed read-only fields
    shipping_address = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    variant = serializers.SerializerMethodField()
    variant_images = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    return_days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "order",
            "order_item",
            "order_number",
            "order_item_list",
            "reason",
            "status",
            "refund_amount",
            "waybill",
            "pickup_date",
            "delivered_back_date",
            "return_days_remaining",
            "admin_comment",
            "created_at",
            "updated_at",
            "refunded_at",
            "product",
            "variant",
            "variant_images",
            "product_image",
            "shipping_address",
        ]
        read_only_fields = [
            "order",
            "order_item",
            "status",
            "refund_amount",
            "waybill",
            "pickup_date",
            "delivered_back_date",
            "admin_comment",
            "created_at",
            "updated_at",
            "refunded_at",
            "product",
            "variant",
            "variant_images",
            "product_image",
            "shipping_address",
        ]

    # -------------------- Validation --------------------
    def validate(self, attrs):
        user = self.context["request"].user

        order_number = attrs.get("order_number")
        order_items = attrs.get("order_item_list", [])

        if not order_number or not order_items:
            raise serializers.ValidationError(
                "Order number and at least one order item are required."
            )

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            raise serializers.ValidationError({"order_number": "Order not found."})

        if order.user != user:
            raise serializers.ValidationError(
                "You can only return items from your own orders."
            )

        if order.status != OrderStatus.DELIVERED:
            raise serializers.ValidationError(
                "Return requests are allowed only after delivery."
            )

        validated_items = []
        for item in order_items:
            if item.order != order:
                raise serializers.ValidationError(
                    {"order_item_list": f"Item {item.id} does not belong to this order."}
                )

            variant = item.product_variant
            if not variant.allow_return:
                raise serializers.ValidationError(
                    f"Product {variant.product.name} is not eligible for return."
                )

            if not order.delivered_at:
                raise serializers.ValidationError("Delivery date not available.")

            days_passed = (timezone.now().date() - order.delivered_at.date()).days
            if days_passed > variant.return_days:
                raise serializers.ValidationError(
                    f"Return window expired for item {item.id}. Allowed {variant.return_days} days."
                )

            if ReturnRequest.objects.filter(
                order_item=item, status__in=ACTIVE_RETURN_STATUSES
            ).exists():
                raise serializers.ValidationError(
                    f"A return request is already in progress for item {item.id}."
                )

            validated_items.append(item)

        attrs["order"] = order
        attrs["order_item_list"] = validated_items
        return attrs

    # -------------------- Create --------------------
    def create(self, validated_data):
        order = validated_data.pop("order")
        order_items = validated_data.pop("order_item_list", [])

        created_requests = []

        for item in order_items:
            refund_amount = item.price * item.quantity
            rr = ReturnRequest.objects.create(
                order=order,
                order_item=item,
                refund_amount=refund_amount,
                status="pending",
                user=self.context["request"].user,
                reason=validated_data.get("reason", "")
            )

            item.status = OrderItemStatus.RETURN_INITIATED
            item.save(update_fields=["status"])

            created_requests.append(rr)

        # Return single object if only one request, else list
        if len(created_requests) == 1:
            return created_requests[0]
        return created_requests

    # -------------------- SerializerMethodField helpers --------------------
    def get_shipping_address(self, obj):
        order = getattr(obj, "order", None)
        if order and getattr(order, "shipping_address", None):
            return ShippingAddressSerializer(order.shipping_address).data
        return None

    def get_product(self, obj):
        item = getattr(obj, "order_item", None)
        if not item or not getattr(item, "product_variant", None):
            return None
        product = getattr(item.product_variant, "product", None)
        return getattr(product, "name", None) if product else None

    def get_variant(self, obj):
        item = getattr(obj, "order_item", None)
        if not item or not getattr(item, "product_variant", None):
            return None
        return getattr(item.product_variant, "variant_name", None)

    def get_variant_images(self, obj):
        item = getattr(obj, "order_item", None)
        if not item or not getattr(item, "product_variant", None):
            return []
        images = getattr(item.product_variant, "images", None)
        if not images:
            return []
        return [img.url for img in images.all() if getattr(img, "url", None)]

    def get_product_image(self, obj):
        item = getattr(obj, "order_item", None)
        if not item or not getattr(item, "product_variant", None):
            return None
        product = getattr(item.product_variant, "product", None)
        if not product:
            return None
        return product.image_url or (product.image.url if product.image else None)

    def get_return_days_remaining(self, obj):
        item = getattr(obj, "order_item", None)
        if not item or not getattr(item.order, "delivered_at", None):
            return 0
        allowed_days = getattr(item.product_variant, "return_days", 0) or 0
        delivered_date = item.order.delivered_at.date()
        days_passed = (timezone.now().date() - delivered_date).days
        return max(0, allowed_days - days_passed)




from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from decimal import Decimal
from .models import ReplacementRequest, Order, OrderItem, ShippingAddress

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

    # ---------------------- WRITE FIELDS ----------------------
    order_number = serializers.CharField(write_only=True, required=False)
    order_item_id = serializers.PrimaryKeyRelatedField(queryset=OrderItem.objects.all(), write_only=True)
    admin_decision = serializers.ChoiceField(
        choices=ReplacementRequest.ADMIN_DECISION_CHOICES,
        required=False,
        write_only=True
    )
    admin_comment = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ReplacementRequest
        fields = [
            "id", "order", "order_item", "new_order",
            "order_number", "order_item_id", "reason", "status",
            "created_at", "updated_at",
            "product", "variant", "variant_images", "shipping_address",
            "replacement_days_remaining", "is_replacement_eligible",
            "variant_policy_snapshot", "admin_decision", "admin_comment"
        ]
        read_only_fields = [
            "order", "order_item", "new_order",
            "product", "variant", "variant_images", "shipping_address",
            "replacement_days_remaining", "is_replacement_eligible",
            "variant_policy_snapshot"
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        role = getattr(user, "role", None)

        # Customers cannot update existing requests
        if self.instance and role == "customer":
            raise PermissionDenied(
                "Customers cannot update replacement requests once created."
            )

        if not self.instance:
            order_number = attrs.get("order_number")
            order_item = attrs.get("order_item_id")

            if not order_number or not order_item:
                raise serializers.ValidationError(
                    "Order number and order item are required."
                )

            try:
                order = Order.objects.get(order_number=order_number)
            except Order.DoesNotExist:
                raise serializers.ValidationError({"order_number": "Invalid order number."})

            if order.user != user:
                raise serializers.ValidationError(
                    "You can only request a replacement for your own orders."
                )

            if order_item.order != order:
                raise serializers.ValidationError(
                    "Order item does not belong to this order."
                )

            if order.status.lower() != OrderStatus.DELIVERED:
                raise serializers.ValidationError(
                    "Replacement requests can only be created for delivered orders."
                )

            variant = order_item.product_variant
            days_since_order = (timezone.now().date() - order.created_at.date()).days

            # ---- New replacement period check ----
            if not variant.allow_replacement or days_since_order > variant.replacement_days:
                raise serializers.ValidationError(
                    "Replacement period has expired. Cannot create a replacement request."
                )

            if ReplacementRequest.objects.filter(order_item=order_item).exists():
                raise serializers.ValidationError(
                    "Replacement request already exists for this item."
                )

            # Pass the actual order instance forward
            attrs["order"] = order

        return attrs


    def create(self, validated_data):
        order_number = validated_data.pop("order_number")
        order = validated_data.pop("order")  # actual Order instance
        order_item = validated_data.pop("order_item_id")
        reason = validated_data.pop("reason")

        variant = order_item.product_variant
        validated_data["variant_policy_snapshot"] = {
            "allow_replacement": variant.allow_replacement,
            "replacement_days": variant.replacement_days,
        }

        # Create ReplacementRequest
        instance = ReplacementRequest.objects.create(
            order=order,
            order_item=order_item,
            reason=reason,
            **validated_data
        )

        # Create Replacement Order
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

    # -------------------- READ METHODS --------------------
    def get_shipping_address(self, obj):
        return ShippingAddressSerializer(obj.order.shipping_address).data if obj.order.shipping_address else None

    def get_product(self, obj):
        return getattr(obj.order_item.product_variant.product, "name", None)

    def get_variant(self, obj):
        return getattr(obj.order_item.product_variant, "variant_name", None)

    def get_variant_images(self, obj):
        if obj.order_item and obj.order_item.product_variant:
            # First try the property .url on each image object
            return [img.url for img in obj.order_item.product_variant.images.all() if img.url]
        return []

    def get_replacement_days_remaining(self, obj):
        variant = obj.order_item.product_variant
        allowed_days = variant.replacement_days or 0
        delta = (timezone.now().date() - obj.order.created_at.date()).days
        return max(allowed_days - delta, 0) if variant.allow_replacement else 0

    def get_is_replacement_eligible(self, obj):
        variant = obj.order_item.product_variant
        allowed_days = variant.replacement_days or 0
        delta = (timezone.now().date() - obj.order.created_at.date()).days
        return variant.allow_replacement and delta <= allowed_days
