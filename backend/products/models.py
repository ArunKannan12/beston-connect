# models.py
from django.db import models
from django.utils.text import slugify
from django.utils.crypto import get_random_string
from rest_framework.exceptions import ValidationError
import cloudinary.uploader

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(upload_to='category_images/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    slug = models.SlugField(unique=True)

    def save(self, *args, **kwargs):
        # Generate slug if not present
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{get_random_string(4)}"
            self.slug = slug

        super().save(*args, **kwargs)

        # Upload to Cloudinary if needed
        if self.image and (not self.image_url or 'res.cloudinary.com' not in self.image_url):
            try:
                upload_result = cloudinary.uploader.upload(
                    self.image.file,  # use .file not .path
                    folder='ecommerce/category_images'
                )
                self.image_url = upload_result.get('secure_url')
                self.image.delete(save=False)
                super().save(update_fields=['image_url'])
            except Exception as e:
                print(f"Cloudinary upload failed: {e}")

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    is_available = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='product_images/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{get_random_string(4)}"
            self.slug = slug

        super().save(*args, **kwargs)

        # Upload to Cloudinary if needed
        if self.image and (not self.image_url or 'res.cloudinary.com' not in self.image_url):
            try:
                upload_result = cloudinary.uploader.upload(
                    self.image.file,  # ✅ use .file not .path
                    folder='ecommerce/product_main'
                )
                self.image_url = upload_result['secure_url']
                self.image.delete(save=False)
                super().save(update_fields=['image_url'])
            except Exception as e:
                print(f"Cloudinary upload failed: {e}")

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    variant_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sku = models.CharField(max_length=50, unique=True)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    allow_return = models.BooleanField(default=False)
    return_days = models.PositiveIntegerField(null=True, blank=True)
    allow_replacement = models.BooleanField(default=False)
    replacement_days = models.PositiveIntegerField(null=True, blank=True)
    featured = models.BooleanField(default=False)
    weight = models.FloatField(
        default=0.5,
        help_text="Enter weight in kilograms (e.g., 0.2 for 200g, 2 for 2kg)"
    )
    promoter_commission_rate = models.FloatField(
        default=0.0,
        help_text="Fixed commission % for promoters on this product"
    )
    def clean(self):
        errors = {}
        if self.base_price is None:
            errors['base_price'] = "Base price must be set."
        if self.offer_price and self.base_price and self.offer_price > self.base_price:
            errors['offer_price'] = "Offer price cannot exceed base price."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def final_price(self):
        return self.offer_price if self.offer_price else self.base_price
    
    def get_weight_in_grams(self):
        """
        Returns weight in grams for API integration (Delhivery expects grams).
        If weight is missing or invalid, defaults to 200g.
        """
        try:
            if self.weight and self.weight > 0:
                return round(self.weight * 1000)
            return 200  # Default minimum weight in grams
        except Exception:
            return 200
        
    def __str__(self):
        return f"{self.product.name} - {self.variant_name}"

class BaseImage(models.Model):
    image = models.ImageField(upload_to='uploads/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    alt_text = models.CharField(max_length=50, blank=True)

    class Meta:
        abstract = True

    @property
    def url(self):
        return self.image_url or (self.image.url if self.image else None)

    def clean(self):
        if not self.image and not self.image_url:
            raise ValidationError("Either upload an image or provide an image URL.")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image and (not self.image_url or 'res.cloudinary.com' not in self.image_url):
            try:
                upload_result = cloudinary.uploader.upload(
                    self.image.file,
                    folder='ecommerce/variant_images'
                )
                self.image_url = upload_result['secure_url']
                self.image.delete(save=False)
                super().save(update_fields=['image_url'])
            except Exception as e:
                print(f"Cloudinary upload failed: {e}")


class ProductVariantImage(BaseImage):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='images')

    def __str__(self):
        return f"Image for {self.variant}"
    
from django.utils.html import format_html
class Banner(models.Model):
    title = models.CharField(max_length=255, blank=True, null=True)
    subtitle = models.CharField(max_length=255, blank=True, null=True)
    image = models.ImageField(upload_to='banners/', blank=True, null=True)  # optional local upload
    image_url = models.URLField(max_length=500, blank=True, null=True)      # Cloudinary URL
    link_url = models.URLField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["order"], condition=models.Q(is_active=True), name="unique_active_order")
        ]

    def __str__(self):
        return self.title or f"Banner {self.id}"

    def clean(self):
        if self.order < 1:
            raise ValidationError({"order": "Order must be greater than or equal to 1"})
        super().clean()

    def save(self, *args, **kwargs):
        # Upload to Cloudinary if a new image is provided and not already uploaded
        if self.image and (not self.image_url or 'res.cloudinary.com' not in self.image_url):
            try:
                upload_result = cloudinary.uploader.upload(
                    self.image.file,
                    folder='ecommerce/banners'
                )
                self.image_url = upload_result.get('secure_url')
                # Remove local file reference (optional: defer deletion if needed)
                self.image.delete(save=False)
            except Exception as e:
                print(f"Cloudinary upload failed: {e}")
        super().save(*args, **kwargs)

    def image_tag(self):
        if self.image_url:
            return format_html('<img src="{}" width="100" />', self.image_url)
        return "-"
    image_tag.short_description = 'Preview'

