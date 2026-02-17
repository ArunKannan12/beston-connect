# users/permissions.py

from rest_framework.permissions import BasePermission, SAFE_METHODS

# ---------------- Switchable roles (use active_role) ---------------- #
class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'active_role', '') == 'customer'

class IsPromoter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'active_role', '') == 'promoter'

# ---------------- Fixed roles (use role) ---------------- #
class IsInvestor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') == 'investor'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (getattr(request.user, 'role', '') == 'admin' or request.user.is_staff)

# ---------------- Mixed roles ---------------- #
class IsAdminOrCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            getattr(request.user, 'role', '') == 'admin' or
            getattr(request.user, 'active_role', '') == 'customer'
        )

class IsAdminOrPromoter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            getattr(request.user, 'role', '') == 'admin' or
            getattr(request.user, 'active_role', '') == 'promoter'
        )

class IsInvestorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            getattr(request.user, 'role', '') in ['admin', 'investor']
        )

# ---------------- Read-only ---------------- #
class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsAdmin().has_permission(request, view)


class IsInvestorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            getattr(request.user, 'role', '') in ['admin', 'manager']
        )