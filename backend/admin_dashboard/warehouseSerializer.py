# from rest_framework import serializers
# from .warehouse import Warehouse


# class WarehouseListSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Warehouse
#         fields = [
#             "id",
#             "name",
#             "phone",
#             "email",

#             "address",
#             "city",
            
#             "pin",
#             "country",

#             "return_address",
#             "return_city",
#             "return_state",
#             "return_pin",
#             "return_country",

#             "is_active",
#             "is_deleted",

#             "delhivery_synced",
#             "delhivery_warehouse_id",
#             "last_synced_at",
#             "last_sync_message",

#             "created_at",
#             "updated_at",
#         ]

# class WarehouseCreateSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Warehouse
#         fields = [
#             "id",
#             "name",
#             "phone",
#             "email",

#             "address",
#             "city",
          
#             "pin",
#             "country",

#             "return_address",
#             "return_city",
#             "return_state",
#             "return_pin",
#             "return_country",
#         ]
#         read_only_fields = ["id"]

#     def validate_pin(self, value):
#         if len(value) != 6 or not value.isdigit():
#             raise serializers.ValidationError("Invalid pincode")
#         return value

#     def validate_return_pin(self, value):
#         if len(value) != 6 or not value.isdigit():
#             raise serializers.ValidationError("Invalid return pincode")
#         return value
    
# class WarehouseUpdateSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Warehouse
#         fields = [
#             "name",  # Allowed only before sync
#             "phone",
#             "email",

#             "address",
#             "city",
            
#             "pin",
#             "country",

#             "return_address",
#             "return_city",
#             "return_state",
#             "return_pin",
#             "return_country",

#             "is_active",
#         ]

#     def validate_name(self, value):
#         warehouse = self.instance
#         if warehouse.delhivery_synced and warehouse.name != value:
#             raise serializers.ValidationError(
#                 "Warehouse name cannot be changed after Delhivery sync."
#             )
#         return value

#     def validate_pin(self, value):
#         warehouse = self.instance
#         if warehouse.delhivery_synced and warehouse.pin != value:
#             raise serializers.ValidationError(
#                 "Pincode cannot be changed after Delhivery sync."
#             )
#         if len(value) != 6 or not value.isdigit():
#             raise serializers.ValidationError("Invalid pincode")
#         return value

#     def validate_return_pin(self, value):
#         if len(value) != 6 or not value.isdigit():
#             raise serializers.ValidationError("Invalid return pincode")
#         return value

from rest_framework import serializers
from datetime import date, timedelta
from orders.models import Order, OrderStatus
from .warehouse import DelhiveryPickupRequest
from django.conf import settings

class DelhiveryPickupRequestSerializer(serializers.ModelSerializer):
    slot = serializers.ChoiceField(choices=DelhiveryPickupRequest.PICKUP_SLOT_CHOICES)
    order_numbers = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        help_text="List of order numbers to include in this pickup"
    )

    class Meta:
        model = DelhiveryPickupRequest
        fields = [
            "id",
            "pickup_date",
            "slot",
            "expected_package_count",
            "status",
            "delhivery_request_id",
            "order_numbers",  # new field
            "pickup_location",  
        ]
        read_only_fields = [
            
            "status",
            "delhivery_request_id",
            "pickup_location",  
        ]

    def validate_pickup_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Pickup date cannot be in the past.")
        if value > date.today() + timedelta(days=30):
            raise serializers.ValidationError("Pickup date cannot be more than 30 days in the future.")
        return value

    def validate_order_numbers(self, value):
        eligible_orders = Order.objects.filter(
            order_number__in=value,
            status=OrderStatus.PROCESSING,
            is_paid=True,
            pickup_request__isnull=True
        ).values_list("order_number", flat=True)

        invalid_orders = set(value) - set(eligible_orders)
        if invalid_orders:
            raise serializers.ValidationError(
                f"The following orders are not eligible for pickup: {list(invalid_orders)}"
            )
        return value
    def validate(self, attrs):
        pickup_date = attrs["pickup_date"]
        slot = attrs["slot"]
        pickup_location = settings.DELHIVERY_PICKUP["name"]

        # Prevent duplicate open pickup requests
        if DelhiveryPickupRequest.objects.filter(
            pickup_date=pickup_date,
            slot=slot,
            pickup_location=pickup_location,
            status="OPEN",
        ).exists():
            raise serializers.ValidationError(
                "An open pickup request already exists for this date and slot."
            )

        return attrs

    # -----------------------------
    # CREATE LOGIC
    # -----------------------------

    def create(self, validated_data):
        order_numbers = validated_data.pop("order_numbers")

        # Inject pickup location from settings
        validated_data["pickup_location"] = settings.DELHIVERY_PICKUP["name"]

        # Create pickup request
        pickup_request = super().create(validated_data)

        # Attach orders to this pickup request
        Order.objects.filter(order_number__in=order_numbers).update(
            pickup_request=pickup_request
        )

        return pickup_request




from orders.models import Order

class PickupRequestOrderSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "order_number", "user_email", "status", "total"]

class DelhiveryPickupRequestDetailSerializer(serializers.ModelSerializer):
    orders = PickupRequestOrderSerializer(many=True, read_only=True)

    class Meta:
        model = DelhiveryPickupRequest
        fields = [
            "id",
            "pickup_date",
            "slot",
            "expected_package_count",
            "pickup_location",
            "status",
            "delhivery_request_id",
            "orders",
        ]
        read_only_fields = fields
        
class OrderPickupListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    customer_name = serializers.SerializerMethodField()
    total_weight_grams = serializers.IntegerField(source="weight_total", read_only=True)
    tracking_url = serializers.CharField(source="delhivery_tracking_url", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "is_paid",
            "total",
            "total_weight_grams",
            "user_email",
            "customer_name",
            "courier",
            "waybill",
            "tracking_url",
            "packed_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()