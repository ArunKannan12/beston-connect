from .models import Order, OrderItem, ShippingAddress,Refund
from rest_framework import serializers
from products.serializers import ProductVariantSerializer
from products.models import ProductVariant
from promoter.serializers import PromoterSerializer
from rest_framework.validators import UniqueTogetherValidator
from promoter.models import Promoter
from django.utils import timezone
from datetime import timedelta
class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ['refund_id', 'amount', 'status', 'created_at', 'processed_at', 'notes']

class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'user', 'full_name', 'phone_number',
            'address', 'locality', 'city', 'district', 'state',
            'region', 'postal_code', 'country'
        ]
        read_only_fields = ['user']
        validators = [
            UniqueTogetherValidator(
                queryset=ShippingAddress.objects.all(),
                fields=[
                    'full_name', 'phone_number',
                    'address', 'locality', 'city', 'postal_code', 'country'
                ],
                message="This address already exists for the user."
            )
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), write_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_variant', 'product_variant_id',
            'quantity', 'price', 'status',
            'courier', 'waybill', 'tracking_url',
            'handoff_timestamp', 'shipped_at',
        ]
        read_only_fields = ['status', 'tracking_url', 'handoff_timestamp', 'shipped_at']

    def create(self, validated_data):
        product_variant = validated_data['product_variant_id']
        return OrderItem.objects.create(
            product_variant=product_variant,
            quantity=validated_data['quantity'],
            price=product_variant.final_price
        )


class OrderSerializer(serializers.ModelSerializer):
    shipping_address = ShippingAddressSerializer(required=False)
    shipping_address_id = serializers.PrimaryKeyRelatedField(
        queryset=ShippingAddress.objects.all(),
        write_only=True, required=False, allow_null=True
    )
    items = OrderItemSerializer(many=True, read_only=True)
    promoter = PromoterSerializer(read_only=True)
    cancelled_by = serializers.StringRelatedField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    cancelable = serializers.SerializerMethodField()
    refunds = RefundSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'shipping_address', 'shipping_address_id',
            'status', 'subtotal', 'delivery_charge', 'total',
            'payment_method', 'is_paid', 'paid_at',
            'razorpay_order_id', 'razorpay_payment_id',
            'promoter', 'cancel_reason', 'cancelled_at', 'cancelled_by',
            'is_restocked', 'cancelable', 'items','refunds',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'order_number', 'status', 'subtotal', 'delivery_charge', 'total',
            'is_paid', 'paid_at', 'created_at', 'updated_at',
            'cancelled_by', 'is_restocked',
        ]

    def get_cancelable(self, obj):
        return obj.status in ['pending', 'processing']

class ShippingAddressInputSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    address = serializers.CharField()
    locality = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=50)
    district = serializers.CharField(max_length=50, required=False, allow_blank=True)
    state = serializers.CharField(max_length=50)
    region = serializers.CharField(max_length=50, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=50)


class ShippingAddressSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = [
            "full_name", "phone_number", "address",
            "locality", "city", "district", "state",
            "postal_code", "country", 'created_at'
        ]

class CartCheckoutInputSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(required=False)
    shipping_address = ShippingAddressInputSerializer(required=False)
    payment_method = serializers.ChoiceField(choices=['Razorpay'])

    def validate(self, data):
        has_id = data.get('shipping_address_id')
        shipping_data = data.get('shipping_address')

        if not has_id and not shipping_data:
            raise serializers.ValidationError({
                "shipping_address": {
                    "full_name": ["This field is required."],
                    "phone_number": ["This field is required."],
                    "address": ["This field is required."],
                    "city": ["This field is required."],
                    "postal_code": ["This field is required."],
                    "country": ["This field is required."]
                }
            })

        if has_id and shipping_data:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Provide either 'shipping_address_id' or 'shipping_address', not both."
                ]
            })

        if shipping_data:
            nested_serializer = ShippingAddressInputSerializer(data=shipping_data)
            if not nested_serializer.is_valid():
                raise serializers.ValidationError({"shipping_address": nested_serializer.errors})

        return data


class CheckoutItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)


class ReferralCheckoutInputSerializer(CartCheckoutInputSerializer):
    items = CheckoutItemInputSerializer(many=True, required=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("This field cannot be empty.")
        return value


class OrderItemStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['shipped', 'delivered'])

    def validate_status(self, value):
        if value not in ['shipped', 'delivered']:
            raise serializers.ValidationError("Invalid status update.")
        return value


class OrderPaymentSerializer(serializers.Serializer):
    order_number = serializers.CharField(required=True)
    payment_method = serializers.ChoiceField(choices=['razorpay'])
    razorpay_order_id = serializers.CharField(required=False, allow_blank=True)
    razorpay_payment_id = serializers.CharField(required=False, allow_blank=True)
    razorpay_signature = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        order_number = attrs.get('order_number')
        payment_method = attrs.get('payment_method')

        try:
            order = Order.objects.get(order_number=order_number, user=self.context['request'].user)
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found.")

        if order.is_paid:
            raise serializers.ValidationError("Order is already paid.")

        if payment_method == 'razorpay':
            if not (attrs.get('razorpay_order_id') and attrs.get('razorpay_payment_id') and attrs.get('razorpay_signature')):
                raise serializers.ValidationError("Razorpay payment details are required.")

        attrs['order'] = order
        return attrs

class OrderItemSimpleSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_variant',
            'quantity',
            'price',
            'status',
            'courier',
            'waybill',
            'tracking_url',
            'handoff_timestamp',
            'shipped_at',
        ]
        read_only_fields = [
            'status',
            'tracking_url',
            'handoff_timestamp',
            'shipped_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    shipping_address = ShippingAddressSerializer(read_only=True)
    promoter = PromoterSerializer(read_only=True)
    items = serializers.SerializerMethodField()
    cancelable = serializers.SerializerMethodField()
    cancelled_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'shipping_address', 'status',
            'subtotal', 'total', 'delivery_charge',
            'payment_method', 'is_paid', 'is_restocked',
            'paid_at', 'created_at', 'updated_at', 'promoter', 'items',
            'cancel_reason', 'cancelled_at', 'cancelled_by',
            'razorpay_order_id', 'razorpay_payment_id',
            'cancelable',
        ]

    def get_cancelable(self, obj):
        return obj.status in ['pending', 'processing']

    def get_items(self, obj):
        result = []
        return_requests = {rr.order_item_id: rr for rr in obj.return_requests.all()}
        replacement_requests = {rr.order_item_id: rr for rr in obj.replacement_requests.all()}

        for item in obj.items.all():
            variant = item.product_variant
            return_remaining_days = None
            replacement_remaining_days = None

            delivered_at = item.shipped_at

            if delivered_at:
                if variant.allow_return and variant.return_days:
                    delta = (delivered_at + timedelta(days=variant.return_days)) - timezone.now()
                    return_remaining_days = max(delta.days, 0)
                if variant.allow_replacement and variant.replacement_days:
                    delta = (delivered_at + timedelta(days=variant.replacement_days)) - timezone.now()
                    replacement_remaining_days = max(delta.days, 0)

            result.append({
                **OrderItemSimpleSerializer(item).data,
                "return_remaining_days": return_remaining_days,
                "replacement_remaining_days": replacement_remaining_days,
                "tracking_url": item.tracking_url,
                "courier": item.courier,
                "waybill": item.waybill,
                "shipped_at": item.shipped_at,
            })
        return result


class OrderSummarySerializer(serializers.ModelSerializer):
    shipping_address = ShippingAddressSummarySerializer(read_only=True)
    first_item = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number", "shipping_address", "status",
            "subtotal", "total",
            "payment_method", "is_paid",
            "created_at", "updated_at", "first_item",
            "refund_status", "refunded_at",
        ]

    def get_first_item(self, obj):
        item = obj.items.first()
        if not item:
            return None
        return {
            "product_name": item.product_variant.product_name,
            "variant_name": item.product_variant.variant_name,
            "image": item.product_variant.images.first().image if item.product_variant.images.exists() else None,
            "tracking_url": item.tracking_url,
            "courier": item.courier,
            "waybill": item.waybill,
        }



class CustomerOrderListSerializer(serializers.ModelSerializer):
    shipping_address = ShippingAddressSerializer(read_only=True)
    items = OrderItemSimpleSerializer( many=True, read_only=True)
    refund_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'order_number', 'shipping_address', 'status',
            'subtotal', 'total',
            'payment_method', 'is_paid',
            'created_at', 'updated_at', 'items', 'refund_info'
        ]

    def get_refund_info(self, obj):
        refund = obj.refunds.last()
        if not refund:
            return None
        return {
            "refund_id": refund.refund_id,
            "amount": refund.amount,
            "status": refund.status,
            "processed_at": refund.processed_at,
            "message": (
                "Refund processed successfully."
                if refund.status == "processed"
                else "Refund is being processed."
            ),
        }


class OrderPreviewInputSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.IntegerField(),
        ),
        allow_empty=False,
        help_text="List of items with product_variant_id and quantity"
    )
    postal_code = serializers.CharField(max_length=20, required=False)

    def validate_items(self, value):
        for item in value:
            if "product_variant_id" not in item or "quantity" not in item:
                raise serializers.ValidationError(
                    "Each item must include 'product_variant_id' and 'quantity'."
                )
            if item["quantity"] <= 0:
                raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class OrderPreviewOutputSerializer(serializers.Serializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    delivery_charge = serializers.DecimalField(max_digits=10, decimal_places=2)
    estimated_delivery_days = serializers.IntegerField(allow_null=True)

class OrderLightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['order_number', 'status', 'total', 'payment_method', 'created_at', 'is_paid', 'paid_at']


class OrderItemLightSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'quantity', 'price', 'product_variant',
            'status', 'courier', 'waybill', 'tracking_url', 'shipped_at'
        ]


class ShipmentTrackingSerializer(serializers.Serializer):
    waybill = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ref_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    scanned_on = serializers.DateTimeField(required=False, allow_null=True)
    origin = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    destination = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pickup_date = serializers.DateTimeField(required=False, allow_null=True)
    delivered_date = serializers.DateTimeField(required=False, allow_null=True)