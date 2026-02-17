from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, ProductVariant, Category, ProductVariantImage,Banner,ProductRating
from .serializers import (
    ProductSerializer, CategorySerializer,BannerSerializer,
    ProductVariantSerializer, ProductVariantImageSerializer,
   
)
from django.db import transaction
from rest_framework.permissions import AllowAny
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsAdmin, IsAdminOrReadOnly,IsCustomer
from rest_framework.exceptions import ValidationError
from django.db.models import F,Q,Min,Max,Sum,Avg,Count
from .serializers import ProductRatingCreateUpdateSerializer,ProductRatingListSerializer
from .utils import user_can_rate_product,update_product_rating_stats

NEW_PRODUCT_DAYS = 7

# -------------------- CATEGORIES --------------------
class CategoryListCreateAPIView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    # Add filtering and search
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']  # Allows filtering by name or slug
    ordering_fields = ['name', 'created_at']  # Optional: allow ordering by these fields
    ordering = ['name']  # Default ordering

    # Optionally override get_queryset for more complex filtering
    def get_queryset(self):
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        slug = self.request.query_params.get('slug')

        if name:
            queryset = queryset.filter(name__icontains=name)
        if slug:
            queryset = queryset.filter(slug__icontains=slug)

        return queryset


class CategoryRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field='slug'

# -------------------- PRODUCTS --------------------
class ProductListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['featured', 'is_available']
    search_fields = [
        'name', 'description', 'slug',
        'variants__variant_name', 'variants__description', 'variants__sku'
    ]
    ordering_fields = ['created_at', 'name']

    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.AllowAny()]

    def get_serializer_context(self):
        return {
            "request": self.request,
            "search_query": self.request.query_params.get("search", "").strip().lower()
        }

    def get_queryset(self):
        params = self.request.query_params
        qs = Product.objects.select_related('category').prefetch_related('variants', 'variants__images')

        # Category filter
        if category_slug := params.get('category_slug'):
            qs = qs.filter(category__slug=category_slug)

        # Annotate for stock and price
        qs = qs.annotate(
            total_stock=Sum('variants__stock'),
            min_variant_stock=Min('variants__stock'),
            min_variant_price=Min('variants__offer_price', filter=Q(variants__offer_price__isnull=False)),
            max_variant_price=Max('variants__offer_price', filter=Q(variants__offer_price__isnull=False)),
        )

        # Availability logic
        availability = params.get('availability', 'all')
        is_admin = self.request.user.is_authenticated and getattr(self.request.user, 'role', '') == 'admin'
        if availability == "available":
            qs = qs.filter(is_available=True)
        elif availability == "unavailable":
            qs = qs.filter(is_available=False) if is_admin else qs.none()
        elif availability == "all" and not is_admin:
            qs = qs.filter(is_available=True)

        # Stock filters
        stock_filter = params.get('stock')
        if stock_filter == 'low-stock':
            qs = qs.filter(min_variant_stock__gt=0, min_variant_stock__lte=5)
        elif stock_filter == 'in-stock':
            qs = qs.filter(total_stock__gt=0)
        elif stock_filter == 'out-of-stock':
            qs = qs.filter(total_stock=0)

        # Price filters
        if min_price := params.get('min_price'):
            qs = qs.filter(min_variant_price__gte=min_price)
        if max_price := params.get('max_price'):
            qs = qs.filter(max_variant_price__lte=max_price)

        # New product filter
        if params.get('is_new', '').lower() == 'true':
            qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=NEW_PRODUCT_DAYS))

        # Ordering
        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "name-asc": "name",
            "name-desc": "-name",
            "price-asc": "min_variant_price",
            "price-desc": "-max_variant_price"
        }
        qs = qs.order_by(ordering_map.get(params.get('ordering'), 'name'))

        return qs.distinct()

class ProductRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Product.objects.select_related('category')
        if not self.request.user.is_authenticated or  (self.request.user.role != 'admin'):
            qs = qs.filter(is_available=True)
        return qs


# -------------------- PRODUCT VARIANTS --------------------

class ProductVariantListAPIView(generics.ListAPIView):
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['variant_name', 'sku', 'description', 'product__name']
    ordering_fields = ['base_price', 'offer_price', 'stock', 'product__created_at', 'product__name']

    def get_queryset(self):
        qs = ProductVariant.objects.select_related('product').prefetch_related('images')
        params = self.request.query_params

        # ✅ Variant-level featured filter
        featured = params.get("featured")
        if featured and featured.lower() in ["true", "1"]:
            qs = qs.filter(featured=True)

        # ✅ Product-level availability filter
        available = params.get("is_available")
        if available and available.lower() in ["true", "1"]:
            qs = qs.filter(product__is_available=True)

        # ✅ Category filter
        category_slug = params.get("category_slug")
        if category_slug:
            qs = qs.filter(product__category__slug=category_slug)

        # ✅ Default ordering
        if not params.get("ordering"):
            qs = qs.order_by("-product__created_at")

        return qs


class ProductVariantUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductVariantSerializer
    lookup_field = 'id'
    queryset = ProductVariant.objects.select_related('product')

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


        
class BulkProductVariantCreateAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]  # ✅ Only admin can access

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        variants_data = request.data.get('variants', [])
        if not variants_data:
            return Response({"error": "No variants provided"}, status=status.HTTP_400_BAD_REQUEST)

        created_variants = []
        errors = []

        for data in variants_data:
            images_data = data.pop('images', [])
            data['product'] = product.id

            serializer = ProductVariantSerializer(data=data)
            if serializer.is_valid():
                variant = serializer.save()
                for image_data in images_data:
                    ProductVariantImage.objects.create(variant=variant, **image_data)
                created_variants.append(serializer.data)
            else:
                errors.append({
                    "variant_name": data.get("variant_name"),
                    "errors": serializer.errors
                })

        if errors:
            return Response({
                "created": created_variants,
                "errors": errors
            }, status=status.HTTP_207_MULTI_STATUS)

        return Response({"created": created_variants}, status=status.HTTP_201_CREATED)

# -------------------- FEATURED & RELATED --------------------
class FeaturedProductsAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductVariantSerializer
    def get_queryset(self):
        return ProductVariant.objects.select_related('product').prefetch_related('images')\
            .filter(featured=True, product__is_available=True)\
            .order_by('-product__created_at')



class RelatedProductsAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            raise ValidationError("Product not found")
        return Product.objects.filter(category=product.category, is_available=True).exclude(id=product.id).order_by('created_at')[:6]


# -------------------- VARIANT IMAGES --------------------
class ProductVariantImageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductVariantImageSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        variant_id = self.kwargs.get('variant_id')
        return ProductVariantImage.objects.filter(variant_id=variant_id)

    def perform_create(self, serializer):
        variant_id = self.kwargs.get('variant_id')
        serializer.save(variant_id=variant_id)


class ProductVariantImageRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductVariantImageSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'id'

    def get_queryset(self):
        return ProductVariantImage.objects.all()

# CUSTOMER: list only active banners (no filters, no search)
class CustomerBannerListAPIView(generics.ListAPIView):
    queryset = Banner.objects.filter(is_active=True).order_by("order")
    serializer_class = BannerSerializer
    permission_classes = [permissions.AllowAny]

class CreateProductRatingAPIView(APIView):
    permission_classes = [IsCustomer, IsAuthenticated]

    def post(self, request, product_id):
        user = request.user

        try:
            product = ProductVariant.objects.get(id=product_id)
        except ProductVariant.DoesNotExist:
            return Response(
                {"detail": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user_can_rate_product(user, product):
            return Response(
                {"detail": "You can rate only products you purchased"},
                status=status.HTTP_403_FORBIDDEN
            )

        if ProductRating.objects.filter(user=user, product=product).exists():
            return Response(
                {"detail": "You have already rated this product"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProductRatingCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user, product=product)

        update_product_rating_stats(product)

        return Response(
            {"detail": "Rating added", "rating": serializer.data},
            status=status.HTTP_201_CREATED
        )

class MyProductRatingAPIView(APIView):
    permission_classes = [IsCustomer, IsAuthenticated]

    def get_object(self, user, product_id):
        try:
            return ProductRating.objects.get(user=user, product_id=product_id)
        except ProductRating.DoesNotExist:
            return None

    # 🔹 Fetch my rating
    def get(self, request, product_id):
        rating = self.get_object(request.user, product_id)
        if not rating:
            return Response({"detail": "Rating not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductRatingCreateUpdateSerializer(rating)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 🔹 Update my rating
    def patch(self, request, product_id):
        rating = self.get_object(request.user, product_id)
        if not rating:
            return Response({"detail": "Rating not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductRatingCreateUpdateSerializer(rating, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        update_product_rating_stats(rating.product)

        return Response({"detail": "Rating updated", "rating": serializer.data}, status=status.HTTP_200_OK)

    # 🔹 Delete my rating
    def delete(self, request, product_id):
        rating = self.get_object(request.user, product_id)
        if not rating:
            return Response({"detail": "Rating not found"}, status=status.HTTP_404_NOT_FOUND)

        product = rating.product
        with transaction.atomic():
            rating.delete()
            update_product_rating_stats(product)

        return Response({"detail": "Rating deleted successfully"}, status=status.HTTP_200_OK)


class ProductRatingListAPIView(ListAPIView):
    serializer_class = ProductRatingListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return ProductRating.objects.filter(
            product_id=self.kwargs["product_id"]
        ).exclude(review="").select_related("user")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        stats = queryset.aggregate(
            average_rating=Avg("rating"),
            rating_count=Count("id")
        )

        serializer = self.get_serializer(queryset, many=True)

        return Response({
            "average_rating": round(stats["average_rating"] or 0, 1),
            "rating_count": stats["rating_count"],
            "results": serializer.data
        })


