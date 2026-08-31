"""Audit trail and stock movement views — read-only."""
import logging

from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from ..models import AuditTrail, StockMovement
from ..serializers import AuditTrailSerializer, StockMovementSerializer
from ..permissions import IsAdminRole, IsPharmacistOrAdmin, IsStaffOrAbove
from ..branching import resolve_branch

logger = logging.getLogger(__name__)


class AuditTrailPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 200


class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Immutable audit log.  **Admin-only.**
    """
    queryset = AuditTrail.objects.select_related('user').all()
    serializer_class = AuditTrailSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = AuditTrailPagination

    def get_queryset(self):
        qs = AuditTrail.objects.select_related('user').order_by('-timestamp')
        params = self.request.query_params

        if params.get('user_id'):
            qs = qs.filter(user_id=params['user_id'])
        if params.get('action'):
            qs = qs.filter(action=params['action'])
        if params.get('entity'):
            qs = qs.filter(entity=params['entity'])
        if params.get('start_date'):
            qs = qs.filter(timestamp__gte=params['start_date'])
        if params.get('end_date'):
            qs = qs.filter(timestamp__lte=params['end_date'])

        return qs


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Stock movement history (sales, restocks, adjustments, expiries).

    - **Read**: pharmacist or admin
    """
    queryset = StockMovement.objects.select_related('medication', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsStaffOrAbove]

    def get_queryset(self):
        branch = resolve_branch(self.request, required=True)
        qs = StockMovement.objects.select_related('medication', 'created_by').filter(
            branch=branch
        ).order_by('-created_at')
        params = self.request.query_params

        if params.get('medication_id'):
            qs = qs.filter(medication_id=params['medication_id'])
        if params.get('movement_type'):
            qs = qs.filter(movement_type=params['movement_type'])

        return qs
