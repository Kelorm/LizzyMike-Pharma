"""Active branch resolution from X-Branch-Id header."""
from __future__ import annotations

from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Branch


BRANCH_HEADER = 'HTTP_X_BRANCH_ID'


def user_accessible_branches(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return Branch.objects.none()
    qs = Branch.objects.filter(is_active=True).select_related('default_tax', 'default_discount')
    if getattr(user, 'role', None) == 'admin':
        return qs.order_by('name')
    return qs.filter(users=user).order_by('name')


def _pick_default_branch(accessible):
    """Prefer HQ / oldest branch over alphabetical first."""
    hq = accessible.filter(code__iexact='HQ').first()
    if hq:
        return hq
    return accessible.order_by('created_at', 'name').first()


def resolve_branch(request, *, required: bool = True) -> Branch | None:
    """
    Resolve the active branch for this request.
    Admins may use any active branch; staff/pharmacists only assigned ones.
    """
    user = getattr(request, 'user', None)
    accessible = user_accessible_branches(user)
    raw = request.META.get(BRANCH_HEADER) or request.headers.get('X-Branch-Id')
    if raw:
        branch = accessible.filter(pk=raw).first()
        if not branch:
            if Branch.objects.filter(pk=raw).exists():
                raise PermissionDenied('You do not have access to this branch.')
            raise ValidationError({'detail': 'Unknown branch id. Switch branch and try again.'})
        return branch

    branch = _pick_default_branch(accessible)
    if branch:
        return branch
    if required and getattr(user, 'role', None) == 'admin':
        return Branch.get_default()
    if required:
        raise ValidationError({'detail': 'No branch assigned. Ask an admin to assign you to a branch.'})
    return None


class BranchScopedMixin:
    """Filter queryset by active branch when the model has a branch FK."""

    branch_field = 'branch'

    def get_active_branch(self):
        return resolve_branch(self.request, required=True)

    def get_queryset(self):
        qs = super().get_queryset()
        branch = self.get_active_branch()
        if branch is None:
            return qs.none()
        return qs.filter(**{self.branch_field: branch})
