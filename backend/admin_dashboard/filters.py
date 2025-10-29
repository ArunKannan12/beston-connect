# filters.py
from django_filters import rest_framework as filters
from django.db.models import Case, When, Value, CharField
from .models import WarehouseLog

class WarehouseTimelineFilter(filters.FilterSet):
    status = filters.CharFilter(method='filter_status')
    order_number = filters.CharFilter(field_name='order__order_number', lookup_expr='icontains')
    picked_at = filters.DateFromToRangeFilter()
    delivered_at = filters.DateFromToRangeFilter()

    def filter_status(self, qs, name, value):
        value = value.lower()
        valid_statuses = ['pending', 'picked', 'packed', 'shipped', 'out_for_delivery', 'delivered']
        if value not in valid_statuses:
            return qs.none()

        # Annotate current_status dynamically
        qs = qs.annotate(
            current_status=Case(
                When(delivered_at__isnull=False, then=Value('delivered')),
                When(out_for_delivery_at__isnull=False, then=Value('out_for_delivery')),
                When(shipped_at__isnull=False, then=Value('shipped')),
                When(packed_at__isnull=False, then=Value('packed')),
                When(picked_at__isnull=False, then=Value('picked')),
                default=Value('pending'),
                output_field=CharField()
            )
        )
        return qs.filter(current_status=value)

    class Meta:
        model = WarehouseLog
        fields = ['order_number', 'picked_at', 'delivered_at']