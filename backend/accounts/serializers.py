#accounts app

from djoser.serializers import PasswordResetConfirmSerializer,SetPasswordSerializer,UserCreateSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes,force_str
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.contrib.auth.password_validation import validate_password
from accounts.email import CustomPasswordResetEmail
from investor.serializers import InvestorSerializer
from promoter.models import Promoter
from promoter.serializers import PromoterSerializer
from django.core.validators import RegexValidator
from investor.models import Investor
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer



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


    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name','role',
            'is_active', 'is_verified', 'roles', 'current_role', 'active_role',
            'created_at', 'custom_user_profile'
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
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        # Create user with proper password handling
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        # Assign default role
        user.assign_role('customer', set_active=True)

        # Return the instance wrapped by your RoleBasedUserSerializer
        return user

    def to_representation(self, instance):
        # Use RoleBasedUserSerializer to return full profile after signup
        from .serializers import RoleBasedUserSerializer
        return RoleBasedUserSerializer(instance, context=self.context).data

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
            'district', 'city', 'state','social_auth_pro_pic'
        ]

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
        return PromoterSerializer(promoter).data if promoter else None

class RoleBasedUserSerializer(serializers.Serializer):
    def to_representation(self, instance):
        active_role = getattr(instance,'active_role','customer')
        if active_role == 'promoter' and hasattr(instance,'promoter'):
            promoter_serilaizer=PromoterSerializer(instance.promoter,context=self.context)
            data=promoter_serilaizer.data
            data.update({
                "id": instance.id,
                "email": instance.email,
                "first_name": instance.first_name,
                "last_name": instance.last_name,
                "active_role": instance.active_role,
                "roles": list(instance.user_roles.values_list("role__name", flat=True))
            })
            return data
       
        if active_role == 'customer':
            serializer = CustomerProfileSerializer(instance, context=self.context)
        elif active_role == 'investor'and hasattr(instance, 'investor'):
            serializer = InvestorProfileSerializer(instance, context=self.context)
        elif active_role ==  'admin':
                serializer = BaseUserSerializer(instance, context=self.context)
        return serializer.data


class ResendActivationEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


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