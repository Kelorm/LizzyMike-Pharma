"""Inventory restock views."""
import logging

from django.db import transaction
from django.db.models import Sum, Avg, F
from django.db.models.functions import TruncMonth
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Restock, AuditTrail, Medication, StockMovement
from ..serializers import RestockSerializer
from ..permissions import IsPharmacistOrAdmin, IsAdminRole, IsStaffOrAbove
from ..branching import BranchScopedMixin, resolve_branch

logger = logging.getLogger(__name__)


class RestockViewSet(BranchScopedMixin, viewsets.ModelViewSet):
    """
    Inventory replenishment records.

    - **List / Retrieve / Create / Analytics**: staff, pharmacist, or admin
    - **Update**: pharmacist or admin
    - **Delete**: admin only
    """
    queryset = Restock.objects.all()
    serializer_class = RestockSerializer
    permission_classes = [IsAuthenticated, IsStaffOrAbove]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['medication', 'supplier', 'date_restocked']
    search_fields = ['medication_name', 'supplier', 'batch_number']
    ordering_fields = ['date_restocked', 'total_cost', 'quantity']
    ordering = ['-date_restocked']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdminRole()]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), IsPharmacistOrAdmin()]
        return [IsAuthenticated(), IsStaffOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(date_restocked__gte=start)
        if end:
            qs = qs.filter(date_restocked__lte=end)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            restock = serializer.save(branch=resolve_branch(self.request, required=True))
            AuditTrail.objects.create(
                user=self.request.user,
                action='restock_created',
                entity='restock',
                entity_id=str(restock.id),
                details={
                    'medication_name': restock.medication_name,
                    'quantity': restock.quantity,
                    'supplier': restock.supplier,
                    'total_cost': float(restock.total_cost),
                },
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            restock = serializer.save()
            AuditTrail.objects.create(
                user=self.request.user,
                action='restock_updated',
                entity='restock',
                entity_id=str(restock.id),
                details={
                    'medication_name': restock.medication_name,
                    'quantity': restock.quantity,
                    'supplier': restock.supplier,
                    'total_cost': float(restock.total_cost),
                },
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            qty = instance.quantity
            med_id = instance.medication_id
            if med_id:
                med = Medication.objects.select_for_update().get(pk=med_id)
                if med.stock < qty:
                    raise ValidationError(
                        f"Cannot delete restock: {med.name} stock would go negative "
                        f"(have {med.stock}, need to reverse {qty})."
                    )
                previous_stock = med.stock
                updated = Medication.objects.filter(pk=med_id, stock__gte=qty).update(
                    stock=F('stock') - qty
                )
                if not updated:
                    raise ValidationError(
                        f"Cannot delete restock: insufficient stock on {med.name}."
                    )
                StockMovement.objects.create(
                    branch=getattr(instance, 'branch', None) or resolve_branch(self.request, required=False),
                    medication=med,
                    movement_type='adjustment',
                    quantity=-qty,
                    previous_stock=previous_stock,
                    new_stock=previous_stock - qty,
                    reference_id=str(instance.id),
                    notes='Restock deleted (stock reversed)',
                    created_by=self.request.user,
                )

            AuditTrail.objects.create(
                user=self.request.user,
                action='restock_deleted',
                entity='restock',
                entity_id=str(instance.id),
                details={
                    'medication_name': instance.medication_name,
                    'quantity': instance.quantity,
                    'supplier': instance.supplier,
                    'total_cost': float(instance.total_cost),
                },
            )
            instance.delete()

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Restock analytics: totals, top suppliers, top medications, monthly trend."""
        qs = self.get_queryset()
        top_suppliers = (
            qs.values('supplier')
            .annotate(total_quantity=Sum('quantity'), total_value=Sum('total_cost'))
            .order_by('-total_quantity')[:5]
        )
        top_meds = (
            qs.values('medication_name')
            .annotate(total_quantity=Sum('quantity'), total_value=Sum('total_cost'))
            .order_by('-total_quantity')[:5]
        )
        monthly = (
            qs.annotate(month=TruncMonth('date_restocked'))
            .values('month')
            .annotate(total_value=Sum('total_cost'), total_quantity=Sum('quantity'))
            .order_by('month')
        )
        return Response({
            'total_restocks': qs.count(),
            'total_quantity': qs.aggregate(t=Sum('quantity'))['t'] or 0,
            'total_value': float(qs.aggregate(t=Sum('total_cost'))['t'] or 0),
            'average_cost': float(qs.aggregate(a=Avg('total_cost'))['a'] or 0),
            'top_suppliers': list(top_suppliers),
            'top_medications': list(top_meds),
            'monthly_trend': list(monthly),
        })
