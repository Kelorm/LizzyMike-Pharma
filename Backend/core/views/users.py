"""Admin user list, edit, activate/deactivate, and delete."""
import logging

from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import User
from ..permissions import IsAdminRole
from ..serializers import UserActiveSerializer, UserAdminUpdateSerializer, UserSerializer
from ..audit_log import log_audit

logger = logging.getLogger(__name__)


class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Admin-only user directory.

    - list / retrieve: all users
    - partial_update: ``is_active`` only when body is just that field
    - update / partial with profile fields: edit staff/pharmacist (or limited admin fields)
    - destroy: delete staff/pharmacist only (not self, not admins)
    """

    queryset = User.objects.all().prefetch_related('branches').order_by('username')
    permission_classes = [IsAuthenticated, IsAdminRole]
    http_method_names = ['get', 'patch', 'put', 'delete', 'head', 'options']
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ('partial_update', 'update'):
            data = getattr(self.request, 'data', {}) or {}
            keys = set(data.keys())
            if keys and keys <= {'is_active'}:
                return UserActiveSerializer
            return UserAdminUpdateSerializer
        return UserSerializer

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk and request.data.get('is_active') is False:
            raise ValidationError({'is_active': 'You cannot deactivate your own account.'})

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info(
            "Admin '%s' updated user '%s' fields=%s",
            request.user.username,
            user.username,
            list(request.data.keys()),
        )
        log_audit(
            user=request.user,
            action='update',
            entity='user',
            entity_id=str(user.id),
            details={
                'username': user.username,
                'fields': list(request.data.keys()),
                'is_active': user.is_active,
                'role': user.role,
            },
            request=request,
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = False
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            raise PermissionDenied('You cannot delete your own account.')
        if user.role == 'admin':
            raise PermissionDenied('Admin accounts cannot be deleted from this interface.')
        username = user.username
        user_id = str(user.id)
        user.delete()
        logger.info("Admin '%s' deleted user '%s'", request.user.username, username)
        log_audit(
            user=request.user,
            action='delete',
            entity='user',
            entity_id=user_id,
            details={'username': username},
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
