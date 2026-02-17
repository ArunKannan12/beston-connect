from django.conf import settings
from rest_framework import serializers
from .models import (Promoter, 
                    PromoterCommission, 
                    WithdrawalRequest, 
                    PromotedProduct, 
                    PremiumSettings,
                    CommissionLevel,
                    Subscription,
                    PromoterReferral,
                    PromoterBankAccount
                    )
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
    
    
    profile_image=serializers.SerializerMethodField()
    referral_link=serializers.SerializerMethodField()

    class Meta:
        model = Promoter
        fields = '__all__'
        read_only_fields = [
            'user', 'referral_code', 'total_commission_earned',
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
        referral = getattr(obj, 'referral_entry', None)
        if referral:
            referrer = referral.referrer_promoter
            return {
                "id": referrer.id,
                "email": referrer.user.email,
                "promoter_type": referrer.promoter_type
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

class PromoterBankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoterBankAccount
        fields = [
            "id",
            "promoter",
            "account_holder_name",
            "account_number",
            "ifsc_code",
            "bank_name",
            "is_verified",
            "added_at",
        ]
        read_only_fields = ["promoter", "is_verified", "added_at"]

class PromoterLightSerializer(serializers.ModelSerializer):
    promoted_products = PromotedProductLightSerializer(many=True, read_only=True)
    parent_promoter = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = Promoter
        fields = [
            'id',
            'promoter_type',
            'phone_number',
            'referral_code',
            'premium_activated_at',
            'total_commission_earned',
            'wallet_balance',
            'is_eligible_for_withdrawal',
            'promoted_products',
            'parent_promoter',
            'user',
            'approved_at'
        ]

    def get_user(self, obj):
        return {
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email
        }

    def get_parent_promoter(self, obj):
        referral = getattr(obj, 'referral_entry', None)
        if referral:
            p = referral.referrer_promoter
            return {
                "id": p.id,
                "email": p.user.email,
                "promoter_type": p.promoter_type
            }
        return None


class PromoterCommissionSerializer(serializers.ModelSerializer):
    promoter = PromoterSerializer(read_only=True)
    promoter_id = serializers.PrimaryKeyRelatedField(
        queryset=Promoter.objects.all(),
        write_only=True,
        source='promoter'
    )

    order = serializers.SerializerMethodField()
    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(),
        write_only=True,
        source='order',
        required=False,
        allow_null=True
    )

    product_variant = ProductVariantSerializer(read_only=True)
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(),
        write_only=True,
        source='product_variant',
        required=False,
        allow_null=True
    )

    class Meta:
        model = PromoterCommission
        fields = [
            'id',
            'promoter',
            'promoter_id',
            'order',
            'order_id',
            'product_variant',
            'product_variant_id',
            'amount',
            'earning_type',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    def get_order(self, obj):
        if not obj.order:
            return None
        from orders.serializers import OrderSerializer
        return OrderSerializer(obj.order, context=self.context).data



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
            if not promoter.bank_account_number or not promoter.ifsc_code or not promoter.bank_name or not promoter.account_holder_name:
                raise serializers.ValidationError(
                    {"detail": "Bank details must be provided before withdrawal approval."}
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

class MinimalPromoterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promoter
        fields = ["promoter_type", "is_approved"]

class PremiumSettingSerializer(serializers.ModelSerializer):
    current_monthly = serializers.SerializerMethodField(read_only=True)
    current_annual = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PremiumSettings
        fields = [
            "monthly_amount",
            "annual_amount",
            "offer_active",
            "monthly_offer",
            "annual_offer",
            "offer_start",
            "offer_end",
            "current_monthly",
            "current_annual",
        ]

    # SerializerMethodFields
    def get_current_monthly(self, obj):
        return obj.current_amount(plan_type="monthly")

    def get_current_annual(self, obj):
        return obj.current_amount(plan_type="annual")

    # Field-level validation (optional but DRF-friendly)
    def validate_monthly_offer(self, value):
        monthly_amount = (
            self.initial_data.get("monthly_amount")
            or getattr(self.instance, "monthly_amount", None)
        )

        if value is not None and monthly_amount is not None:
            if value >= monthly_amount:
                raise serializers.ValidationError(
                    "Monthly offer must be less than normal monthly amount."
                )
        return value


    def validate_annual_offer(self, value):
        annual_amount = (
            self.initial_data.get("annual_amount")
            or getattr(self.instance, "annual_amount", None)
        )

        if value is not None and annual_amount is not None:
            if value >= annual_amount:
                raise serializers.ValidationError(
                    "Annual offer must be less than normal annual amount."
                )
        return value


    # Object-level validation
    def validate(self, attrs):
        offer_active = attrs.get(
            "offer_active",
            getattr(self.instance, "offer_active", False)
        )

        if offer_active:
            offer_start = attrs.get(
                "offer_start",
                getattr(self.instance, "offer_start", None)
            )
            offer_end = attrs.get(
                "offer_end",
                getattr(self.instance, "offer_end", None)
            )

            if not offer_start or not offer_end:
                raise serializers.ValidationError({
                    "offer_start": "Offer start and end times are required when offer is active."
                })

            if offer_start >= offer_end:
                raise serializers.ValidationError({
                    "offer_end": "Offer end time must be after offer start time."
                })

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

class SubscriptionSerializer(serializers.ModelSerializer):
    remaining_days = serializers.SerializerMethodField(read_only=True)
    is_active = serializers.SerializerMethodField(read_only=True)
    premium_settings_name = serializers.CharField(source='premium_settings.name', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'plan_type',
            'status',
            'amount',
            'plan_price',
            'premium_settings_name',
            'razorpay_payment_id',
            'razorpay_order_id',
            'started_at',
            'expires_at',
            'remaining_days',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_remaining_days(self, obj):
        return obj.remaining_days

    def get_is_active(self, obj):
        return obj.is_active


