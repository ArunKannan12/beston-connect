from django.core.management.base import BaseCommand
from django.utils import timezone
from promoter.models import Subscription

class Command(BaseCommand):
    help = 'Expires subscriptions that have passed their expiry date and demotes promoters to unpaid status'

    def handle(self, *args, **options):
        now = timezone.now()
        expired_subscriptions = Subscription.objects.filter(
            status='active',
            expires_at__lte=now
        )
        
        count = expired_subscriptions.count()
        self.stdout.write(f"Found {count} subscriptions to expire.")

        for sub in expired_subscriptions:
            sub.mark_expired_if_needed()
            self.stdout.write(self.style.SUCCESS(f"Successfully expired subscription for {sub.promoter.user.email}"))

        self.stdout.write(self.style.SUCCESS(f"Processed {count} subscriptions."))
