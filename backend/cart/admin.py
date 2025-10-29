from django.contrib import admin
from .models import Cart, CartItem

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email')
    ordering = ('-created_at',)

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product_variant', 'quantity', 'added_at')
    list_filter = ('added_at', 'product_variant')
    search_fields = ('cart__user__username', 'product_variant__product__title')
    autocomplete_fields = ['cart', 'product_variant']
    ordering = ('-added_at',)
