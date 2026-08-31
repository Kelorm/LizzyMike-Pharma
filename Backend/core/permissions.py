"""
Role-based access control permission classes for LizzyMike Pharma.

Role hierarchy (highest → lowest):
    admin       – full system access
    pharmacist  – clinical + sales actions
    staff       – read-only / limited write
"""

from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """Grants access only to users with ``role == 'admin'``."""

    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            bool(request.user)
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsPharmacistOrAdmin(permissions.BasePermission):
    """Grants access to *pharmacist* or *admin* role users."""

    message = "Only pharmacists or administrators can perform this action."

    def has_permission(self, request, view):
        return (
            bool(request.user)
            and request.user.is_authenticated
            and request.user.role in ("pharmacist", "admin")
        )


class IsStaffOrAbove(permissions.BasePermission):
    """Grants access to staff, pharmacist, or admin (POS create and similar)."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        return (
            bool(request.user)
            and request.user.is_authenticated
            and request.user.role in ("staff", "pharmacist", "admin")
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Safe (GET / HEAD / OPTIONS) requests are allowed for all authenticated
    users.  Write requests (POST / PUT / PATCH / DELETE) are restricted to
    admins.  Suitable for reference data such as medications and customers.
    """

    message = "Write access is restricted to administrators."

    def has_permission(self, request, view):
        if not (bool(request.user) and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role == "admin"


class IsSelfOrAdmin(permissions.BasePermission):
    """
    Object-level permission: a user can access only their own record unless
    they hold the *admin* role.
    """

    message = "You can only access your own profile."

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return obj == request.user
