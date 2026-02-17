# products/utils.py
from django.db.models import Avg, Count
from orders.models import OrderItem
from products.models import ProductRating

def user_can_rate_product(user, product):
    return OrderItem.objects.filter(
        order__user=user,
        product_variant=product,
        status__in=["shipped", "delivered"]
    ).exists()


def update_product_rating_stats(product):
    stats = ProductRating.objects.filter(product=product).aggregate(
        avg=Avg("rating"),
        count=Count("id")
    )

    product.average_rating = round(stats["avg"] or 0, 1)
    product.rating_count = stats["count"]
    product.save(update_fields=["average_rating", "rating_count"])