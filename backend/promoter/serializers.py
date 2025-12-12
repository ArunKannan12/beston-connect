from django.conf import settings
from rest_framework import serializers
from .models import Promoter, PromoterCommission, WithdrawalRequest, PromotedProduct, PremiumSettings,CommissionLevel
from products.serializers import ProductVariantSerializer
from products.models import ProductVariant
from orders.models import Order
from django.core.validators import RegexValidator
from products.serializers import ProductVariantSerializer
from urllib.parse import quote
from django.utils import timezone
from django.db import transaction
from django.utils.text import slugify

class PromotedProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    variant_name = serializers.CharField(source='product_variant.variant_name', read_only=True)
    product_slug = serializers.CharField(source='product_variant.product.slug', read_only=True)
    final_price = serializers.DecimalField(source='product_variant.final_price', max_digits=10, decimal_places=2, read_only=True)
    base_price = serializers.DecimalField(source='product_variant.base_price', max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(source='product_variant.stock', read_only=True)
    image = serializers.SerializerMethodField()
    referral_link = serializers.SerializerMethodField()

    class Meta:
        model = PromotedProduct
        fields = [
            'id',
            'product_variant',
            'product_name',
            'variant_name',
            'product_slug',
            'final_price',
            'base_price',
            'stock',
            'image',
            'click_count',
            'referral_link',
            'is_active',
            'created_at',
        ]
    
    def get_image(self, obj):
        """
        Get the first available variant image (from ProductVariantImage).
        If not found, fall back to product.image_url or None.
        """
        variant = obj.product_variant

        # 1️⃣ Prefer variant images
        variant_image = variant.images.first()
        if variant_image and (variant_image.image_url or (variant_image.image and variant_image.image.url)):
            return variant_image.image_url or variant_image.image.url

        # 2️⃣ Fallback to product image
        product = variant.product
        if product.image_url:
            return product.image_url
        elif product.image:
            request = self.context.get('request')
            return request.build_absolute_uri(product.image.url) if request else product.image.url

        return None


    def get_referral_link(self, obj):
        variant = obj.product_variant
        product = variant.product

        # ✅ Always use frontend domain
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

        # ✅ URL-encode the variant name
        variant_slug = slugify(variant.variant_name)

        return f"{base_url}/products/{product.slug}/?variant={variant_slug}&ref={obj.promoter.referral_code}"

    

class PromoterSerializer(serializers.ModelSerializer):
    parent_promoter = serializers.SerializerMethodField()
    promoted_products=PromotedProductSerializer(many=True,read_only=True)
    promoter_type = serializers.ChoiceField(
        choices=[('unpaid', 'Unpaid'), ('paid', 'Paid')],
        required=True
    )

    phone_number = serializers.CharField(source="user.phone_number", required=False)
    
    bank_account_number = serializers.CharField(
        validators=[RegexValidator(regex=r'^\d{9,18}$', message="Bank account number must be 9–18 digits")]
    )
    ifsc_code = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Z]{4}0[A-Z0-9]{6}$', message='Enter a valid IFSC code')]
    )
    bank_name = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Za-z ]+$', message="Bank name should contain only letters and spaces.")]
    )
    account_holder_name = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Za-z .]+$', message="Account holder name should contain only letters, spaces, and dots.")]
    )
    profile_image=serializers.SerializerMethodField()
    referral_link=serializers.SerializerMethodField()

    class Meta:
        model = Promoter
        fields = '__all__'
        read_only_fields = [
            'user', 'referral_code', 'total_sales_count', 'total_commission_earned',
            'wallet_balance', 'is_eligible_for_withdrawal', 'premium_activated_at','referral_link'
        ]
    def get_profile_image(self,obj):
        user=obj.user
        if user.auth_provider == 'google' and user.social_auth_pro_pic:
            return user.social_auth_pro_pic
        elif user.custom_user_profile:
            return user.custom_user_profile
        return 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    
    def update(self, instance, validated_data):
        # Update phone number on the User model
        user_data = validated_data.pop('user', None)
        if user_data:
            phone = getattr(user_data,'phone_number',None)
            if phone:
                validated_data['phone_number'] = phone # save Promoter's phone
                instance.user.phone_number = phone
                instance.user.save(update_fields=['phone_number'])
        # Continue with the rest of the update
        return super().update(instance, validated_data)
    
    def create(self, validated_data):
        # Pop 'user' if it exists in validated_data to avoid duplicate passing
        user = validated_data.pop('user', None) or self.context['request'].user

        # Assign phone if available
        phone = getattr(user, 'phone_number', None)
        if phone:
            validated_data['phone_number'] = phone

        # Create promoter
        promoter = Promoter.objects.create(user=user, **validated_data)
        return promoter


    def validate_phone_number(self, value):
        qs = Promoter.objects.exclude(pk=getattr(self.instance, "pk", None))
        if qs.filter(phone_number=value).exists():
            raise serializers.ValidationError("A promoter with this phone number already exists.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        instance = getattr(self, 'instance', None)

        # Prevent duplicate promoter registration
        if Promoter.objects.filter(user=user).exists() and not getattr(instance, 'id', None):
            raise serializers.ValidationError({'non_field_errors': 'You are already registered as a promoter'})

        # Ensure bank account number is unique across promoters
        bank_account = attrs.get('bank_account_number', getattr(instance, 'bank_account_number', None))

        qs = Promoter.objects.exclude(pk=getattr(instance, 'pk', None))
        if bank_account and qs.filter(bank_account_number=bank_account).exists():
            raise serializers.ValidationError({'bank_account_number': 'This bank account is already registered for another promoter.'})

        return attrs


    def get_referral_link(self, obj):
        if hasattr(obj, 'referral_code'):
            base_url = getattr(settings, 'FRONTEND_URL', None)
            if base_url:
                return f"{base_url}/become-a-promoter/?ref={obj.referral_code}"
            else:
                return f"/become-a-promoter/?ref={obj.referral_code}"
        return None


    def get_parent_promoter(self, obj):
        # Ensure obj is a single instance
        if hasattr(obj, "referred_by") and obj.referred_by:
            return {
                "id": obj.referred_by.id,
                "email": obj.referred_by.user.email,
                "promoter_type": obj.referred_by.promoter_type
            }
        return None
    
    
class PromotedProductLightSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    variant_name = serializers.CharField(source='product_variant.variant_name', read_only=True)
    final_price = serializers.DecimalField(source='product_variant.final_price', max_digits=10, decimal_places=2, read_only=True)
    image = serializers.SerializerMethodField()
    referral_link = serializers.SerializerMethodField()

    class Meta:
        model = PromotedProduct
        fields = [
            'id',
            'product_name',
            'variant_name',
            'final_price',
            'image',
            'referral_link',
            'is_active',
        ]
    def get_image(self, obj):
        """
        Get the first available variant image (from ProductVariantImage).
        If not found, fall back to product.image_url or None.
        """
        variant = obj.product_variant

        # 1️⃣ Prefer variant images
        variant_image = variant.images.first()
        if variant_image and (variant_image.image_url or (variant_image.image and variant_image.image.url)):
            return variant_image.image_url or variant_image.image.url

        # 2️⃣ Fallback to product image
        product = variant.product
        if product.image_url:
            return product.image_url
        elif product.image:
            request = self.context.get('request')
            return request.build_absolute_uri(product.image.url) if request else product.image.url

        return None


    def get_referral_link(self, obj):
        variant = obj.product_variant
        product = variant.product

        # ✅ Always use frontend domain
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

        # ✅ Match your frontend route
        return f"{base_url}/products/{product.slug}/?variant={variant.variant_name}&ref={obj.promoter.referral_code}"


class PromoterLightSerializer(serializers.ModelSerializer):
    promoted_products = PromotedProductLightSerializer(many=True, read_only=True)
    parent_promoter = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    bank_account_number = serializers.CharField(
        validators=[RegexValidator(regex=r'^\d{9,18}$', message="Bank account number must be 9–18 digits")]
    )
    ifsc_code = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Z]{4}0[A-Z0-9]{6}$', message='Enter a valid IFSC code')]
    )
    bank_name = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Za-z ]+$', message="Bank name should contain only letters and spaces.")]
    )
    account_holder_name = serializers.CharField(
        validators=[RegexValidator(regex=r'^[A-Za-z .]+$', message="Account holder name should contain only letters, spaces, and dots.")]
    )
    class Meta:
        model = Promoter
        fields = [
            'promoter_type',
            'phone_number',
            'bank_account_number',
            'ifsc_code',
            'bank_name',
            'account_holder_name',
            'referral_code',
            'premium_activated_at',
            'total_sales_count',
            'total_commission_earned',
            'wallet_balance',
            'is_eligible_for_withdrawal',
            'promoted_products',
            'parent_promoter'
        ]

    def get_parent_promoter(self, obj):
        if obj.referred_by:
            return {
                "id": obj.referred_by.id,
                "email": obj.referred_by.user.email,
                "promoter_type": obj.referred_by.promoter_type
            }
        return None



