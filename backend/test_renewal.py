from promoter.models import Promoter, Subscription
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory, force_authenticate
from promoter.views import ManageSubscriptionAPIView

User = get_user_model()
user = User.objects.first()
user.active_role = 'promoter'
user.save()

promoter, _ = Promoter.objects.get_or_create(user=user)

def test_renewal_behavior():
    print("--- Testing Active Subscription Restriction ---")
    promoter.promoter_type = 'paid'
    promoter.save()
    
    sub, _ = Subscription.objects.get_or_create(promoter=promoter, status='active', defaults={'amount': 100, 'expires_at': timezone.now() + timedelta(days=5)})
    sub.expires_at = timezone.now() + timedelta(days=5)
    sub.status = 'active'
    sub.save()
    
    factory = APIRequestFactory()
    request = factory.post('/api/promoter/manage-subscription/', {'plan_type': 'monthly'}, format='json')
    force_authenticate(request, user=user)
    view = ManageSubscriptionAPIView.as_view()
    
    response = view(request)
    print(f"Response Status (Active): {response.status_code}")
    print(f"Response Data (Active): {response.data}")

    print("\n--- Testing Expired Subscription Access ---")
    sub.expires_at = timezone.now() - timedelta(days=1)
    sub.save()
    
    # Demote
    sub.mark_expired_if_needed()
    promoter.refresh_from_db()
    print(f"Promoter type after expiry: {promoter.promoter_type}")
    
    response = view(request)
    print(f"Response Status (Expired): {response.status_code}")
    print(f"Response Data (Expired): {response.data}")

test_renewal_behavior()
