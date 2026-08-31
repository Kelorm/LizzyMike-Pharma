"""Customer management views."""
import logging

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Customer, Sale, Prescription
from ..serializers import CustomerSerializer, SaleSerializer, PrescriptionSerializer
from ..permissions import IsAdminOrReadOnly
from ..audit_log import log_audit

logger = logging.getLogger(__name__)


class CustomerViewSet(viewsets.ModelViewSet):
    """
    Patient / customer registry CRUD.

    - **Read**: all authenticated users
    - **Write**: admin only
    """
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'insurance']
    filterset_fields = ['insurance']
    ordering_fields = ['name', 'dob']

    def get_queryset(self):
        qs = Customer.objects.all()
        q = self.request.query_params.get('search')
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(phone__icontains=q) |
                Q(email__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        customer = serializer.save()
        log_audit(
            user=self.request.user,
            action='create',
            entity='customer',
            entity_id=str(customer.id),
            details={'name': customer.name},
            request=self.request,
        )

    def perform_update(self, serializer):
        customer = serializer.save()
        log_audit(
            user=self.request.user,
            action='update',
            entity='customer',
            entity_id=str(customer.id),
            details={'name': customer.name, 'fields': list(self.request.data.keys())},
            request=self.request,
        )

    def perform_destroy(self, instance):
        cust_id = str(instance.id)
        name = instance.name
        instance.delete()
        log_audit(
            user=self.request.user,
            action='delete',
            entity='customer',
            entity_id=cust_id,
            details={'name': name},
            request=self.request,
        )

    @action(detail=True, methods=['get'])
    def sales(self, request, pk=None):
        """Sales history for this customer (paginated)."""
        customer = self.get_object()
        sales_qs = Sale.objects.filter(customer=customer).order_by('-date')

        page = self.paginate_queryset(sales_qs)
        if page is not None:
            serializer = SaleSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return Response(SaleSerializer(sales_qs, many=True).data)

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        """Prescription history for this customer (paginated)."""
        customer = self.get_object()
        rx_qs = Prescription.objects.filter(customer=customer).order_by('-created_at')

        page = self.paginate_queryset(rx_qs)
        if page is not None:
            serializer = PrescriptionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return Response(PrescriptionSerializer(rx_qs, many=True).data)
