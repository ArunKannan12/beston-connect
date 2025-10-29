import django_filters
from .models import Order

class OrderFilter(django_filters.FilterSet):
    created_at__gte = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at__lte = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    shipped_at__gte = django_filters.DateTimeFilter(field_name="shipped_at", lookup_expr="gte")
    shipped_at__lte = django_filters.DateTimeFilter(field_name="shipped_at", lookup_expr="lte")
    delivered_at__gte = django_filters.DateTimeFilter(field_name="delivered_at", lookup_expr="gte")
    delivered_at__lte = django_filters.DateTimeFilter(field_name="delivered_at", lookup_expr="lte")

    class Meta:
        model = Order
        fields = [
            "status",
            "payment_method",
            "is_paid",
            "is_refunded",
            "refund_status",
            "is_restocked",
            "delivered_by",
            "tracking_number",
        ]