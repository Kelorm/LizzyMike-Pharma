"""Discount and promotion views."""
import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Discount, Promotion
from ..serializers import DiscountSerializer, PromotionSerializer
from ..permissions import IsAdminOrReadOnly
from ..audit_log import log_audit

logger = logging.getLogger(__name__)


class DiscountViewSet(viewsets.ModelViewSet):
    """
    Discounts.

    - **Read**: all authenticated users (admins see all; others see active only)
    - **Write**: admin only
    """
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        now = timezone.now()
        qs = Discount.objects.all().order_by('-created_at')
        user = self.request.user
        # Admins managing discounts need the full catalogue
        if getattr(user, 'role', None) == 'admin' and self.action != 'available':
            return qs
        return qs.filter(is_active=True, start_date__lte=now, end_date__gte=now)

    def perform_create(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='discount',
            entity_id=str(obj.id),
            details={'name': getattr(obj, 'name', None) or str(obj.id)},
            request=self.request,
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='discount',
            entity_id=str(obj.id),
            details={'name': getattr(obj, 'name', None) or str(obj.id)},
            request=self.request,
        )

    def perform_destroy(self, instance):
        obj_id = str(instance.id)
        name = getattr(instance, 'name', None)
        instance.delete()
        log_audit(
            user=self.request.user,
            action='delete',
            entity='discount',
            entity_id=obj_id,
            details={'name': name},
            request=self.request,
        )

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Return applicable discounts for a sale.

        Query params: ``customer_id``, ``subtotal``, ``medication_ids`` (list).
        """
        customer_id = request.query_params.get('customer_id')
        subtotal = float(request.query_params.get('subtotal', 0))
        medication_ids = request.query_params.getlist('medication_ids')

        now = timezone.now()
        qs = Discount.objects.filter(
            is_active=True, start_date__lte=now, end_date__gte=now
        )

        if customer_id:
            qs = qs.filter(
                Q(applicable_customers__id=customer_id) |
                Q(applicable_customers__isnull=True)
            ).distinct()
        qs = qs.filter(
            Q(min_purchase__isnull=True) | Q(min_purchase__lte=subtotal)
        )
        if medication_ids:
            qs = qs.filter(
                Q(applicable_medications__id__in=medication_ids) |
                Q(applicable_medications__isnull=True)
            ).distinct()

        return Response(self.get_serializer(qs, many=True).data)


class PromotionViewSet(viewsets.ModelViewSet):
    """
    Promotions.

    - **Read**: authenticated (admins see all; others see active only)
    - **Write**: admin only
    """
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        now = timezone.now()
        qs = Promotion.objects.all().order_by('-created_at')
        if getattr(self.request.user, 'role', None) == 'admin':
            return qs
        return qs.filter(is_active=True, start_date__lte=now, end_date__gte=now)

    def perform_create(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='promotion',
            entity_id=str(obj.id),
            details={'name': getattr(obj, 'name', None) or str(obj.id)},
            request=self.request,
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='promotion',
            entity_id=str(obj.id),
            details={'name': getattr(obj, 'name', None) or str(obj.id)},
            request=self.request,
        )

    def perform_destroy(self, instance):
        obj_id = str(instance.id)
        name = getattr(instance, 'name', None)
        instance.delete()
        log_audit(
            user=self.request.user,
            action='delete',
            entity='promotion',
            entity_id=obj_id,
            details={'name': name},
            request=self.request,
        )
