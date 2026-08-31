"""Branch CRUD and pharmacy profile (per active branch)."""
import logging

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..audit_log import log_audit
from ..branching import resolve_branch, user_accessible_branches
from ..models import Branch
from ..permissions import IsAdminRole
from ..serializers import BranchSerializer, PharmacyProfileSerializer

logger = logging.getLogger(__name__)


class BranchViewSet(viewsets.ModelViewSet):
    """
    Branch / pharmacy locations.
    - list/retrieve: any authenticated user (scoped to accessible branches)
    - create/update/delete: admin only
    """
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        return user_accessible_branches(self.request.user).select_related(
            'default_tax', 'default_discount'
        )

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        branch = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='branch',
            entity_id=str(branch.id),
            details={'code': branch.code, 'name': branch.name},
            request=self.request,
        )

    def perform_update(self, serializer):
        branch = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='branch',
            entity_id=str(branch.id),
            details={'code': branch.code, 'name': branch.name},
            request=self.request,
        )


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def pharmacy_profile_view(request):
    """
    GET/PUT pharmacy details for the active branch (X-Branch-Id).
    PUT/PATCH: admin only.
    """
    branch = resolve_branch(request, required=True)

    if request.method == 'GET':
        return Response(PharmacyProfileSerializer(branch).data)

    if not IsAdminRole().has_permission(request, None):
        return Response(
            {'detail': 'Only administrators can update pharmacy details.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = PharmacyProfileSerializer(
        branch, data=request.data, partial=(request.method == 'PATCH')
    )
    serializer.is_valid(raise_exception=True)
    branch = serializer.save()
    logger.info("Branch pharmacy profile updated by %s (%s)", request.user.username, branch.code)
    log_audit(
        user=request.user,
        action='update',
        entity='pharmacy_profile',
        entity_id=str(branch.id),
        details={'name': branch.name, 'fields': list(request.data.keys()), 'branch': branch.code},
        request=request,
    )
    return Response(PharmacyProfileSerializer(branch).data)
