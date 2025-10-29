from django.core.management.base import BaseCommand
from products.models import Category, ProductImage, ProductVariantImage
import cloudinary.uploader

class Command(BaseCommand):
    help = "Migrate local images to Cloudinary with organized folders"

    def handle(self, *args, **kwargs):
        print("=== Migrate images command started ===")

        model_folder_map = {
            Category: "ecommerce/categories/",
            ProductImage: "ecommerce/products/",
            ProductVariantImage: "ecommerce/variants/",
        }

        def is_cloudinary_url(url):
            """Check if the URL is already a Cloudinary URL"""
            if not url:
                return False
            return "res.cloudinary.com" in url

        for model, folder in model_folder_map.items():
            objs = model.objects.all()
            print(f"Processing {objs.count()} objects from {model.__name__}...")
            migrated_count = 0
            skipped_count = 0

            for obj in objs:
                # Only migrate if there is a local image and the URL is not on Cloudinary
                if obj.image and not is_cloudinary_url(obj.image_url):
                    print(f"[FOUND] {obj} -> {obj.image.path}")
                    self.stdout.write(self.style.WARNING(
                        f"Uploading {obj.image.path} to Cloudinary folder '{folder}'..."
                    ))

                    try:
                        upload_result = cloudinary.uploader.upload(
                            obj.image.path,
                            folder=folder
                        )
                        obj.image_url = upload_result["secure_url"]
                        obj.image.delete(save=False)
                        obj.save()
                        migrated_count += 1
                        self.stdout.write(self.style.SUCCESS(f"[UPLOADED] {obj.image_url}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"[FAILED] {obj}: {e}"))
                else:
                    skipped_count += 1
                    print(f"[SKIPPED] {obj} -> already migrated or no local image")

            print(f"Finished {model.__name__}: Migrated {migrated_count}, Skipped {skipped_count}\n")

        print("=== Migrate images command completed ===")
