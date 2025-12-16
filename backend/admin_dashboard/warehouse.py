from django.db import models
from django.core.exceptions import ValidationError
from django.db import models
from django.core.exceptions import ValidationError
from datetime import time

# class Warehouse(models.Model):
#     name = models.CharField(
#         max_length=100,
#         unique=True,
#         db_index=True,
#         help_text="Must exactly match Delhivery pickup_location (case-sensitive)"
#     )

#     phone = models.CharField(max_length=15)
#     email = models.EmailField(blank=True, null=True)

#     address = models.TextField()
#     city = models.CharField(max_length=50)
#     state = models.CharField(max_length=50, blank=True, null=True)
#     pin = models.CharField(max_length=6)
#     country = models.CharField(max_length=50, default="India")

#     return_address = models.TextField()
#     return_city = models.CharField(max_length=50)
#     return_state = models.CharField(max_length=50)
#     return_pin = models.CharField(max_length=6)
#     return_country = models.CharField(max_length=50, default="India")

#     delhivery_synced = models.BooleanField(default=False)
#     delhivery_warehouse_id = models.CharField(max_length=100, blank=True, null=True)
#     last_synced_at = models.DateTimeField(null=True, blank=True)
#     last_sync_message = models.TextField(blank=True, null=True)

#     is_active = models.BooleanField(default=True)
#     is_deleted = models.BooleanField(default=False)

#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def clean(self):
#         if not self.pin.isdigit() or len(self.pin) != 6:
#             raise ValidationError("Pickup pincode must be a 6-digit number.")

#         if not self.return_pin.isdigit() or len(self.return_pin) != 6:
#             raise ValidationError("Return pincode must be a 6-digit number.")

#     def save(self, *args, **kwargs):
#         if self.pk:
#             old = Warehouse.objects.get(pk=self.pk)
#             if old.delhivery_synced and old.name != self.name:
#                 raise ValidationError(
#                     "Warehouse name cannot be changed after Delhivery sync "
#                     "(pickup_location is case-sensitive)."
#                 )
#         super().save(*args, **kwargs)

#     def __str__(self):
#         return self.name

class DelhiveryPickupRequest(models.Model):
    STATUS_CHOICES = (
        ("OPEN", "Open"),
        ("CLOSED", "Closed"),
        ("FAILED", "Failed"),
    )

    PICKUP_SLOT_CHOICES = (
        ("midday", "Midday (10:00-14:00)"),
        ("evening", "Evening (14:00-18:00)"),
    )

    PICKUP_SLOTS = {
        "midday": time(10, 0, 0),
        "evening": time(14, 0, 0),
    }

    pickup_date = models.DateField(db_index=True)
    slot = models.CharField(max_length=10, choices=PICKUP_SLOT_CHOICES)
    expected_package_count = models.PositiveIntegerField()

    delhivery_request_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="OPEN", db_index=True)
    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-pickup_date"]

    def __str__(self):
        return f"{self.get_slot_display()} Pickup on {self.pickup_date} ({self.expected_package_count} packages)"

    @property
    def pickup_time(self):
        # Use self.PICKUP_SLOTS to reference the class attribute
        return self.PICKUP_SLOTS[self.slot]
