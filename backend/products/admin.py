import nested_admin
from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Category, Product, ProductVariant, ProductVariantImage,Banner
from .forms import ProductVariantForm

# --------------------- CATEGORY ---------------------
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


# --------------------- VARIANT IMAGES ---------------------
class ProductVariantImageInline(nested_admin.NestedTabularInline):
    model = ProductVariantImage
    extra = 1
    fields = ('image', 'image_url', 'alt_text')


# --------------------- VARIANTS ---------------------
class ProductVariantInline(nested_admin.NestedTabularInline):
    model = ProductVariant
    form=ProductVariantForm
    extra = 1
    inlines = [ProductVariantImageInline]  # nested variant images
    show_change_link = True
    fields = (
        'variant_name', 'sku', 'base_price', 'offer_price','weight',
        'stock','featured', 'is_active', 'promoter_commission_rate',
        'allow_return', 'return_days',           
        'allow_replacement', 'replacement_days'  
    )
    readonly_fields = ('final_price_display',)

    def final_price_display(self, obj):
        return obj.final_price
    final_price_display.short_description = "Final Price"


# --------------------- PRODUCTS ---------------------
@admin.register(Product)
class ProductAdmin(nested_admin.NestedModelAdmin):
    list_display = ('id','name', 'category', 'is_available', 'featured', 'created_at', 'thumbnail')
    list_filter = ('category', 'is_available', 'featured')
    search_fields = ('name', 'description', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductVariantInline]  # include variant + variant images

    def thumbnail(self, obj):
        """Return the main product image or first variant image"""
        img = obj.image if obj.image else None
        if not img and obj.variants.exists():
            first_variant = obj.variants.first()
            if first_variant.images.exists():
                first_img_obj = first_variant.images.first()
                img = first_img_obj.image if first_img_obj.image else first_img_obj.image_url
        url = img.url if hasattr(img, 'url') else img
        if url:
            return mark_safe(
                f'<a href="{url}" target="_blank">'
                f'<img src="{url}" width="60" height="60" style="object-fit:cover;border-radius:6px;"/>'
                f'</a>'
            )
        return "No Image"

    thumbnail.short_description = "Preview"


# --------------------- VARIANTS ADMIN ---------------------
@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'product', 'variant_name', 'sku', 'base_price', 'offer_price',
        'final_price','featured', 'stock', 'is_active', 'weight',
        'allow_return', 'return_days', 'allow_replacement', 'replacement_days'  # ← added
    )
    list_filter = ('is_active', 'allow_return', 'allow_replacement')  # optional
    search_fields = ('variant_name', 'sku', 'product__name')
    inlines = [ProductVariantImageInline]

    def final_price_display(self, obj):
        return obj.final_price
    final_price_display.short_description = "Final Price"



# --------------------- VARIANT IMAGES ADMIN ---------------------
@admin.register(ProductVariantImage)
class ProductVariantImageAdmin(admin.ModelAdmin):
    list_display = ('variant', 'thumbnail', 'alt_text')
    search_fields = ('variant__variant_name', 'alt_text', 'image_url')

    def thumbnail(self, obj):
        url = obj.image.url if obj.image else obj.image_url
        if url:
            return mark_safe(
                f'<a href="{url}" target="_blank">'
                f'<img src="{url}" width="60" height="60" style="object-fit:cover;border-radius:6px;"/>'
                f'</a>'
            )
        return "No Image"

    thumbnail.short_description = "Preview"

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "subtitle", "order", "is_active", "image_url", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("title", "subtitle", "link_url")
    ordering = ("order",)
    readonly_fields = ("created_at", "updated_at", "image_url")  # image_url is auto-generated

    fieldsets = (
        ("Basic Info", {
            "fields": ("title", "subtitle", "image", "image_url", "link_url", "order", "is_active")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )