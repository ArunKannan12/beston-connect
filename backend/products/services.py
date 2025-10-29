import requests
from decimal import Decimal
from django.core.files.base import ContentFile
from django.utils.text import slugify
from django.core.files import File

from .models import Category, Product, ProductVariant, ProductImage


def fetch_and_save_products(api_url):
    response = requests.get(api_url)
    response.raise_for_status()
    data = response.json()

    products_data = data.get("products", [])

    for item in products_data:
        # Category
        category_name = item.get("category", "Uncategorized")
        category_slug = slugify(category_name)
        category, _ = Category.objects.get_or_create(
            name=category_name,
            defaults={"slug": category_slug}
        )

        # Product
        slug = slugify(item["title"])
        product, _ = Product.objects.get_or_create(
            slug=slug,
            defaults={
                "category": category,
                "name": item["title"],
                "description": item["description"],
                "price": Decimal(item["price"]),
                "is_available": item.get("availabilityStatus", "In Stock").lower() == "in stock",
            }
        )

        # Product Variant
        ProductVariant.objects.get_or_create(
            sku=item.get("sku", f"{slug}-default"),
            defaults={
                "product": product,
                "variant_name": item.get("brand", "Default"),
                "additional_price": Decimal("0.00"),
                "stock": item.get("stock", 0),
                "is_active": True,
            }
        )

        # Images
        for idx, image_url in enumerate(item.get("images", [])):
            image_name = image_url.split("/")[-1]
            try:
                img_response = requests.get(image_url, headers={"User-Agent": "Mozilla/5.0"})
                img_response.raise_for_status()
                image_file = ContentFile(img_response.content)

                ProductImage.objects.create(
                    product=product,
                    image=File(image_file, name=image_name),
                    alt_text=f"{product.name} image {idx + 1}"
                )
            except Exception as e:
                print(f"Image fetch failed for {image_url}: {e}")
