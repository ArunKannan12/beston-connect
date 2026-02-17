from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Sale, PromoterPayment
from .utils import process_sale_commission


@receiver(post_save, sender=Sale)
def handle_sale_commission(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.status != 'completed':
        return

    # Protect against duplicates
    if getattr(instance, 'commission_processed', False):
        return

    process_sale_commission(instance)

    instance.commission_processed = True
    instance.save(update_fields=['commission_processed'])


@receiver(post_save, sender=PromoterPayment)
def handle_promoter_upgrade(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.status != 'success':
        return

    promoter = instance.promoter
    promoter.promoter_type = 'paid'
    promoter.premium_activated_at = timezone.now()
    promoter.save(update_fields=['promoter_type', 'premium_activated_at'])

    # Process any back-commissions they earned while unpaid
    from .utils import process_pending_commission
    process_pending_commission(promoter)
