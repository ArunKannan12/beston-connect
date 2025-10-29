from django.core.management.base import BaseCommand
from products.services import fetch_and_save_products

class Command(BaseCommand):
    help='fetch and store products from external api'

    def handle(self, *args, **options):
        url='https://dummyjson.com/products'
        fetch_and_save_products(url)
        self.stdout.write(self.style.SUCCESS('product data fetched successfully'))
        