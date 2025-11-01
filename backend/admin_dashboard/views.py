from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.generics import CreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework import status
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from accounts.permissions import IsAdmin
from .serializers import (
                        AdminDashboardStatsSerializer, 
                        ProductAdminSerializer,
                        ProductVariantAdminSerializer,
                        CustomerSerializer,
                        AdminOrderSerializer,
                        AdminLogSerializer
                        )
from orders.signals import send_multichannel_notification
from django.db.models import Q
from products.models import Product,ProductVariant
import json
from rest_framework.parsers import MultiPartParser,FormParser,JSONParser
from rest_framework.exceptions import ValidationError
from products.models import Banner,ProductVariantImage
from products.serializers import BannerSerializer
from rest_framework.generics import ListAPIView,RetrieveAPIView
from django.contrib.auth import get_user_model
from orders.returnReplacementSerializer import ReturnRequestSerializer,ReplacementRequestSerializer
from rest_framework.filters import OrderingFilter,SearchFilter
from django.utils.dateparse import parse_date
from orders.models import Order,ReturnRequest,ReplacementRequest
from .helpers import str_to_bool
from .pagination import FlexiblePageSizePagination
from .models import AdminLog
User=get_user_model()

class AdminDashboardStatsAPIView(APIView):
    """
    Returns admin dashboard stats (e.g., product count, orders, revenue).
    Accessible only to authenticated admins.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        serializer = AdminDashboardStatsSerializer({})
        return Response(serializer.data)


class ProductAdminCreateAPIView(CreateAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Product.objects.all()

    def get_serializer_context(self):
        return {"request": self.request}

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        # Parse variants JSON string
        if "variants" in data and isinstance(data["variants"], str):
            try:
                data["variants"] = json.loads(data["variants"])
                print("✅ Parsed variants:", data["variants"])
            except json.JSONDecodeError as e:
                print("❌ JSON decode error:", str(e))
                return Response({"variants": ["Invalid JSON format"]}, status=400)

        if not data.get("variants"):
            print("⚠️ No variants found after parsing")
            return Response({"variants": ["This field is required."]}, status=400)

        # Bind images to variants
        for i, variant in enumerate(data["variants"]):
            images = []
            for key, file in request.FILES.items():
                if key.startswith(f"variant_{i}_image_"):
                    print(f"🖼️ Binding image {key} to variant {i}")
                    images.append({"image": file})
            variant["images"] = images

        # Construct clean product payload
        product_data = {
            "name": data.get("name"),
            "description": data.get("description"),
            "is_available": data.get("is_available"),
            "featured": data.get("featured"),
            "category_id": data.get("category_id"),
            "image": data.get("image"),
            "variants": data.get("variants")
        }

        serializer = self.get_serializer(data=product_data)
        if not serializer.is_valid():
            print("❌ Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=400)

        product = serializer.save()
        print("🎉 Product created:", product.id)
        return Response(self.get_serializer(product).data, status=201)
    
import logging
logger = logging.getLogger('admin_dashboard')
class ProductAdminDetailAPIView(RetrieveUpdateDestroyAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdmin]
    lookup_field = "id"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Product.objects.all()

    def get_serializer_context(self):
        return {"request": self.request}

    def _parse_variants(self, data, files):
        print("🔍 Starting _parse_variants")

        # Step 1: Extract and parse variants
        variants = None
        if isinstance(data, dict):
            variants = data.get("variants", [])
            print(f"📦 Raw variants from dict: {variants}")
            if isinstance(variants, str):
                try:
                    variants = json.loads(variants)
                    print("✅ Parsed variants JSON string successfully")
                except json.JSONDecodeError:
                    print("❌ Failed to parse variants JSON string")
                    raise ValidationError({"variants": ["Invalid JSON format"]})
        elif isinstance(data, list):
            variants = data
            data = {"variants": variants}
            print("📦 Raw variants from list")
        else:
            print("❌ Invalid variants format")
            raise ValidationError({"variants": ["Invalid format"]})

        # Step 2: Ensure variants is a list
        if not isinstance(variants, list):
            print("❌ Parsed variants is not a list")
            raise ValidationError({"variants": ["Expected a list of variants"]})

        # Step 3: Parse each variant if it's a string
        for i in range(len(variants)):
            if isinstance(variants[i], str):
                try:
                    variants[i] = json.loads(variants[i])
                    print(f"✅ Parsed variant #{i+1} from string to dict")
                except json.JSONDecodeError:
                    raise ValidationError({"variants": [f"Variant #{i+1} is not valid JSON."]})

        # Step 4: Process each variant
        for i, variant in enumerate(variants):
            print(f"\n🔄 Processing variant #{i+1}: {variant.get('variant_name', '')}")
            print(f"🧪 Variant type: {type(variant)}")

            # New uploads
            new_images = [{"image": file} for key, file in files.items() if key.startswith(f"variant_{i}_image_")]
            print(f"📥 New uploaded image keys: {[key for key in files if key.startswith(f'variant_{i}_image_')]}")

            # Images to remove
            remove_images = [img_id for img_id in variant.get("removed_images", []) if isinstance(img_id, int)]
            print(f"🗑️ Images marked for removal: {remove_images}")

            # Existing images
            existing_images = []
            for img in variant.get("existingImages", []):
                if isinstance(img, dict) and img.get("id"):
                    existing_images.append({"id": img["id"]})
                elif isinstance(img, str):
                    img_obj = ProductVariantImage.objects.filter(image_url=img).first()
                    if img_obj:
                        existing_images.append({"id": img_obj.id})
                        print(f"🔗 Resolved image URL to ID: {img_obj.id}")

            print(f"📸 Existing images before filtering: {[img['id'] for img in existing_images]}")
            print(f"⭐ Variant #{i+1} featured status: {variant.get('featured')}")
            # Filter out removed images
            existing_images = [img for img in existing_images if img["id"] not in remove_images]
            print(f"✅ Existing images after filtering: {[img['id'] for img in existing_images]}")

            # Validate image count
            total_images = len(existing_images) + len(new_images)
            print(f"📊 Total images for variant #{i+1}: {total_images}")
            if total_images == 0:
                print(f"❌ Variant #{i+1} has no images")
                raise ValidationError({
                    "variants": [
                        f"Variant #{i+1} ('{variant.get('variant_name', '')}') must have at least one image."
                    ]
                })

            # Final assignment
            variant["images"] = existing_images + new_images
            variant["remove_images"] = remove_images
            variant.pop("existingImages", None)

        # Step 5: Ensure at least one variant exists for PUT/PATCH
        if self.request.method in ["PUT", "PATCH"] and not variants:
            print("❌ No variants provided for update")
            raise ValidationError({"variants": ["At least one variant is required."]})

        data["variants"] = variants
        print("✅ Finished parsing variants")
        return data

    def _handle_main_image_removal(self, request, instance):
        if request.data.get("remove_image") and instance.image:
            instance.image.delete(save=False)
            instance.image = None
            instance.image_url = None

    @transaction.atomic
    def put(self, request, *args, **kwargs):
        data = request.data.copy()
        data = self._parse_variants(data, request.FILES)
        instance = self.get_object()
        self._handle_main_image_removal(request, instance)
        serializer = self.get_serializer(instance, data=data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(self.get_serializer(product).data)

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        data = request.data.copy()
        data = self._parse_variants(data, request.FILES)
        instance = self.get_object()
        self._handle_main_image_removal(request, instance)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        # Handle variants
        variants_data = data.get("variants", [])
        existing_variants = {v.id: v for v in product.variants.all()}

        for variant_data in variants_data:
            variant_id = variant_data.get("id")
            if variant_id and variant_id in existing_variants:
                variant_instance = existing_variants.pop(variant_id)

                # Validate remaining images before saving
                remaining_images_count = len(variant_data.get("images", [])) + variant_instance.images.exclude(
                    id__in=variant_data.get("remove_images", [])
                ).count()
                if remaining_images_count == 0:
                    raise ValidationError(
                        f"Variant '{variant_instance.variant_name}' must have at least one image."
                    )

                # ✅ DEBUG PRINT: Confirm remove_images is present
                if "remove_images" in variant_data:
                    print(f"🧹 Passing remove_images to serializer for variant {variant_id}: {variant_data['remove_images']}")

                variant_serializer = ProductVariantAdminSerializer(
                    variant_instance, data=variant_data, context={"product": product}, partial=True
                )
                variant_serializer.is_valid(raise_exception=True)
                variant_serializer.save()
            else:
                # Create new variant
                variant_serializer = ProductVariantAdminSerializer(
                    data=variant_data, context={"product": product}
                )
                variant_serializer.is_valid(raise_exception=True)
                variant_serializer.save()

        # Delete removed variants
        for remaining_variant in existing_variants.values():
            remaining_variant.delete()

        # Ensure at least one variant remains
        if product.variants.count() == 0:
            raise ValidationError("A product must have at least one variant.")

        return Response(self.get_serializer(product).data)

    @transaction.atomic
    def delete(self, request, *args, **kwargs):
        product = self.get_object()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VariantBulkActionAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        ids = request.data.get("ids", [])
        action = request.data.get("action")
        value = request.data.get("value")  # boolean for set_featured/set_availability

        if not ids or not isinstance(ids, list):
            return Response({"error": "IDs must be a list of variant IDs"}, status=status.HTTP_400_BAD_REQUEST)

        variants = ProductVariant.objects.filter(id__in=ids)
        if not variants.exists():
            return Response({"error": "No variants found for given IDs"}, status=status.HTTP_404_NOT_FOUND)

        if action == "delete":
            count = variants.count()
            variants.delete()
            return Response({"deleted": count}, status=status.HTTP_200_OK)

        elif action == "set_featured":
            if value is None:
                return Response({"error": "Value is required for set_featured"}, status=status.HTTP_400_BAD_REQUEST)
            variants.update(featured=value)
            return Response({"updated": variants.count(), "action": "set_featured"}, status=status.HTTP_200_OK)

        elif action == "set_availability":
            if value is None:
                return Response({"error": "Value is required for set_availability"}, status=status.HTTP_400_BAD_REQUEST)
            variants.update(is_active=value)
            return Response({"updated": variants.count(), "action": "set_availability"}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
class ProductBulkActionAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        ids = request.data.get("ids", [])
        action = request.data.get("action")
        value = request.data.get("value")  # boolean for set_featured/set_availability

        if not ids or not isinstance(ids, list):
            return Response({"error": "IDs must be a list of product IDs"}, status=400)

        products = Product.objects.filter(id__in=ids)
        if not products.exists():
            return Response({"error": "No products found for given IDs"}, status=404)

        if action == "delete":
            count = products.count()
            products.delete()
            return Response({"deleted": count}, status=200)

        elif action == "set_featured":
            if value is None:
                return Response({"error": "Value is required for set_featured"}, status=400)
            products.update(featured=value)
            return Response({"updated": products.count(), "action": "set_featured"}, status=200)

        elif action == "set_availability":
            if value is None:
                return Response({"error": "Value is required for set_availability"}, status=400)
            products.update(is_available=value)
            return Response({"updated": products.count(), "action": "set_availability"}, status=200)

        return Response({"error": "Invalid action"}, status=400)


class CustomerListAPIView(ListAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAdmin]
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = [
        "created_at", "first_name", "last_name", "email", "phone_number", "block_count", "is_verified"
    ]
    ordering = ["-created_at"]
    search_fields = ["first_name", "last_name", "email", "phone_number"]

    def get_queryset(self):
        queryset = User.objects.filter(role='customer')
        params = self.request.query_params

        # 🔍 Search filter
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone_number__icontains=search)
            )

        # 📌 Status filter
        status = params.get('status')
        if status == 'active':
            queryset = queryset.filter(is_permanently_banned=False, blocked_until__isnull=True)
        elif status == 'blocked':
            queryset = queryset.filter(blocked_until__gt=timezone.now())
        elif status == 'banned':
            queryset = queryset.filter(is_permanently_banned=True)

        # ✅ Verification filter
        verified = params.get('verified')
        if verified == 'true':
            queryset = queryset.filter(is_verified=True)
        elif verified == 'false':
            queryset = queryset.filter(is_verified=False)

        # 🔐 Auth provider filter
        auth_provider = params.get('auth_provider')
        if auth_provider:
            queryset = queryset.filter(auth_provider=auth_provider)

        # 🏙️ Location filters
        city = params.get('city')
        state = params.get('state')
        if city:
            queryset = queryset.filter(city__icontains=city)
        if state:
            queryset = queryset.filter(state__icontains=state)

        # 📅 Date range filter
        created_after = params.get('created_after')
        created_before = params.get('created_before')
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)
        if created_before:
            queryset = queryset.filter(created_at__lte=created_before)

        # 🚫 Block count threshold
        min_block_count = params.get('min_block_count')
        if min_block_count:
            queryset = queryset.filter(block_count__gte=min_block_count)

        # 🔃 Flexible sorting
        sort_by = params.getlist('sort_by') or ['-created_at']
        return queryset.order_by(*sort_by)

class CustomerDetailAPIView(RetrieveAPIView):
    serializer_class=CustomerSerializer
    lookup_field='id'
    permission_classes=[IsAdmin]
    queryset=User.objects.filter(role='customer')
    
from django.utils import timezone

class CustomerBlockAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        """
        Block/unblock a customer.
        JSON options:
        {
            "duration_minutes": 60,  # optional temporary block
            "permanent": true/false, # optional permanent ban
            "unblock": true           # optional to remove any block
        }

        Logic:
        - If "unblock" is True → clears temporary & permanent block.
        - If "permanent" is True → sets permanent ban, clears temporary block.
        - If "duration_minutes" is provided → sets temporary block for that duration.
        - If none provided → toggles permanent ban.
        """
        try:
            user = User.objects.get(pk=pk, role='customer')
        except User.DoesNotExist:
            return Response({"error": "Customer not found"}, status=status.HTTP_404_NOT_FOUND)

        unblock = request.data.get("unblock", False)
        permanent = request.data.get("permanent", False)
        duration = request.data.get("duration_minutes")

        if unblock:
            # Remove any blocks
            user.blocked_until = None
            user.is_permanently_banned = False
        elif permanent:
            # Set permanent ban
            user.is_permanently_banned = True
            user.blocked_until = None
        elif duration is not None:
            # Temporary block for X minutes
            try:
                minutes = int(duration)
                user.blocked_until = timezone.now() + timezone.timedelta(minutes=minutes)
                user.is_permanently_banned = False
                user.block_count += 1
            except ValueError:
                return Response({"error": "duration_minutes must be an integer"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Toggle permanent ban if nothing else provided
            user.is_permanently_banned = not user.is_permanently_banned
            if user.is_permanently_banned:
                user.blocked_until = None

        user.save()

        return Response({
            "id": user.id,
            "email": user.email,
            "blocked_until": user.blocked_until,
            "is_permanently_banned": user.is_permanently_banned
        }, status=status.HTTP_200_OK)

class AdminOrderListAPIView(ListAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdmin]
    pagination_class = FlexiblePageSizePagination
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = [
        'order_number',"created_at", "updated_at", "delivered_at", "total",
        "user__first_name", "user__last_name",
        "status", "is_paid", "is_refunded", "refund_amount"
    ]
    ordering = ["-created_at"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "tracking_number"]

    def get_queryset(self):
        queryset = Order.objects.all()

        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        # Filter by payment method
        payment_method = self.request.query_params.get("payment_method")
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        # Filter by boolean fields
        is_paid = self.request.query_params.get("is_paid")
        if is_paid is not None:
            try:
                queryset = queryset.filter(is_paid=str_to_bool(is_paid))
            except ValueError:
                raise ValidationError("Invalid is_paid value. Use true/false.")

        is_refunded = self.request.query_params.get("is_refunded")
        if is_refunded is not None:
            try:
                queryset = queryset.filter(is_refunded=str_to_bool(is_refunded))
            except ValueError:
                raise ValidationError("Invalid is_refunded value. Use true/false.")

        # Filter by date range
        start_date = self.request.query_params.get("start")
        end_date = self.request.query_params.get("end")
        if start_date:
            start = parse_date(start_date)
            if start:
                queryset = queryset.filter(created_at__date__gte=start)
        if end_date:
            end = parse_date(end_date)
            if end:
                queryset = queryset.filter(created_at__date__lte=end)

        # Filter by promoter
        promoter_id = self.request.query_params.get("promoter")
        if promoter_id:
            queryset = queryset.filter(promoter_id=promoter_id)

        return queryset

class AdminOrderDetailAPIView(RetrieveAPIView):
    serializer_class=AdminOrderSerializer
    permission_classes=[IsAdmin]
    lookup_field='order_number'
    queryset=Order.objects.all()
    

class AdminReturnRequestListAPIView(ListAPIView):
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    pagination_class = FlexiblePageSizePagination
    ordering_fields = ["created_at", "updated_at", "refund_amount", "status", "admin_decision"]
    ordering = ["-created_at"]
    search_fields = [
        "id",
        "user__email",
        "order_item__product_variant__product__name",
        "order_item__product_variant__variant_name",
        "order__shipping_address__full_name",
    ]

    def get_queryset(self):
        params = self.request.query_params

        queryset = (
            ReturnRequest.objects
            .select_related(
                "user",
                "order",
                "order__shipping_address",
                "order_item__product_variant__product",
                "order_item__product_variant"
            )
            .prefetch_related("order_item__product_variant__images")
            .order_by("-created_at")
        )

        # --- Filters ---
        status_param = params.get("status")
        if status_param:
            status_list = [s.strip() for s in status_param.split(",") if s.strip()]
            queryset = queryset.filter(status__in=status_list)

        order_id = params.get("order_id")
        if order_id:
            queryset = queryset.filter(order__id=order_id)

        user_email = params.get("user_email")
        if user_email:
            queryset = queryset.filter(user__email__icontains=user_email)

        product_name = params.get("product_name")
        if product_name:
            queryset = queryset.filter(order_item__product_variant__product__name__icontains=product_name)

        variant_name = params.get("variant_name")
        if variant_name:
            queryset = queryset.filter(order_item__product_variant__variant_name__icontains=variant_name)

        created_from = params.get("created_from")
        created_to = params.get("created_to")
        if created_from:
            created_from_date = parse_date(created_from)
            if created_from_date:
                queryset = queryset.filter(created_at__date__gte=created_from_date)
        if created_to:
            created_to_date = parse_date(created_to)
            if created_to_date:
                queryset = queryset.filter(created_at__date__lte=created_to_date)

        refund_min = params.get("refund_min")
        refund_max = params.get("refund_max")
        try:
            if refund_min:
                queryset = queryset.filter(refund_amount__gte=float(refund_min))
            if refund_max:
                queryset = queryset.filter(refund_amount__lte=float(refund_max))
        except ValueError:
            pass  # silently ignore invalid numbers

        refund_method = params.get("refund_method")
        if refund_method:
            queryset = queryset.filter(refund_method__iexact=refund_method)

        admin_decision = params.get("admin_decision")
        if admin_decision:
            queryset = queryset.filter(admin_decision__iexact=admin_decision)

        allow_return = params.get("allow_return")
        if allow_return in ["true", "false"]:
            queryset = queryset.filter(variant_policy_snapshot__allow_return=(allow_return == "true"))

        return_days = params.get("return_days")
        if return_days and return_days.isdigit():
            queryset = queryset.filter(variant_policy_snapshot__return_days=int(return_days))

        return queryset

        
class AdminReturnRequestdetailAPIView(RetrieveAPIView):
    serializer_class=ReturnRequestSerializer
    permission_classes=[IsAdmin]
    queryset=ReturnRequest.objects.all()

class AdminReplacementRequestListAPIView(ListAPIView):
    serializer_class = ReplacementRequestSerializer
    permission_classes = [IsAdmin]
    pagination_class = FlexiblePageSizePagination
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = ["id", "created_at", "updated_at", "delivered_at", "status", "admin_decision"]
    ordering = ["-created_at"]
    search_fields = [
        "user__first_name", "user__last_name", "user__email",
        "order_item__product_variant__product__name",
        "order_item__product_variant__variant_name",
        "order__shipping_address__full_name",
    ]

    def get_queryset(self):
        params = self.request.query_params

        queryset = (
            ReplacementRequest.objects
            .select_related(
                "user",
                "order",
                "order__shipping_address",
                "order_item__product_variant__product",
                "order_item__product_variant"
            )
            .prefetch_related("order_item__product_variant__images")
            .order_by("-created_at")
        )

        # --- Filters ---
        status = params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        order_id = params.get("order_id")
        if order_id:
            queryset = queryset.filter(order__id=order_id)

        product_name = params.get("product_name")
        if product_name:
            queryset = queryset.filter(order_item__product_variant__product__name__icontains=product_name)

        variant_name = params.get("variant_name")
        if variant_name:
            queryset = queryset.filter(order_item__product_variant__variant_name__icontains=variant_name)

        user_email = params.get("user_email")
        if user_email:
            queryset = queryset.filter(user__email__icontains=user_email)

        created_from = params.get("start")
        created_to = params.get("end")
        if created_from:
            start = parse_date(created_from)
            if start:
                queryset = queryset.filter(created_at__date__gte=start)
        if created_to:
            end = parse_date(created_to)
            if end:
                queryset = queryset.filter(created_at__date__lte=end)

        admin_decision = params.get("admin_decision")
        if admin_decision:
            queryset = queryset.filter(admin_decision__iexact=admin_decision)

        allow_replacement = params.get("allow_replacement")
        if allow_replacement in ["true", "false"]:
            queryset = queryset.filter(variant_policy_snapshot__allow_replacement=(allow_replacement == "true"))

        replacement_days = params.get("replacement_days")
        if replacement_days and replacement_days.isdigit():
            queryset = queryset.filter(variant_policy_snapshot__replacement_days=int(replacement_days))

        # --- Replacement days remaining filter (manual loop) ---
        min_days = params.get("min_days_remaining")
        max_days = params.get("max_days_remaining")
        if min_days or max_days:
            ids = []
            for r in queryset:
                remaining = r.get_replacement_days_remaining()
                if min_days and remaining < int(min_days):
                    continue
                if max_days and remaining > int(max_days):
                    continue
                ids.append(r.id)
            queryset = queryset.filter(id__in=ids)

        return queryset


class AdminReplacementRequestdetailAPIView(RetrieveAPIView):
    serializer_class=ReplacementRequestSerializer
    permission_classes=[IsAdmin]
    queryset=ReplacementRequest.objects.all()

class AdminLogListAPIView(ListAPIView):
    serializer_class = AdminLogSerializer
    permission_classes = [IsAdmin]
    pagination_class = FlexiblePageSizePagination
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = ["timestamp", "action", "order__order_number", "order_item__id"]
    ordering = ["-timestamp"]
    search_fields = [
        "order__order_number",
        "order_item__product_variant__product__name",
        "order_item__product_variant__variant_name",
        "updated_by__first_name",
        "updated_by__last_name",
        "updated_by__email",
        "action"
    ]

    def get_queryset(self):
        params = self.request.query_params

        queryset = (
            AdminLog.objects
            .select_related(
                "order",
                "order_item__product_variant__product",
                "order_item__product_variant",
                "updated_by"
            )
            .order_by("-timestamp")
        )

        action = params.get("action")
        if action:
            queryset = queryset.filter(action__iexact=action)

        order_number = params.get("order_number")
        if order_number:
            queryset = queryset.filter(order__order_number__iexact=order_number)

        updated_by_id = params.get("updated_by_id")
        if updated_by_id and updated_by_id.isdigit():
            queryset = queryset.filter(updated_by__id=int(updated_by_id))

        product_name = params.get("product_name")
        if product_name:
            queryset = queryset.filter(order_item__product_variant__product__name__icontains=product_name)

        variant_name = params.get("variant_name")
        if variant_name:
            queryset = queryset.filter(order_item__product_variant__variant_name__icontains=variant_name)

        return queryset
   
# ADMIN: list banners with filters, search, and ordering
class AdminBannerListAPIView(generics.ListAPIView):
    serializer_class = BannerSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]              # ?is_active=true/false
    search_fields = ["title", "subtitle"]         # ?search=summer
    ordering_fields = ["order", "created_at"]     # ?ordering=order or ?ordering=-created_at

    def get_queryset(self):
        return Banner.objects.all().order_by("order")


# ADMIN: create banners
class BannerCreateAPIView(generics.CreateAPIView):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [IsAdmin]
    parser_classes = (MultiPartParser, FormParser)


# ADMIN: retrieve, update, delete banners
class BannerUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [IsAdmin]
    parser_classes = (MultiPartParser, FormParser)



class DelhiveryWebhookAPIView(APIView):
    """
    Receives real-time shipment status updates from Delhivery (Scan Push).
    Handles both single and multiple shipment payloads.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            data = request.data
            logger.info(f"📦 Delhivery Webhook Received: {data}")

            # Delhivery sends either 'Shipments' or single 'Shipment'
            shipments = data.get("Shipments") or [data.get("Shipment")] if data.get("Shipment") else []
            processed = []

            if not shipments:
                return Response({"error": "No shipment data found"}, status=400)

            for shipment in shipments:
                if not shipment:
                    continue

                waybill = shipment.get("AWB") or shipment.get("waybill")
                status_obj = shipment.get("Status") or {}
                status_text = (status_obj.get("Status") or "").strip().lower()
                updated_at = status_obj.get("StatusDateTime") or timezone.now()

                if not waybill or not status_text:
                    continue

                # ✅ Map Delhivery status → internal order status
                status_map = {
                    "manifested": "processing",
                    "picked up": "picked",
                    "in transit": "in_transit",
                    "out for delivery": "out_for_delivery",
                    "delivered": "delivered",
                    "rto initiated": "return_initiated",
                    "rto delivered": "returned",
                    "cancelled": "cancelled",
                    "undelivered": "undelivered",
                }

                order_status = status_map.get(status_text)
                if not order_status:
                    logger.warning(f"⚠️ Unknown status '{status_text}' for {waybill}")
                    continue

                # ✅ Find order by waybill
                try:
                    order = Order.objects.get(waybill=waybill)
                except Order.DoesNotExist:
                    logger.warning(f"🚫 No order found for waybill {waybill}")
                    continue

                # ✅ Update order
                order.status = order_status
                if order_status == "delivered":
                    order.delivered_at = timezone.now()
                order.save(update_fields=["status", "delivered_at"])

                # ✅ Send notification
                send_multichannel_notification(
                    user=order.user,
                    order=order,
                    event=f"order_{order_status}",
                    message=f"Your order {order.order_number} is now {order_status.replace('_', ' ')}!",
                    channels=["email"],
                    payload={
                        "waybill": waybill,
                        "courier": "Delhivery",
                        "status_updated_at": str(updated_at),
                    },
                )

                processed.append({
                    "order_number": order.order_number,
                    "status": order_status,
                    "waybill": waybill,
                })

            return Response({"success": True, "processed": processed}, status=200)

        except Exception as e:
            logger.exception("❌ Error processing Delhivery webhook")
            return Response({"error": str(e)}, status=500)


