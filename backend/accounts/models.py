from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator,MinLengthValidator,MaxLengthValidator,EmailValidator
from rest_framework.exceptions import ValidationError
AUTH_PROVIDERS = [
    ('email', 'Email'),
    ('google', 'Google'),
    ('facebook', 'Facebook'),
]

ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('promoter', 'Promoter'),
        ('admin', 'Admin'),
        ('investor','Investor'),
        ('manager', 'Manager'),
    ] 
email_validator = EmailValidator(
    message="Enter a valid email address"
)
phone_regex = RegexValidator(
    regex=r'^(\+91[\-\s]?|0)?[6-9]\d{9}$',
    message="Phone number must be a valid Indian number. Examples: '+919876543210', '09876543210', '9876543210'."
)
pincode_regex = RegexValidator(
    regex=r'^[1-9][0-9]{5}$',
    message="Pincode must be a valid 6-digit Indian pincode."
)
name_regex = RegexValidator(
    regex=r'^[A-Za-z\s\-]+$',
    message="This field can only contain letters, spaces, and hyphens."
)

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class CustomUserManager(BaseUserManager):
    def create_user(self, email, first_name, last_name, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        if not first_name or not last_name:
            raise ValueError('Users must have a first and last name')
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            first_name=first_name,
            last_name=last_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True')

        return self.create_user(email, first_name, last_name, password, **extra_fields)
    

def user_profile_upload_path(instance, filename):
    return f'profile_pics/{instance.email}/{filename}'


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, validators=[email_validator])
    first_name = models.CharField(max_length=30, validators=[name_regex])
    last_name = models.CharField(max_length=30, validators=[name_regex])

    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    role = models.CharField(max_length=20, default='customer')
    active_role = models.CharField(max_length=50, default='customer')
    roles_list = models.JSONField(default=list, blank=True)  # Cached roles

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    social_auth_pro_pic = models.URLField(blank=True, null=True)
    custom_user_profile = models.URLField(max_length=500, blank=True, null=True)

    phone_number = models.CharField(unique=True,max_length=15, blank=True, null=True, validators=[phone_regex])
    address = models.TextField(blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True, validators=[pincode_regex])
    district = models.CharField(max_length=100, blank=True, null=True, validators=[name_regex])
    city = models.CharField(max_length=100, blank=True, null=True, validators=[name_regex])
    state = models.CharField(max_length=100, blank=True, null=True, validators=[name_regex])

    last_activation_email_sent = models.DateTimeField(null=True, blank=True)
    blocked_until = models.DateTimeField(null=True, blank=True)
    block_count = models.PositiveIntegerField(default=0)
    is_permanently_banned = models.BooleanField(default=False)

    last_password_reset_sent = models.DateTimeField(null=True, blank=True)
    blocked_until_password_reset = models.DateTimeField(null=True, blank=True)
    block_count_password_reset = models.PositiveIntegerField(default=0)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    auth_provider = models.CharField(max_length=50, default='email', choices=AUTH_PROVIDERS)

    objects = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self): return self.email
    def get_full_name(self): return f"{self.first_name} {self.last_name}"
    def get_short_name(self): return self.first_name


    def assign_role(self, role_name: str, set_active: bool = False,referred_by=None):
        """Assign a role to the user and optionally set it active."""
        role_name_lower = role_name.lower()
        print(f"[DEBUG] assign_role called for {self.email}, role={role_name_lower}, set_active={set_active}")

        from accounts.models import Role, UserRole
        from promoter.models import Promoter

        # Ensure the user has a primary key before assigning roles
        if not self.pk:
            self.save()  # initial save to get PK if user was just created

        # Create role if needed
        role_obj, _ = Role.objects.get_or_create(name=role_name_lower)
        UserRole.objects.get_or_create(user=self, role=role_obj)

        # Refresh roles_list (sync from DB)
        roles = list(self.user_roles.values_list('role__name', flat=True))
        updated_fields = []

        if roles != self.roles_list:
            self.roles_list = roles
            updated_fields.append("roles_list")

        # Update active role if needed
        if set_active or not self.active_role:
            self.active_role = role_name_lower
            updated_fields.append("active_role")

        # Always keep current role field in sync
        if self.role != role_name_lower:
            self.role = role_name_lower
            updated_fields.append("role")

        if updated_fields:
            self.save(update_fields=updated_fields)
            print(f"[DEBUG] User updated fields: {updated_fields}")
            
        print(f"[DEBUG] Current roles for {self.email}: {self.roles_list}, active_role: {self.active_role}")
        # Auto-create profile if needed
        if role_name_lower == "promoter":
            promoter_obj, created = Promoter.objects.get_or_create(
                user=self,
                defaults={"promoter_type": "unpaid", "referred_by":referred_by}
            )
            print(f"[DEBUG] Promoter profile {'created' if created else 'exists'}: {promoter_obj}")

        elif role_name_lower == "investor":
            from investor.models import Investor
            investor_obj, created = Investor.objects.get_or_create(user=self)
            print(f"[DEBUG] Investor profile {'created' if created else 'exists'}: {investor_obj}")

        elif role_name_lower == "manager":
            from manager.models import Manager
            manager_obj, created = Manager.objects.get_or_create(user=self)
            print(f"[DEBUG] Manager profile {'created' if created else 'exists'}: {manager_obj}")

    def has_role(self, role_name: str) -> bool:
        """Check if the user has a given role. Always checks DB."""
        role_name_lower = role_name.lower()
        has_role_db = self.user_roles.filter(role__name=role_name_lower).exists()
        print(f"[DEBUG] has_role check for {self.email}, role={role_name_lower}: {has_role_db}")
        return has_role_db
    
    def switch_active_role(self, role_name: str) -> bool:
        """Switch active dashboard role if the user has it."""
        role_name_lower = role_name.lower()
        print(f"[DEBUG] switch_active_role called for {self.email}, role={role_name_lower}")

        if self.has_role(role_name_lower):
            self.active_role = role_name_lower
            self.save(update_fields=['active_role'])
            print(f"[DEBUG] active_role switched to: {self.active_role}")
            return True
        print(f"[DEBUG] User does NOT have role: {role_name_lower}")
        return False

    # ---------------- Validation ---------------- #
    def clean(self):
        super().clean()
        if self.phone_number and len(self.phone_number) != 10:
            raise ValidationError("Phone number must be 10 digits")
        if not self.email:
            raise ValidationError("Email is required")

    # ---------------- Save Override ---------------- #
    def save(self, *args, **kwargs):
        is_new = self.pk is None  # check if user is being created

        # Normalize phone number first
        if self.phone_number:
            import re
            self.phone_number = re.sub(r'\D', '', self.phone_number)[-10:]

        # Save first so user gets a primary key
        super().save(*args, **kwargs)

        # Now that pk exists, safely sync roles_list from DB
        roles = list(self.user_roles.values_list('role__name', flat=True))
        if roles != self.roles_list:
            self.roles_list = roles
            # Only update this field to avoid recursion / double save
            super().save(update_fields=['roles_list'])

        print(f"[DEBUG] save called. roles_list synced: {self.roles_list}, active_role={self.active_role}")



    
class UserRole(models.Model):
    user = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey('Role', on_delete=models.CASCADE, related_name='role_users')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role')

    def __str__(self):
        return f"{self.user.email} → {self.role.name}"


  
class ActivationEmailLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    sent_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["user", "sent_at"])]

class PasswordResetEmailLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_logs')
    sent_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Password reset email sent to {self.user.email} at {self.sent_at}"



