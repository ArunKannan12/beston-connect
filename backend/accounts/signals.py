from djoser.signals import user_activated
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .models import CustomUser
from .utils import get_client_ip

@receiver(user_activated)

def activate_user(sender,user,request,**kwargs):
    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=['is_verified'])

@receiver(user_logged_in)
def update_login_ip(sender, request, user, **kwargs):
    ip = get_client_ip(request)
    user.last_login_ip = ip
    user.save()
