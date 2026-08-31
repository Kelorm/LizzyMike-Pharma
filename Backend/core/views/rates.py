"""Named tax and discount rate catalogs."""
import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..audit_log import log_audit
from ..models import DiscountRate, TaxRate
from ..permissions import IsAdminOrReadOnly
from ..serializers import DiscountRateSerializer, TaxRateSerializer

logger = logging.getLogger(__name__)


class TaxRateViewSet(viewsets.ModelViewSet):
    """
    Shared tax rate catalog.
    - Read: authenticated
    - Write: admin only
    """

    serializer_class = TaxRateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    pagination_class = None
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = TaxRate.objects.all().order_by('name')
        if getattr(self.request.user, 'role', None) != 'admin':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='tax_rate',
            entity_id=str(obj.id),
            details={'name': obj.name, 'rate': str(obj.rate)},
            request=self.request,
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='tax_rate',
            entity_id=str(obj.id),
            details={'name': obj.name, 'rate': str(obj.rate), 'is_active': obj.is_active},
            request=self.request,
        )


class DiscountRateViewSet(viewsets.ModelViewSet):
    """
    Shared percentage discount catalog.
    - Read: authenticated
    - Write: admin only
    """

    serializer_class = DiscountRateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    pagination_class = None
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = DiscountRate.objects.all().order_by('name')
        if getattr(self.request.user, 'role', None) != 'admin':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='discount_rate',
            entity_id=str(obj.id),
            details={'name': obj.name, 'rate': str(obj.rate)},
            request=self.request,
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='discount_rate',
            entity_id=str(obj.id),
            details={'name': obj.name, 'rate': str(obj.rate), 'is_active': obj.is_active},
            request=self.request,
        )
