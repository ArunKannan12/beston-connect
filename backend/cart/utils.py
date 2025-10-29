from rest_framework import serializers

def check_stock(product_variant, quantity):
    """Ensure there is enough stock for a given quantity."""
    if product_variant.stock is None or product_variant.stock < quantity:
        raise serializers.ValidationError('Not enough stock available')