# class RazorpayWebhookAPIView(APIView):
#     authentication_classes = []
#     permission_classes = []

#     def post(self, request):
#         try:
#             # --- Step 1: Verify Razorpay signature ---
#             webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
#             received_signature = request.headers.get("X-Razorpay-Signature")
#             body = request.body.decode("utf-8")

#             if not webhook_secret:
#                 return Response(
#                     {"error": "Webhook secret not configured"},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 )

#             generated_signature = hmac.new(
#                 webhook_secret.encode(), body.encode(), hashlib.sha256
#             ).hexdigest()

#             if not hmac.compare_digest(received_signature, generated_signature):
#                 return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

#             # --- Step 2: Extract Razorpay event info ---
#             event = request.data.get("event")
#             payload = request.data.get("payload", {})
#             print(f"✅ Razorpay webhook received: {event}")

#             if event == "payment.captured":
#                 payment_entity = payload.get("payment", {}).get("entity", {})
#                 razorpay_order_id = payment_entity.get("order_id")
#                 razorpay_payment_id = payment_entity.get("id")

#                 # --- Step 3: Update your order ---
#                 try:
#                     order = Order.objects.get(razorpay_order_id=razorpay_order_id)
#                     order.payment_id = razorpay_payment_id
#                     order.status = "paid"
#                     order.save(update_fields=["payment_id", "status"])
#                     print(f"✅ Order {order.order_number} marked as paid.")

#                     # (Optional) Send confirmation email / trigger promoter commission
#                     from orders.signals import send_multichannel_notification
#                     send_multichannel_notification(
#                         user=order.user,
#                         order=order,
#                         event="order_paid",
#                         message=f"🎉 Payment received for your order {order.order_number}.",
#                         channels=["email"],
#                     )

#                 except Order.DoesNotExist:
#                     print(f"⚠️ No matching order found for Razorpay order ID: {razorpay_order_id}")

#             elif event == "payment.failed":
#                 payment_entity = payload.get("payment", {}).get("entity", {})
#                 razorpay_order_id = payment_entity.get("order_id")

#                 Order.objects.filter(razorpay_order_id=razorpay_order_id).update(status="failed")
#                 print(f"❌ Payment failed for order: {razorpay_order_id}")

#             # You can also listen to:
#             # - refund.processed
#             # - payout.processed (later if you add promoter/investor payouts)

#             return Response({"success": True})

#         except Exception as e:
#             print("⚠️ Razorpay Webhook Error:", e)
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)