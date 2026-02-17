from django.db import models
from accounts.models import CustomUser  # Assuming this is your user model

MANAGER_TYPE_CHOICES = [
    ("regional", "Regional"),
    ("national", "National"),
]

class Manager(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='manager')
    manager_type = models.CharField(max_length=50, choices=MANAGER_TYPE_CHOICES, default="regional")
    phone_number = models.CharField(max_length=15, blank=True, null=True)  # common field
    address = models.TextField(blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.manager_type})"
