"""Medication inventory views."""
import logging
from datetime import timedelta

from django.db import models
from django.utils import timezone
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Medication
from ..serializers import MedicationSerializer
from ..permissions import IsAdminOrReadOnly
from ..audit_log import log_audit
from ..branching import BranchScopedMixin, resolve_branch

logger = logging.getLogger(__name__)


class MedicationViewSet(BranchScopedMixin, viewsets.ModelViewSet):
    """
    Drug inventory CRUD.

    - **Read** (GET): all authenticated users (staff, pharmacist, admin)
    - **Write** (POST / PUT / PATCH / DELETE): admin only
    """
    queryset = Medication.objects.all().order_by('name')
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'supplier']
    search_fields = ['name', 'category', 'supplier', 'batch_no']
    ordering_fields = ['name', 'category', 'price', 'stock', 'expiry']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('low_stock', '').lower() == 'true':
            qs = qs.filter(stock__lte=models.F('min_stock'))
        if self.request.query_params.get('expiring_soon', '').lower() == 'true':
            cutoff = timezone.now().date() + timedelta(days=90)
            qs = qs.filter(expiry__lte=cutoff)
        return qs

    def perform_create(self, serializer):
        med = serializer.save(branch=resolve_branch(self.request, required=True))
        log_audit(
            user=self.request.user,
            action='create',
            entity='medication',
            entity_id=str(med.id),
            details={'name': med.name, 'category': med.category, 'stock': med.stock},
            request=self.request,
        )

    def perform_update(self, serializer):
        med = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='medication',
            entity_id=str(med.id),
            details={'name': med.name, 'stock': med.stock, 'price': str(med.price)},
            request=self.request,
        )

    def perform_destroy(self, instance):
        med_id = str(instance.id)
        name = instance.name
        instance.delete()
        log_audit(
            user=self.request.user,
            action='delete',
            entity='medication',
            entity_id=med_id,
            details={'name': name},
            request=self.request,
        )

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        """Return medications at or below their minimum stock level."""
        low = self.get_queryset().filter(stock__lte=models.F('min_stock'))
        return Response(self.get_serializer(low, many=True).data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Return medications expiring within 90 days."""
        cutoff = timezone.now().date() + timedelta(days=90)
        expiring = self.get_queryset().filter(expiry__lte=cutoff)
        return Response(self.get_serializer(expiring, many=True).data)


class MedicationListForSale(generics.ListAPIView):
    """In-stock medications — used by the point-of-sale screen."""
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        branch = resolve_branch(self.request, required=True)
        return Medication.objects.filter(branch=branch, stock__gt=0).order_by('name')