class PromoterCommissionSerializer(serializers.ModelSerializer):
    promoter = PromoterSerializer(read_only=True)
    promoter_id = serializers.PrimaryKeyRelatedField(queryset=Promoter.objects.all(), write_only=True)

    order = serializers.SerializerMethodField()
    order_id = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all(), write_only=True)

    product_variant = ProductVariantSerializer(read_only=True)
    product_variant_id = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all(), write_only=True)

    class Meta:
        model = PromoterCommission
        fields = [
            'id', 'promoter', 'promoter_id', 
            'order', 'order_id', 
            'product_variant', 'product_variant_id', 
            'amount'
        ]

    def get_order(self, obj):
        from orders.serializers import OrderSerializer
        return OrderSerializer(obj.order).data


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    promoter = PromoterSerializer(read_only=True)
    
    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'promoter','amount', 'status', 
            'requested_at', 'reviewed_at', 'admin_note'
        ]
        read_only_fields = ['status', 'requested_at', 'reviewed_at', 'admin_note']


class WithdrawalRequestAdminSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'], required=True)
    admin_note = serializers.CharField(required=False, allow_blank=True)
    promoter = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'promoter', 'amount', 'requested_at', 'reviewed_at',
            'status', 'admin_note'
        ]
        read_only_fields = ['id', 'promoter', 'amount', 'requested_at', 'reviewed_at']

    # -----------------------------
    # PROMOTER INFO
    # -----------------------------
    def get_promoter(self, obj):
        promoter = obj.promoter
        return {
            "id": promoter.id,
            "email": promoter.user.email,
            "full_name": promoter.user.get_full_name()
        }

    # -----------------------------
    # VALIDATION BEFORE UPDATE
    # -----------------------------
    def validate(self, attrs):
        instance = self.instance
        status = attrs.get("status")

        # Only pending requests can be modified
        if instance.status != "pending":
            raise serializers.ValidationError(
                {"status": "Only pending requests can be approved or rejected."}
            )

        promoter = instance.promoter

        # Extra validation if approving
        if status == "approved":
            if promoter.promoter_type != "paid":
                raise serializers.ValidationError(
                    {"detail": "Only paid promoters can withdraw."}
                )
            if not promoter.is_eligible_for_withdrawal:
                raise serializers.ValidationError(
                    {"detail": "Promoter is not eligible for withdrawal."}
                )
            if instance.amount > promoter.wallet_balance:
                raise serializers.ValidationError(
                    {"detail": "Insufficient wallet balance."}
                )

        return attrs

    # -----------------------------
    # SAFE UPDATE WITH ATOMIC TRANSACTION
    # -----------------------------
    def update(self, instance, validated_data):
        status = validated_data.get("status")
        note = validated_data.get("admin_note", "")

        promoter = instance.promoter

        with transaction.atomic():
            if status == "approved":
                # Concurrency-safe wallet deduction
                promoter.refresh_from_db()
                if promoter.wallet_balance < instance.amount:
                    raise serializers.ValidationError(
                        {"detail": "Wallet balance changed. Try again."}
                    )

                promoter.deduct_withdrawal(instance.amount)

                instance.status = "approved"
                instance.reviewed_at = timezone.now()
                instance.save(update_fields=['status', 'reviewed_at'])

            elif status == "rejected":
                instance.status = "rejected"
                instance.admin_note = note
                instance.reviewed_at = timezone.now()
                instance.save(update_fields=['status', 'reviewed_at', 'admin_note'])

        return instance

    
class PremiumSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumSettings
        fields = [
            "amount",
            "offer_amount",
            "offer_active",
            "offer_start",
            "offer_end",
        ]
    def validate(self, attrs):
        amount = attrs.get("amount")
        offer_amount = attrs.get("offer_amount")
        offer_active = attrs.get("offer_active")
        offer_start = attrs.get("offer_start")
        offer_end = attrs.get("offer_end")

        # rule 1: offer_amount must be less than main amount
        if offer_active and offer_amount:
            if offer_amount >= amount:
                raise serializers.ValidationError(
                    "Offer amount must be LESS than normal amount."
                )

        # rule 2: both start and end dates required
        if offer_active:
            if not offer_start or not offer_end:
                raise serializers.ValidationError(
                    "Offer start and end time are required when offer is active."
                )
            if offer_start >= offer_end:
                raise serializers.ValidationError(
                    "Offer end time must be AFTER offer start time."
                )

        return attrs
    
class CommissionLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model=CommissionLevel
        fields='__all__'
        

class WithdrawalRequestPromoterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WithdrawalRequest
        fields = ['id', 'amount', 'status', 'requested_at']
        read_only_fields = ['id', 'status', 'requested_at']