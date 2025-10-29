from django.urls import path, include
from .views import (
    ResendActivationEmailView,
    CustomPasswordResetConfirmView,
    CustomPasswordResetView,
    GoogleAuthView,
    FacebookLoginView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    SetCSRFCookieView,
    ProfileView,
    SwitchActiveRoleAPIView,
    custom_jwt_view,
    create_temp_superuser
   
)
from django.contrib.auth import views as auth_views

urlpatterns = [
    # Djoser default auth routes
    path('auth/', include('djoser.urls')),

    # Custom Password Reset views
    path('auth/password_reset/', CustomPasswordResetView.as_view(), name='password_reset'),
    path('auth/password_reset_confirm/', CustomPasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Custom JWT-based login, refresh, logout (cookie-based)
    path('auth/jwt/create/', CookieTokenObtainPairView.as_view(), name='jwt-create'),
    path('auth/jwt/refresh/', CookieTokenRefreshView.as_view(), name='jwt-refresh'),
    path('auth/jwt/logout/', LogoutView.as_view(), name='jwt-logout'),
    path("auth/switch-role/", SwitchActiveRoleAPIView.as_view(), name="switch-role"),
    # Social login
    path('auth/social/google/', GoogleAuthView.as_view(), name='google-login'),
    path('auth/social/facebook/', FacebookLoginView.as_view(), name='facebook-login'),

    # Resend activation email
    path('auth/resend-activation/', ResendActivationEmailView.as_view(), name='resend-activation'),
    path("auth/profile/", ProfileView.as_view(), name="profile"),

    # Set CSRF token
    path('auth/csrf/', SetCSRFCookieView.as_view(), name='set-csrf'),
    path('sample',custom_jwt_view),
    path('create-temp-superuser/', create_temp_superuser),
    path('admin/password_reset/', auth_views.PasswordResetView.as_view(), name='password_reset'),
    path('admin/password_reset/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
]