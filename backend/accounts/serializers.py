#accounts app

from djoser.serializers import PasswordResetConfirmSerializer,SetPasswordSerializer,UserCreateSerializer,UserCreatePasswordRetypeSerializer
from rest_framework import serializers
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes,force_str
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.contrib.auth.password_validation import validate_password
from accounts.email import CustomPasswordResetEmail
from investor.serializers import InvestorSerializer
from promoter.models import Promoter
from promoter.serializers import PromoterSerializer,MinimalPromoterSerializer
from django.core.validators import RegexValidator
from investor.models import Investor
from accounts.email import CustomActivationEmail
from djoser.utils import encode_uid
from manager.models import Manager
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
logger = logging.getLogger('accounts')


User=get_user_model()
phone_regex = RegexValidator(
    regex=r'^(\+91[\-\s]?|0)?[6-9]\d{9}$',
    message="Phone number must be a valid Indian number."
)

pincode_regex = RegexValidator(
    regex=r'^[1-9][0-9]{5}$',
    message="Pincode must be a valid 6-digit Indian pincode."
)
name_regex = RegexValidator(
    regex=r'^[A-Za-z\s\-]+$',
    message="This field can only contain letters, spaces, and hyphens."
)

class BaseUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    current_role = serializers.SerializerMethodField()  # override to show active_role
    role=serializers.SerializerMethodField()
    auth_provider = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name','role',
            'is_active', 'is_verified', 'roles', 'current_role', 'active_role',
            'created_at', 'custom_user_profile','auth_provider'
        ]
        read_only_fields = ['id', 'email', 'active_role', 'role', 'created_at', 'custom_user_profile']
    def get_role(self, obj):
        if obj.role in ['admin', 'investor']:
            return obj.role
        # Only override for customer/promoter
        return obj.active_role or obj.role

    def get_roles(self, obj):
        return obj.roles_list or []

    def get_current_role(self, obj):
        # If admin/investor, use actual role
        if obj.role in ['admin', 'investor']:
            return obj.role
        return obj.active_role


    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class CustomUserCreateSerializer(BaseUserCreateSerializer):
    email = serializers.EmailField(required=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ("id", "email", "first_name", "last_name", "password")
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        existing_user = User.objects.filter(email__iexact=value).first()
        if existing_user:
            # Handle inactive or unverified users
            if not existing_user.is_active or not getattr(existing_user, "is_verified", False):
                self.context["inactive_user"] = existing_user
                return value
            # Active user already exists
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        inactive_user = self.context.get("inactive_user")

        # Case 1: Inactive user already exists → Djoser will handle re-sending activation
        if inactive_user:
            self.context["activation_resent"] = True
            return inactive_user

        # Case 2: Fresh signup → create new user
        user = User.objects.create_user(**validated_data)
        user.assign_role("customer", set_active=True)
        self.context["activation_resent"] = False
        return user

    def to_representation(self, instance):
        """
        Return a minimal representation for signup responses.
        Avoids nested RoleBasedUserDisplaySerializer to prevent Djoser confusion.
        """
        data = super().to_representation(instance)
        data["needs_activation"] = not instance.is_active or not getattr(instance, "is_verified", False)
        data["email"] = instance.email

        # Add frontend-friendly flag if activation was re-sent
        if self.context.get("activation_resent"):
            data["reactivation"] = True
            data["message"] = "Account already exists but not activated. Activation email re-sent."
        else:
            data["reactivation"] = False
            data["message"] = "Account created successfully. Please check your email to activate your account."

        return data

class CustomerProfileSerializer(BaseUserSerializer):
    phone_number = serializers.CharField(
        required=False, allow_blank=True, validators=[phone_regex]
    )
    pincode = serializers.CharField(
        required=False, allow_blank=True, validators=[pincode_regex]
    )
    district = serializers.CharField(
        required=False, allow_blank=True, validators=[name_regex]
    )
    city = serializers.CharField(
        required=False, allow_blank=True, validators=[name_regex]
    )
    state = serializers.CharField(
        required=False, allow_blank=True, validators=[name_regex]
    )

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + [
            'phone_number', 'address', 'pincode',
            'district', 'city', 'state', 'social_auth_pro_pic'
        ]

    def validate_phone_number(self, value):
        # Skip empty values
        if not value:
            return value
        
        qs = User.objects.exclude(pk=self.instance.pk if self.instance else None)
        if qs.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value


class InvestorProfileSerializer(BaseUserSerializer):
    investor_profile = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + ['investor_profile']

    def get_investor_profile(self, obj):
        try:
            if hasattr(obj, 'investor'):
                return InvestorSerializer(obj.investor).data
            return None
        except Investor.DoesNotExist:
            return None

class PromoterProfileSerializer(BaseUserSerializer):
    promoter_profile = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + ['promoter_profile']

    def get_promoter_profile(self, obj):
        promoter = getattr(obj, 'promoter', None)
        return MinimalPromoterSerializer(promoter).data if promoter else None

class ManagerProfileSerializer(BaseUserSerializer):
    manager_profile = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + ['manager_profile']

    def get_manager_profile(self, obj):
        manager = getattr(obj, 'manager', None)
        if not manager:
            return None
        return {
            "manager_type": manager.manager_type,
            "phone_number": manager.phone_number,
            "address": manager.address,
            "district": manager.district,
            "city": manager.city,
            "state": manager.state,
            "pincode": manager.pincode
        }

class RoleBasedUserDisplaySerializer(serializers.Serializer):
    def to_representation(self, instance):
        # Start with base user fields
        base_data = BaseUserSerializer(instance, context=self.context).data

        # Always include promoter profile if exists
        if hasattr(instance, 'promoter'):
            base_data["promoter_profile"] = MinimalPromoterSerializer(instance.promoter, context=self.context).data

        # Always include investor profile if exists
        if hasattr(instance, 'investor'):
            base_data["investor_profile"] = InvestorSerializer(instance.investor, context=self.context).data

        # Always include manager profile if exists
        if hasattr(instance, 'manager'):
            base_data["manager_profile"] = ManagerProfileSerializer(instance, context=self.context).data

        return base_data



class ResendActivationEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class CustomUserCreatePasswordRetypeSerializer(UserCreatePasswordRetypeSerializer):
    class Meta(UserCreatePasswordRetypeSerializer.Meta):
        model = User
        fields = ("id", "email", "first_name", "last_name", "password")
        extra_kwargs = {
            "email": {"validators": []},  # 👈 disables Djoser’s unique validator
        }

    def validate(self, attrs):
        email = attrs.get("email")
        existing_user = User.objects.filter(email__iexact=email).first()

        if existing_user:
            if not existing_user.is_active or not getattr(existing_user, "is_verified", False):
                self.context["inactive_user"] = existing_user
                return attrs

            raise serializers.ValidationError(
                {"email": "A user with this email already exists."}
            )

        return super().validate(attrs)

    def create(self, validated_data):
        inactive_user = self.context.get("inactive_user")

        if inactive_user:
            self.context["reactivation"] = True
            return inactive_user

        # Normal new signup
        user = super().create(validated_data)
        self.context["reactivation"] = False
        return user

    def to_representation(self, instance):
        data = RoleBasedUserDisplaySerializer(instance, context=self.context).data
        data["needs_activation"] = not instance.is_active or not getattr(instance, "is_verified", False)
        data["email"] = instance.email
        data["reactivation"] = self.context.get("reactivation", False)

        if data["reactivation"]:
            data["message"] = "Account already exists but not activated. Activation email re-sent."
        else:
            data["message"] = "Account created successfully. Please check your email to activate your account."

        return data



class CustomPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self,value):
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user is associated with this email address")

        if not (self.user.is_active and self.user.is_verified):
            raise serializers.ValidationError("User account is inactive or not verified")

        return value

    def get_user(self):
        return self.user

    def save(self):
        request = self.context.get('request')
        
        user = self.get_user()

        # Generate password reset token and uid
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Prepare email content
        email_sender = CustomPasswordResetEmail(
            context={
                'user':user,
                'uid':uid,
                'token':token,
                'request':request
            }
        )
        email_sender.send(to=[user.email])


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    def validate(self, attrs):
        uid = attrs.get('uid')
        token = attrs.get('token')
        new_password = attrs.get('new_password')

        try:
            uid = force_str(urlsafe_base64_decode(uid))
            self.user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError('Invalid UID')

        if not default_token_generator.check_token(self.user, token):
            raise serializers.ValidationError('Invalid or expired token')

        if self.user.check_password(new_password):
            raise serializers.ValidationError("New password cannot be the same as the old password")

        # ✅ Enforce Django's built-in password validators
        validate_password(new_password, self.user)

        return attrs

    def save(self):
        password = self.validated_data['new_password']
        self.user.set_password(password)
        self.user.save()
        return self.user
    
class CustomSetPasswordSerializer(SetPasswordSerializer):
    def validate(self, attrs):
        user = self.context['request'].user

        old_password = attrs.get("current_password")
        new_password = attrs.get("new_password")

        # Check if old password is correct
        if not user.check_password(old_password):
            raise serializers.ValidationError({"current_password": "Old password is incorrect."})

        # Prevent reuse of the old password
        if old_password == new_password:
            raise serializers.ValidationError({"new_password": "New password cannot be the same as the old password."})

        # Validate new password against Django validators
        validate_password(new_password, user)

        return attrs

    def save(self, **kwargs):
        password = self.validated_data["new_password"]
        self.user.set_password(password)
        self.user.save()
        return self.user

class FacebookLoginSerializer(serializers.Serializer):
    access_token = serializers.CharField(write_only=True)


    def validate_access_token(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Access token is required')

        return value