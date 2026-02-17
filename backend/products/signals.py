from django.db.models import Avg, Count
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import ProductRating,ProductVariant


def recalculate_product_rating(product):
    qs = ProductRating.objects.filter(product=product)

    product.rating_count = qs.count()
    product.average_rating = qs.aggregate(
        avg=Avg("rating")
    )["avg"] or 0

    product.save(update_fields=["rating_count", "average_rating"])

@receiver(post_save, sender=ProductRating)
def update_product_rating_on_save(sender, instance, **kwargs):
    recalculate_product_rating(instance.product)

@receiver(post_delete, sender=ProductRating)
def update_product_rating_on_delete(sender, instance, **kwargs):
    recalculate_product_rating(instance.product)
