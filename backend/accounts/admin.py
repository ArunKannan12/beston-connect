from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, PasswordResetEmailLog, ActivationEmailLog, Role, UserRole


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0
    autocomplete_fields = ['role']
    verbose_name = "Assigned Role"
    verbose_name_plural = "Assigned Roles"
    readonly_fields = ('assigned_at',)  # Cannot edit assigned_at

admin.site.register(UserRole)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)
    ordering = ('name',)


class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser

    list_display = (
        'email', 'first_name', 'last_name', 'phone_number', 'city', 'role',
        'is_staff', 'is_active', 'is_verified', 'auth_provider','active_role',
        'is_permanently_banned', 'blocked_until', 'block_count',
    )
    list_filter = (
        'role', 'is_active', 'is_staff', 'is_superuser', 'is_verified', 'auth_provider'
    )
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    ordering = ('email',)

    readonly_fields = (
        'last_login', 'created_at', 'updated_at',
        'blocked_until', 'block_count', 'is_permanently_banned',
    )

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {
            'fields': (
                'first_name', 'last_name', 'phone_number', 'address',
                'pincode', 'district', 'city', 'state',
                'custom_user_profile', 'social_auth_pro_pic', 'role','active_role'
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser', 'is_verified',
                'groups', 'user_permissions'
            )
        }),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
        ('Security', {
            'fields': (
                'last_activation_email_sent', 'blocked_until', 'block_count',
                'is_permanently_banned', 'last_password_reset_sent',
                'blocked_until_password_reset', 'block_count_password_reset'
            )
        }),
        ('Authentication Provider', {'fields': ('auth_provider',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'first_name', 'last_name', 'password1', 'password2',
                'is_active', 'is_staff', 'is_superuser', 'is_verified', 'role'
            )
        }),
    )

    inlines = [UserRoleInline]  # Show assigned roles inline

    # Optional: allow filtering users by having multiple roles
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('user_roles__role')


@admin.register(ActivationEmailLog)
class ActivationEmailLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'sent_at', 'ip_address', 'user_agent')
    search_fields = ('user__email', 'ip_address')
    list_filter = ('sent_at',)


@admin.register(PasswordResetEmailLog)
class PasswordResetEmailLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'sent_at', 'ip_address', 'user_agent')
    search_fields = ('user__email', 'ip_address')
    list_filter = ('sent_at',)


admin.site.register(CustomUser, CustomUserAdmin)

