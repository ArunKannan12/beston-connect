import json
import logging
import requests
from datetime import date, time
from django.conf import settings
from .warehouse import DelhiveryPickupRequest
from rest_framework.generics import ListAPIView
logger = logging.getLogger(__name__)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .warehouseSerializer import DelhiveryPickupRequestSerializer,DelhiveryPickupRequestDetailSerializer,OrderPickupListSerializer
from accounts.permissions import IsAdmin
from orders.models import Order,OrderStatus
from django.db import transaction

DELHIVERY_PICKUP_URL = "https://track.delhivery.com/fm/request/new/"

PICKUP_SLOTS = {
    "midday": time(10, 0, 0),
    "evening": time(14, 0, 0),
}
import logging

logger = logging.getLogger(__name__)

def create_delhivery_pickup_request(
    pickup_date: date,
    slot: str,
    expected_package_count: int,
) -> dict:
    # 1️⃣ Validate slot
    if slot not in PICKUP_SLOTS:
        return {
            "success": False,
            "error": f"Invalid slot. Choose from {list(PICKUP_SLOTS.keys())}",
        }

    pickup_time = PICKUP_SLOTS[slot]

    # 2️⃣ Pickup location from settings
    pickup_location = getattr(settings, "DELHIVERY_PICKUP", None)
    if not pickup_location or "name" not in pickup_location:
        return {
            "success": False,
            "error": "DELHIVERY_PICKUP not configured properly.",
        }

    location_name = pickup_location["name"]

    # 3️⃣ Prevent duplicate OPEN pickup
    if DelhiveryPickupRequest.objects.filter(
        pickup_date=pickup_date,
        pickup_location=location_name,
        status="OPEN",
    ).exists():
        return {
            "success": False,
            "error": "An active pickup already exists for this warehouse and date.",
        }

    payload = {
        "pickup_date": pickup_date.strftime("%Y-%m-%d"),
        "pickup_time": pickup_time.strftime("%H:%M:%S"),
        "pickup_location": location_name,
        "expected_package_count": expected_package_count,
    }

    headers = {
        "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
        "Accept": "application/json",
    }

    logger.debug(f"Delhivery pickup payload: {payload}")

    try:
        response = requests.post(
            DELHIVERY_PICKUP_URL,
            headers=headers,
            json=payload,   # ✅ correct way
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.exception("Delhivery pickup request failed")
        return {"success": False, "error": str(e)}
    except ValueError:
        logger.error("Invalid JSON response from Delhivery")
        return {"success": False, "error": "Invalid JSON response from Delhivery"}

    delhivery_status = str(data.get("status", "")).upper()
    status_value = "OPEN" if delhivery_status in ["OPEN", "SUCCESS"] else "FAILED"

    pickup_request = DelhiveryPickupRequest.objects.create(
        pickup_date=pickup_date,
        pickup_time=pickup_time,
        pickup_location=location_name,
        expected_package_count=expected_package_count,
        delhivery_request_id=data.get("request_id"),
        status=status_value,
        raw_response=data,
        slot=slot,
    )

    return {
        "success": True,
        "pickup_request_id": pickup_request.id,
        "delhivery_request_id": pickup_request.delhivery_request_id,
        "status": pickup_request.status,
        "data": data,
    }

class CreateDelhiveryPickupRequestAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = DelhiveryPickupRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pickup_date = serializer.validated_data["pickup_date"]
        slot = serializer.validated_data["slot"]
        order_numbers = serializer.validated_data["order_numbers"]

        if not order_numbers:
            return Response(
                {"error": "No orders specified for pickup."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1️⃣ Fetch eligible orders
        eligible_orders = Order.objects.filter(
            order_number__in=order_numbers,
            status=OrderStatus.PROCESSING,
            is_paid=True,
            pickup_request__isnull=True,
            waybill__isnull=False,
        )

        if not eligible_orders.exists():
            return Response(
                {"error": "No eligible orders found for pickup."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_package_count = eligible_orders.count()

        # 2️⃣ Create pickup + link orders atomically
        with transaction.atomic():
            result = create_delhivery_pickup_request(
                pickup_date=pickup_date,
                slot=slot,
                expected_package_count=expected_package_count,
            )

            if not result.get("success"):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            pickup_request_id = result["pickup_request_id"]
            eligible_orders.update(pickup_request_id=pickup_request_id)

        shipments = [
            {
                "order_number": order.order_number,
                "waybill": order.waybill,
                "tracking_url": order.tracking_url,
            }
            for order in eligible_orders
        ]

        return Response(
            {
                "success": True,
                "pickup_request_id": pickup_request_id,
                "linked_orders_count": expected_package_count,
                "delhivery_request_id": result.get("delhivery_request_id"),
                "status": result.get("status"),
                "shipments": shipments,
            },
            status=status.HTTP_201_CREATED,
        )




class EligibleOrdersForPickupAPIView(ListAPIView):
    permission_classes=[IsAdmin]
    serializer_class=OrderPickupListSerializer
    
    def get_queryset(self):
        return Order.objects.filter(
            status=OrderStatus.PROCESSING,
            is_paid=True,
            pickup_request__isnull=True,
            waybill__isnull=False
        ).order_by('-created_at')
    



class DelhiveryPickupRequestListAPIView(ListAPIView):
    queryset = DelhiveryPickupRequest.objects.all().order_by("-created_at")
    serializer_class = DelhiveryPickupRequestDetailSerializer
    permission_classes = [IsAdmin]



# DELHIVERY_WAREHOUSE_URL = "https://track.delhivery.com/api/backend/clientwarehouse"

# def sync_warehouse_to_delhivery(warehouse, create=False):
#     url = f"{DELHIVERY_WAREHOUSE_URL}/create/" if create else f"{DELHIVERY_WAREHOUSE_URL}/edit/"

#     payload = {
#         "name": warehouse.name,
#         "phone": warehouse.phone,
#         "email": warehouse.email,
#         "address": warehouse.address,
#         "city": warehouse.city,
#         "pin": warehouse.pin,
#         "country": warehouse.country,

#         "return_address": warehouse.return_address,
#         "return_city": warehouse.return_city,
#         "return_pin": warehouse.return_pin,
#         "return_state": warehouse.return_state,
#         "return_country": warehouse.return_country,
#     }

#     headers = {
#         "Authorization": f"Token {settings.DELHIVERY_API_TOKEN}",
#         "Content-Type": "application/json",
#         "Accept": "application/json",
#     }

#     # ✅ DEBUG LOGS
#     print("\n--- DELHIVERY SYNC DEBUG ---")
#     print("URL:", url)
#     print("PAYLOAD:", payload)
#     print("HEADERS:", {k: ('***' if k == 'Authorization' else v) for k, v in headers.items()})

#     response = requests.post(url, json=payload, headers=headers)

#     print("STATUS CODE:", response.status_code)
#     print("RESPONSE HEADERS:", dict(response.headers))
#     print("RAW RESPONSE TEXT:", response.text)
#     print("--- END DEBUG ---\n")

#     # ✅ Safe JSON parsing
#     try:
#         data = response.json()
#     except ValueError:
#         data = {
#             "success": False,
#             "error": "Invalid JSON response from Delhivery",
#             "raw": response.text,
#             "status": response.status_code,
#         }

#     warehouse.delhivery_synced = data.get("success", False)
#     warehouse.last_sync_message = (
#         data.get("data", {}).get("message")
#         or data.get("error")
#         or "No message"
#     )
#     warehouse.last_synced_at = timezone.now()
#     warehouse.save()

#     return data

# class WarehouseListView(generics.ListAPIView):
#     serializer_class = WarehouseListSerializer
#     permission_classes = [IsAdmin]

#     queryset = Warehouse.objects.filter(is_deleted=False)
#     filter_backends = [
#         DjangoFilterBackend,
#         filters.SearchFilter,
#         filters.OrderingFilter,
#     ]
#     search_fields = [
#         "name",
#         "city",
#         "pin",
#         "phone",
#         "email",
#     ]

#     # ✅ Fields allowed for ordering
#     ordering_fields = [
#         "name",
#         "created_at",
#         "updated_at",
#         "city",
#         "pin",
#     ]

#     # ✅ Default ordering
#     ordering = ["-created_at"]


# class WarehouseCreateView(generics.CreateAPIView):
#     queryset=Warehouse.objects.all()
#     serializer_class=WarehouseCreateSerializer
#     permission_classes=[IsAdmin]

#     def perform_create(self, serializer):
#         warehouse=serializer.save()
#         sync_warehouse_to_delhivery(warehouse,create=True)
#         return warehouse
    
#     def create(self, request, *args, **kwargs):
#         response = super().create(request, *args, **kwargs)
#         warehouse = Warehouse.objects.get(id=response.data["id"])
#         return Response({
#             "warehouse": WarehouseCreateSerializer(warehouse).data,
#             "delhivery_sync": warehouse.last_sync_message,
#             "synced": warehouse.delhivery_synced
#         })
    
# class WarehouseUpdateView(generics.UpdateAPIView):
#     queryset = Warehouse.objects.all()
#     serializer_class = WarehouseUpdateSerializer
#     permission_classes=[IsAdmin]

#     def perform_update(self, serializer):
#         warehouse = serializer.save()
#         sync_warehouse_to_delhivery(warehouse, create=False)
#         return warehouse

#     def update(self, request, *args, **kwargs):
#         response = super().update(request, *args, **kwargs)
#         warehouse = self.get_object()
#         return Response({
#             "warehouse": WarehouseUpdateSerializer(warehouse).data,
#             "delhivery_sync": warehouse.last_sync_message,
#             "synced": warehouse.delhivery_synced
#         })

# class WarehouseDeactivateView(APIView):
#     permission_classes = [IsAdmin]
#     def post(self, request, pk):
#         warehouse = Warehouse.objects.get(pk=pk)
#         warehouse.is_active = False
#         warehouse.save(update_fields=['is_active'])

#         sync_warehouse_to_delhivery(warehouse, create=False)

#         return Response({
#             "message": "Warehouse deactivated",
#             "synced": warehouse.delhivery_synced,
#             "delhivery_sync": warehouse.last_sync_message
#         })
