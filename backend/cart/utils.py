from rest_framework import serializers

def check_stock(product_variant, quantity):
    if product_variant.stock is None or product_variant.stock < quantity:
        raise serializers.ValidationError(
            f'Not enough stock available. Requested: {quantity}, Available: {product_variant.stock or 0}'
        )
