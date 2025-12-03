from django.conf import settings
from rest_framework import serializers
from .models import Promoter, PromoterCommission, WithdrawalRequest, PromotedProduct, PremiumSettings
from products.serializers import ProductVariantSerializer
from products.models import ProductVariant
from orders.models import Order
from django.core.validators import RegexValidator
from products.serializers import ProductVariantSerializer
from urllib.parse import quote

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
        variant_encoded = quote(variant.variant_name)

        return f"{base_url}/products/{product.slug}/?variant={variant_encoded}&ref={obj.promoter.referral_code}"

    

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
        user=self.context['request'].user
        if Promoter.objects.filter(user=user).exists() and not getattr(self.instance,'id',None):
            raise serializers.ValidationError({'non_field_errors':'you are already registered as a promoter'})
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
    status = serializers.ChoiceField(
        choices=['approved', 'rejected'], required=True
    )
    admin_note=serializers.CharField(required=False,allow_blank=True)
    class Meta:
        model=WithdrawalRequest
        fields=['status','admin_note']

    def validate_status(self,value):
        instance=getattr(self,'instance',None)
        if instance and instance.status != 'pending':
            raise serializers.ValidationError("Only pending request can be approved or rejected")
        return value
    
    def update(self, instance, validated_data):
        status = validated_data.get('status')
        note = validated_data.get('admin_note', '')

        if status == 'approved':
            instance.approve()
        elif status == 'rejected':
            instance.reject(note)

        # Save other changes if any
        return super().update(instance, validated_data)
    
class PremiumSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumSettings
        fields = ['id', 'amount', 'updated_at']
class WithdrawalRequestPromoterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WithdrawalRequest
        fields = ['id', 'amount', 'status', 'requested_at']
        read_only_fields = ['id', 'status', 'requested_at']