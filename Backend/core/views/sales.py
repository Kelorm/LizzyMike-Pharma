"""Sales and sale-item views."""
import logging

from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Sale, SaleItem, AuditTrail, BusinessDay
from ..serializers import SaleSerializer, SaleItemSerializer
from ..permissions import IsStaffOrAbove, IsAdminRole
from ..branching import BranchScopedMixin, resolve_branch

logger = logging.getLogger(__name__)


class SaleViewSet(BranchScopedMixin, viewsets.ModelViewSet):
    """
    Point-of-sale transactions.

    - **Read**: all authenticated users
    - **Create**: staff, pharmacist, or admin
    - **Update / Delete**: admin only
    """
    queryset = Sale.objects.select_related('customer', 'created_by', 'branch').prefetch_related('items__medication').order_by('-date')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['payment_method']
    search_fields = ['customer_name', 'items__medication__name']
    ordering_fields = ['date', 'total']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Sale.objects.none()
        qs = super().get_queryset()
        return qs.select_related('customer', 'created_by', 'branch').prefetch_related(
            'items__medication', 'applied_discounts'
        ).order_by('-date')

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsStaffOrAbove()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        branch = resolve_branch(request, required=True)
        open_day = BusinessDay.get_open_day(branch=branch)
        if not open_day:
            raise PermissionDenied(
                'Trading day is closed. Ask an admin to open the day.'
            )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                sale = serializer.save(business_day=open_day, branch=branch)
                AuditTrail.objects.create(
                    user=request.user,
                    action='create',
                    entity='sale',
                    entity_id=str(sale.id),
                    details={
                        'total': str(sale.total),
                        'customer': sale.customer_name,
                        'payment_method': sale.payment_method,
                        'business_day': str(open_day.id),
                        'branch': str(branch.id),
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                )
            return Response(
                self.get_serializer(sale).data,
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as exc:
            logger.warning("Sale validation error: %s", exc.detail)
            return Response({'error': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.error("Sale creation error: %s", exc)
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Today's revenue and transaction count."""
        today = timezone.now().date()
        agg = Sale.objects.filter(date__date=today).aggregate(
            total_amount=Sum('total'),
            total_transactions=Count('id'),
        )
        return Response({
            'date': today,
            'total_amount': agg['total_amount'] or 0,
            'total_transactions': agg['total_transactions'] or 0,
        })

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """This month's revenue and transaction count."""
        today = timezone.now().date()
        first = today.replace(day=1)
        agg = Sale.objects.filter(date__date__gte=first).aggregate(
            total_amount=Sum('total'),
            total_transactions=Count('id'),
        )
        return Response({
            'month': first.strftime('%Y-%m'),
            'total_amount': agg['total_amount'] or 0,
            'total_transactions': agg['total_transactions'] or 0,
        })

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """Receipt stub — full PDF is served by ``ReceiptPDFView``."""
        sale = self.get_object()
        return Response({'sale_id': str(sale.id), 'receipt_url': f'/receipt/{sale.id}/'})

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        """Invoice stub — full PDF is served by ``InvoicePDFView``."""
        sale = self.get_object()
        return Response({
            'sale_id': str(sale.id),
            'invoice_url': f'/api/v1/sales/{sale.id}/invoice/',
        })


class SaleItemViewSet(mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    Individual line items within a sale (read-only).

    Creating or mutating line items outside a sale is not allowed; use POST /sales/.
    """
    queryset = SaleItem.objects.select_related('sale', 'medication').all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['sale', 'medication']
