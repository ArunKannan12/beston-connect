
from django.contrib import admin
from django.urls import path,include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('nested_admin/', include('nested_admin.urls')),
    path('admin/', admin.site.urls),
    path('api/',include('accounts.urls')),
    path('api/',include('products.urls')),
    path('api/',include('cart.urls')),
    path('api/',include('orders.urls')),
    path('api/',include('promoter.urls'),),  
    path("api/",include('investor.urls')),
    path("api/",include('admin_dashboard.urls')),
    
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)