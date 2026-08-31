"""Prescription management views — the most critical clinical module."""
import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Prescription, Medication, AuditTrail, StockMovement
from ..serializers import (
    PrescriptionSerializer,
    PrescriptionCreateSerializer,
    PrescriptionUpdateSerializer,
    PrescriptionSummarySerializer,
)
from ..permissions import IsPharmacistOrAdmin, IsAdminRole
from ..branching import resolve_branch

logger = logging.getLogger(__name__)


class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    Full prescription lifecycle management.

    - **Read / Create / Update**: pharmacist or admin
    - **Delete**: admin only
    """
    queryset = Prescription.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated, IsPharmacistOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'customer', 'medication', 'prescribed_by']
    search_fields = ['custom_id', 'patient_name', 'medication_name', 'prescribed_by', 'diagnosis']
    ordering_fields = ['created_at', 'prescribed_date', 'expiry_date', 'priority']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated(), IsPharmacistOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return PrescriptionCreateSerializer
        if self.action in ('update', 'partial_update'):
            return PrescriptionUpdateSerializer
        if self.action == 'list':
            return PrescriptionSummarySerializer
        return PrescriptionSerializer

    def get_queryset(self):
        try:
            branch = resolve_branch(self.request, required=True)
            qs = Prescription.objects.select_related(
                'customer', 'medication', 'created_by', 'verified_by'
            ).filter(branch=branch).order_by('-created_at')

            status_param = self.request.query_params.get('status')
            if status_param:
                qs = qs.filter(status=status_param)

            priority = self.request.query_params.get('priority')
            if priority:
                qs = qs.filter(priority=priority)

            if self.request.query_params.get('expiring_soon') == 'true':
                soon = timezone.now().date() + timedelta(days=30)
                qs = qs.filter(
                    expiry_date__lte=soon,
                    status__in=['approved', 'preparing', 'ready'],
                )

            customer_id = self.request.query_params.get('customer_id')
            if customer_id:
                qs = qs.filter(customer_id=customer_id)

            return qs
        except Exception as exc:
            logger.error("Prescription queryset error: %s", exc)
            return Prescription.objects.none()

    def perform_create(self, serializer):
        prescription = serializer.save(
            created_by=self.request.user,
            branch=resolve_branch(self.request, required=True),
        )
        from ..audit_log import log_audit
        log_audit(
            user=self.request.user,
            action='create',
            entity='prescription',
            entity_id=str(prescription.id),
            details={
                'status': prescription.status,
                'patient_name': prescription.patient_name,
                'customer': str(getattr(prescription, 'customer_id', '') or ''),
            },
            request=self.request,
        )

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as exc:
            logger.error("Prescription list error: %s", exc)
            return Response({'error': 'Failed to fetch prescriptions.'}, status=500)

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update prescription status with transition validation."""
        prescription = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Prescription.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        VALID_TRANSITIONS = {
            'pending':   ['approved', 'cancelled'],
            'approved':  ['preparing', 'cancelled'],
            'preparing': ['ready', 'cancelled'],
            'ready':     ['dispensed', 'cancelled'],
            'dispensed': ['completed'],
            'completed': [],
            'cancelled': [],
            'expired':   [],
        }
        if new_status not in VALID_TRANSITIONS.get(prescription.status, []):
            return Response(
                {'error': f'Cannot transition from {prescription.status!r} to {new_status!r}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Capture OLD status before mutating ───────────────────────
        old_status = prescription.status
        prescription.status = new_status
        if new_status == 'dispensed':
            prescription.dispensed_date = timezone.now()
            prescription.quantity_dispensed = prescription.quantity_prescribed
        prescription.save()

        AuditTrail.objects.create(
            user=request.user,
            action='UPDATE_STATUS',
            entity='Prescription',
            entity_id=str(prescription.id),
            details={'status': {'from': old_status, 'to': new_status}},  # fixed field name
        )

        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        """Dispense a prescription atomically — stock and status update together."""
        prescription = self.get_object()

        if prescription.status not in ('ready', 'approved'):
            return Response(
                {'error': 'Prescription must be in ready or approved state for dispensing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qty = int(request.data.get('quantity', prescription.quantity_prescribed))
        if qty > prescription.quantity_prescribed:
            return Response(
                {'error': 'Cannot dispense more than the prescribed quantity.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Lock the medication row — prevents concurrent dispense race
                medication = Medication.objects.select_for_update().get(
                    pk=prescription.medication_id
                )

                if medication.stock < qty:
                    return Response(
                        {'error': f'Insufficient stock. Available: {medication.stock}.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                previous_stock = medication.stock

                # Atomic stock decrement via F() expression
                Medication.objects.filter(pk=medication.id).update(
                    stock=medication.stock - qty
                )
                new_stock = previous_stock - qty

                # Update prescription — same transaction
                prescription.status = 'dispensed'
                prescription.quantity_dispensed = qty
                prescription.dispensed_date = timezone.now()
                prescription.save()

                StockMovement.objects.create(
                    branch=prescription.branch,
                    medication=medication,
                    movement_type='sale',
                    quantity=-qty,
                    previous_stock=previous_stock,
                    new_stock=new_stock,
                    reference_id=prescription.custom_id,
                    notes=f'Dispensed for prescription {prescription.custom_id}',
                    created_by=request.user,
                )

                AuditTrail.objects.create(
                    user=request.user,
                    action='DISPENSE',
                    entity='Prescription',
                    entity_id=str(prescription.id),
                    details={'quantity_dispensed': qty},
                )

        except Exception as exc:
            logger.error("Dispense error for prescription %s: %s", pk, exc)
            return Response(
                {'error': 'Dispense failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=['post'])
    def refill(self, request, pk=None):
        """Create a new prescription from a refillable completed one."""
        prescription = self.get_object()
        if not prescription.can_refill:
            return Response(
                {'error': 'This prescription cannot be refilled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refill_rx = Prescription.objects.create(
            customer=prescription.customer,
            medication=prescription.medication,
            quantity_prescribed=prescription.quantity_prescribed,
            dosage=prescription.dosage,
            frequency=prescription.frequency,
            duration=prescription.duration,
            administration_route=prescription.administration_route,
            priority=prescription.priority,
            prescribed_by=prescription.prescribed_by,
            doctor_license=prescription.doctor_license,
            doctor_phone=prescription.doctor_phone,
            prescribed_date=prescription.prescribed_date,
            expiry_date=prescription.expiry_date,
            refills_allowed=prescription.refills_allowed,
            diagnosis=prescription.diagnosis,
            allergies=prescription.allergies,
            special_instructions=prescription.special_instructions,
            insurance_provider=prescription.insurance_provider,
            insurance_number=prescription.insurance_number,
            copay_amount=prescription.copay_amount,
            patient_age=prescription.patient_age,
            patient_weight=prescription.patient_weight,
            created_by=request.user,
            status='approved',
        )

        prescription.refills_used += 1
        prescription.save()

        AuditTrail.objects.create(
            user=request.user,
            action='REFILL',
            entity='Prescription',
            entity_id=str(prescription.id),
            details={'refill_prescription_id': str(refill_rx.id)},
        )
        return Response(self.get_serializer(refill_rx).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def add_signature(self, request, pk=None):
        """Attach a digital signature to a prescription."""
        prescription = self.get_object()
        sig = request.data.get('signature')
        if not sig:
            return Response(
                {'error': 'Signature data is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prescription.digital_signature = sig
        prescription.signed_at = timezone.now()
        prescription.verified_by = request.user
        prescription.save()

        AuditTrail.objects.create(
            user=request.user,
            action='SIGN',
            entity='Prescription',
            entity_id=str(prescription.id),
            details={'signed': True},
        )
        return Response(self.get_serializer(prescription).data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Summary counts for the prescription dashboard widget."""
        try:
            today = timezone.now().date()
            stats = {
                'total_prescriptions': Prescription.objects.count(),
                'pending_prescriptions': Prescription.objects.filter(status='pending').count(),
                'ready_prescriptions': Prescription.objects.filter(status='ready').count(),
                'expiring_soon': Prescription.objects.filter(
                    expiry_date__lte=today + timedelta(days=30),
                    status__in=['approved', 'preparing', 'ready'],
                ).count(),
                'urgent_prescriptions': Prescription.objects.filter(
                    priority='urgent',
                    status__in=['pending', 'approved', 'preparing'],
                ).count(),
                'weekly_new': Prescription.objects.filter(
                    created_at__date__gte=today - timedelta(days=7)
                ).count(),
                'status_breakdown': dict(
                    Prescription.objects.values('status')
                    .annotate(count=Count('id'))
                    .values_list('status', 'count')
                ),
                'priority_breakdown': dict(
                    Prescription.objects.values('priority')
                    .annotate(count=Count('id'))
                    .values_list('priority', 'count')
                ),
            }
            return Response(stats)
        except Exception as exc:
            logger.error("Prescription dashboard stats error: %s", exc)
            return Response({'error': 'Failed to fetch dashboard stats.'}, status=500)
