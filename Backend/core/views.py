from datetime import timedelta
from django.db import models, transaction
from django.db.models import Sum, Count, Q, F, Avg
from django.db.models.functions import TruncMonth, TruncDay
from django.utils import timezone
from django.contrib.auth.models import Group
from django.http import HttpResponse, Http404
from django.template.loader import render_to_string
from django.views import View
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    print("WeasyPrint not available - will use HTML fallback")
    WEASYPRINT_AVAILABLE = False
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.db.models import Prefetch

from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from rest_framework import permissions
from rest_framework.exceptions import ValidationError

import logging
logger = logging.getLogger(__name__)

from .models import User, Medication, Customer, Prescription, Sale, SaleItem, Restock, Discount, Promotion, AuditTrail, StockMovement
from .serializers import (
    MedicationSerializer,
    PrescriptionSerializer,
    SaleSerializer,
    SaleItemSerializer,
    RestockSerializer,
    CustomerSerializer,
    UserSerializer,  # Add this line
    DiscountSerializer,
    PromotionSerializer,
    AuditTrailSerializer,
    StockMovementSerializer
)

# Custom Token View
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = None  # Will be set in the serializer

# Token Refresh View
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        logger.info(f"Token refresh request: {request.data}")
        try:
            return super().post(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise

# User Registration View
@api_view(['POST'])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = User.objects.create_user(
            username=serializer.validated_data['username'],
            password=request.data['password'],
            email=serializer.validated_data['email'],
            full_name=serializer.validated_data['full_name'],
            role=serializer.validated_data.get('role', 'pharmacist')
        )
        return Response(UserSerializer(user).data, status=201)
    return Response(serializer.errors, status=400)

# User profile view
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    try:
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Profile view error: {str(e)}")
        return Response({'error': str(e)}, status=500)

# List API for medications available for sale
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def medication_list_for_sale(request):
    medications = Medication.objects.filter(stock__gt=0)
    serializer = MedicationSerializer(medications, many=True)
    return Response(serializer.data)

# Medication ViewSet
class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all().order_by('name')
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'supplier']
    search_fields = ['name', 'category', 'supplier', 'batch_no']
    ordering_fields = ['name', 'category', 'price', 'stock', 'expiry']

    def get_queryset(self):
        queryset = super().get_queryset()
        low_stock = self.request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(stock__lte=models.F('min_stock'))
        expiring_soon = self.request.query_params.get('expiring_soon')
        if expiring_soon and expiring_soon.lower() == 'true':
            three_months = timezone.now().date() + timedelta(days=90)
            queryset = queryset.filter(expiry__lte=three_months)
        return queryset

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        low_stock_meds = self.queryset.filter(stock__lte=models.F('min_stock'))
        serializer = self.get_serializer(low_stock_meds, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        three_months = timezone.now().date() + timedelta(days=90)
        expiring_meds = self.queryset.filter(expiry__lte=three_months)
        serializer = self.get_serializer(expiring_meds, many=True)
        return Response(serializer.data)

# Customer ViewSet
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'insurance']
    filterset_fields = ['insurance']
    ordering_fields = ['name', 'dob']

    def get_queryset(self):
        queryset = Customer.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset

    @action(detail=True, methods=['get'])
    def sales(self, request, pk=None):
        customer = self.get_object()
        sales = Sale.objects.filter(customer=customer).order_by('-date')
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        customer = self.get_object()
        prescriptions = Prescription.objects.filter(customer=customer).order_by('-created_at')
        serializer = PrescriptionSerializer(prescriptions, many=True)
        return Response(serializer.data)

# Enhanced Prescription ViewSet
class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'customer', 'medication', 'prescribed_by']
    search_fields = ['custom_id', 'patient_name', 'medication_name', 'prescribed_by', 'diagnosis']
    ordering_fields = ['created_at', 'prescribed_date', 'expiry_date', 'priority']
    ordering = ['-created_at']

    def get_serializer_class(self):
        from .serializers import (
            PrescriptionSerializer, PrescriptionCreateSerializer, 
            PrescriptionUpdateSerializer, PrescriptionSummarySerializer
        )
        
        if self.action == 'create':
            return PrescriptionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PrescriptionUpdateSerializer
        elif self.action == 'list':
            return PrescriptionSummarySerializer
        return PrescriptionSerializer

    def get_queryset(self):
        try:
            queryset = Prescription.objects.select_related(
                'customer', 'medication', 'created_by', 'verified_by'
            ).order_by('-created_at')
            
            # Filter by status if provided
            status = self.request.query_params.get('status')
            if status:
                queryset = queryset.filter(status=status)
            
            # Filter by priority
            priority = self.request.query_params.get('priority')
            if priority:
                queryset = queryset.filter(priority=priority)
            
            # Filter by expiry (expiring soon)
            expiring_soon = self.request.query_params.get('expiring_soon')
            if expiring_soon == 'true':
                from django.utils import timezone
                from datetime import timedelta
                soon_date = timezone.now().date() + timedelta(days=30)
                queryset = queryset.filter(expiry_date__lte=soon_date, status__in=['approved', 'preparing', 'ready'])
            
            # Filter by customer
            customer_id = self.request.query_params.get('customer_id')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)
            
            return queryset
        except Exception as e:
            logger.error(f"Prescription queryset error: {str(e)}")
            return Prescription.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Prescription list error: {str(e)}")
            return Response({'error': 'Failed to fetch prescriptions'}, status=500)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update prescription status with validation"""
        prescription = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Prescription.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Status transition validation
        valid_transitions = {
            'pending': ['approved', 'cancelled'],
            'approved': ['preparing', 'cancelled'],
            'preparing': ['ready', 'cancelled'],
            'ready': ['dispensed', 'cancelled'],
            'dispensed': ['completed'],
            'completed': [],  # Terminal state
            'cancelled': [],  # Terminal state
            'expired': []     # Terminal state
        }
        
        if new_status not in valid_transitions.get(prescription.status, []):
            return Response(
                {'error': f'Cannot transition from {prescription.status} to {new_status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status and related fields
        prescription.status = new_status
        
        if new_status == 'dispensed':
            from django.utils import timezone
            prescription.dispensed_date = timezone.now()
            prescription.quantity_dispensed = prescription.quantity_prescribed
        
        prescription.save()
        
        # Create audit trail
        AuditTrail.objects.create(
            user=request.user,
            action='UPDATE',
            entity='Prescription',
            entity_id=str(prescription.id),
            changes={'status': {'from': prescription.status, 'to': new_status}}
        )
        
        serializer = self.get_serializer(prescription)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        """Dispense prescription with quantity validation"""
        prescription = self.get_object()
        
        if prescription.status not in ['ready', 'approved']:
            return Response(
                {'error': 'Prescription must be ready or approved for dispensing'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quantity_to_dispense = request.data.get('quantity', prescription.quantity_prescribed)
        
        if quantity_to_dispense > prescription.quantity_prescribed:
            return Response(
                {'error': 'Cannot dispense more than prescribed quantity'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check medication stock
        if prescription.medication.stock < quantity_to_dispense:
            return Response(
                {'error': 'Insufficient medication stock'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update prescription
        from django.utils import timezone
        prescription.status = 'dispensed'
        prescription.quantity_dispensed = quantity_to_dispense
        prescription.dispensed_date = timezone.now()
        prescription.save()
        
        # Update medication stock
        prescription.medication.stock -= quantity_to_dispense
        prescription.medication.save()
        
        # Create stock movement record
        previous_stock = prescription.medication.stock + quantity_to_dispense
        StockMovement.objects.create(
            medication=prescription.medication,
            movement_type='sale',  # Use 'sale' as the closest movement type for dispensing
            quantity=-quantity_to_dispense,  # Negative for outgoing stock
            previous_stock=previous_stock,
            new_stock=prescription.medication.stock,
            reference_id=prescription.custom_id,
            notes=f'Dispensed for prescription {prescription.custom_id}',
            created_by=request.user
        )
        
        # Create audit trail
        AuditTrail.objects.create(
            user=request.user,
            action='DISPENSE',
            entity='Prescription',
            entity_id=str(prescription.id),
            changes={'quantity_dispensed': quantity_to_dispense}
        )
        
        serializer = self.get_serializer(prescription)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def refill(self, request, pk=None):
        """Process prescription refill"""
        prescription = self.get_object()
        
        if not prescription.can_refill:
            return Response(
                {'error': 'Prescription cannot be refilled'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new prescription for refill
        refill_prescription = Prescription.objects.create(
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
            status='approved'  # Auto-approve refills
        )
        
        # Update original prescription refill count
        prescription.refills_used += 1
        prescription.save()
        
        # Create audit trail
        AuditTrail.objects.create(
            user=request.user,
            action='REFILL',
            entity='Prescription',
            entity_id=str(prescription.id),
            changes={'refill_created': str(refill_prescription.id)}
        )
        
        serializer = self.get_serializer(refill_prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def add_signature(self, request, pk=None):
        """Add digital signature to prescription"""
        prescription = self.get_object()
        signature_data = request.data.get('signature')
        
        if not signature_data:
            return Response(
                {'error': 'Signature data is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        prescription.digital_signature = signature_data
        prescription.signed_at = timezone.now()
        prescription.verified_by = request.user
        prescription.save()
        
        # Create audit trail
        AuditTrail.objects.create(
            user=request.user,
            action='SIGN',
            entity='Prescription',
            entity_id=str(prescription.id),
            changes={'signed': True}
        )
        
        serializer = self.get_serializer(prescription)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get prescription dashboard statistics"""
        try:
            from django.db.models import Count, Q
            from django.utils import timezone
            from datetime import timedelta
            
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            
            stats = {
                'total_prescriptions': Prescription.objects.count(),
                'pending_prescriptions': Prescription.objects.filter(status='pending').count(),
                'ready_prescriptions': Prescription.objects.filter(status='ready').count(),
                'expiring_soon': Prescription.objects.filter(
                    expiry_date__lte=today + timedelta(days=30),
                    status__in=['approved', 'preparing', 'ready']
                ).count(),
                'urgent_prescriptions': Prescription.objects.filter(
                    priority='urgent',
                    status__in=['pending', 'approved', 'preparing']
                ).count(),
                'weekly_new': Prescription.objects.filter(
                    created_at__date__gte=week_ago
                ).count(),
                'status_breakdown': dict(
                    Prescription.objects.values('status').annotate(
                        count=Count('id')
                    ).values_list('status', 'count')
                ),
                'priority_breakdown': dict(
                    Prescription.objects.values('priority').annotate(
                        count=Count('id')
                    ).values_list('priority', 'count')
                )
            }
            
            return Response(stats)
        except Exception as e:
            logger.error(f"Prescription dashboard stats error: {str(e)}")
            return Response({'error': 'Failed to fetch dashboard stats'}, status=500)

# Sale Item ViewSet
class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['sale', 'medication']

# Sale ViewSet
class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('customer').prefetch_related(
        Prefetch('items', queryset=SaleItem.objects.select_related('medication'))
    ).order_by('-date')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]  # Only allow authenticated users
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['payment_method']
    search_fields = ['customer', 'items__medication__name']
    ordering_fields = ['date', 'total']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        return qs  # Allow all authenticated users to see all sales

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                medication_ids = [item['medication'].id for item in serializer.validated_data['items']]
                Medication.objects.select_for_update().filter(id__in=medication_ids)
                sale = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            print("ValidationError:", e)
            print("Request data:", request.data)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("Exception:", e)
            print("Request data:", request.data)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        today = timezone.now().date()
        today_sales = self.queryset.filter(date=today)
        total_sales = today_sales.aggregate(
            total_amount=models.Sum('total'),
            total_transactions=models.Count('id')
        )
        return Response({
            'date': today,
            'total_amount': total_sales['total_amount'] or 0,
            'total_transactions': total_sales['total_transactions'] or 0
        })

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        today = timezone.now().date()
        first_of_month = today.replace(day=1)
        monthly_sales = self.queryset.filter(date__gte=first_of_month)
        total_sales = monthly_sales.aggregate(
            total_amount=models.Sum('total'),
            total_transactions=models.Count('id')
        )
        return Response({
            'month': first_of_month.strftime('%Y-%m'),
            'total_amount': total_sales['total_amount'] or 0,
            'total_transactions': total_sales['total_transactions'] or 0
        })

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """Generate receipt for a sale"""
        sale = self.get_object()
        # In a real implementation, this would generate a PDF
        return Response({
            'sale_id': sale.id,
            'message': 'Receipt generation endpoint - implement PDF generation'
        })

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        """Generate invoice for a sale"""
        sale = self.get_object()
        # In a real implementation, this would generate a PDF
        return Response({
            'sale_id': sale.id,
            'message': 'Invoice generation endpoint - implement PDF generation'
        })

# Restock ViewSet
class RestockViewSet(viewsets.ModelViewSet):
    queryset = Restock.objects.all()
    serializer_class = RestockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['medication', 'supplier', 'date_restocked']
    search_fields = ['medication_name', 'supplier', 'batch_number']
    ordering_fields = ['date_restocked', 'total_cost', 'quantity']
    ordering = ['-date_restocked']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date_restocked__gte=start_date)
        if end_date:
            queryset = queryset.filter(date_restocked__lte=end_date)
        
        return queryset

    def perform_create(self, serializer):
        restock = serializer.save()
        
        # Log the restock action
        AuditTrail.objects.create(
            user=self.request.user,
            action='restock_created',
            entity='restock',
            entity_id=str(restock.id),
            details={
                'medication_name': restock.medication_name,
                'quantity': restock.quantity,
                'supplier': restock.supplier,
                'total_cost': float(restock.total_cost)
            }
        )
        
        return restock

    def perform_update(self, serializer):
        restock = serializer.save()
        
        # Log the restock update
        AuditTrail.objects.create(
            user=self.request.user,
            action='restock_updated',
            entity='restock',
            entity_id=str(restock.id),
            details={
                'medication_name': restock.medication_name,
                'quantity': restock.quantity,
                'supplier': restock.supplier,
                'total_cost': float(restock.total_cost)
            }
        )
        
        return restock

    def perform_destroy(self, instance):
        # Log the restock deletion
        AuditTrail.objects.create(
            user=self.request.user,
            action='restock_deleted',
            entity='restock',
            entity_id=str(instance.id),
            details={
                'medication_name': instance.medication_name,
                'quantity': instance.quantity,
                'supplier': instance.supplier,
                'total_cost': float(instance.total_cost)
            }
        )
        
        # Revert stock if restock is deleted
        if instance.medication:
            instance.medication.stock = max(0, instance.medication.stock - instance.quantity)
            instance.medication.save()
        
        instance.delete()

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get restock analytics"""
        queryset = self.get_queryset()
        
        # Calculate analytics
        total_restocks = queryset.count()
        total_quantity = queryset.aggregate(total=Sum('quantity'))['total'] or 0
        total_value = queryset.aggregate(total=Sum('total_cost'))['total'] or 0
        avg_cost = queryset.aggregate(avg=Avg('total_cost'))['avg'] or 0
        
        # Top suppliers
        top_suppliers = queryset.values('supplier').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum('total_cost')
        ).order_by('-total_quantity')[:5]
        
        # Top medications
        top_medications = queryset.values('medication_name').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum('total_cost')
        ).order_by('-total_quantity')[:5]
        
        # Monthly trend
        monthly_data = queryset.annotate(
            month=TruncMonth('date_restocked')
        ).values('month').annotate(
            total_value=Sum('total_cost'),
            total_quantity=Sum('quantity')
        ).order_by('month')
        
        return Response({
            'total_restocks': total_restocks,
            'total_quantity': total_quantity,
            'total_value': float(total_value),
            'average_cost': float(avg_cost),
            'top_suppliers': list(top_suppliers),
            'top_medications': list(top_medications),
            'monthly_trend': list(monthly_data)
        })

# Discount ViewSet
class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Discount.objects.filter(is_active=True)
        now = timezone.now()
        return queryset.filter(start_date__lte=now, end_date__gte=now)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available discounts for a sale"""
        customer_id = request.query_params.get('customer_id')
        subtotal = float(request.query_params.get('subtotal', 0))
        medication_ids = request.query_params.getlist('medication_ids', [])
        
        queryset = self.get_queryset()
        
        # Filter by customer if specified
        if customer_id:
            queryset = queryset.filter(
                Q(applicable_customers__id=customer_id) | 
                Q(applicable_customers__isnull=True)
            )
        
        # Filter by minimum purchase
        queryset = queryset.filter(
            Q(min_purchase__isnull=True) | 
            Q(min_purchase__lte=subtotal)
        )
        
        # Filter by medications if specified
        if medication_ids:
            queryset = queryset.filter(
                Q(applicable_medications__id__in=medication_ids) | 
                Q(applicable_medications__isnull=True)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# Promotion ViewSet
class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Promotion.objects.filter(is_active=True)
        now = timezone.now()
        return queryset.filter(start_date__lte=now, end_date__gte=now)

# Audit Trail ViewSet
class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditTrail.objects.all()
    serializer_class = AuditTrailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AuditTrail.objects.all()
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by entity
        entity = self.request.query_params.get('entity')
        if entity:
            queryset = queryset.filter(entity=entity)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset

# Stock Movement ViewSet
class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = StockMovement.objects.all()
        
        # Filter by medication
        medication_id = self.request.query_params.get('medication_id')
        if medication_id:
            queryset = queryset.filter(medication_id=medication_id)
        
        # Filter by movement type
        movement_type = self.request.query_params.get('movement_type')
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        
        return queryset

# Base PDF View
class BasePDFView(View):
    template_name = None
    filename_prefix = "document"
    content_disposition = "attachment"
    permission_required = 'core.view_sale'
    
    def get_object(self, sale_id):
        print(f"Looking for sale with ID: {sale_id}")
        try:
            sale = get_object_or_404(
                Sale.objects.select_related('customer')
                           .prefetch_related('items__medication'),
                id=sale_id
            )
            print(f"Sale found: {sale}")
            print(f"Sale customer: {sale.customer}")
            print(f"Sale items: {list(sale.items.all())}")
            return sale
        except Exception as e:
            print(f"Error getting sale object: {e}")
            raise
    
    def get_context_data(self, sale):
        # Handle anonymous user
        if self.request.user.is_authenticated:
            cashier_name = self.request.user.get_full_name() or self.request.user.username
        else:
            cashier_name = "System"
        
        context = {
            'sale': sale,
            'items': sale.items.all(),
            'date': sale.date.strftime("%B %d, %Y"),
            'company': {
                'name': "Pharmacy Management System",
                'address': "123 Healthcare Street, MedCity",
                'phone': "(555) 123-4567",
                'license': "PHARM-LIC-2023"
            },
            'cashier': cashier_name
        }
        print(f"Context data created: {list(context.keys())}")
        print(f"Items in context: {len(context['items'])}")
        return context
    
    def get_pdf_styles(self):
        try:
            base_css = CSS(settings.BASE_DIR / 'static' / 'css' / 'pdf_base.css')
            return [base_css]
        except Exception as e:
            print(f"CSS loading failed: {e}")
            return []
    
    def generate_pdf(self, context):
        if not WEASYPRINT_AVAILABLE:
            print("WeasyPrint not available, using HTML fallback")
            html_string = render_to_string(self.template_name, context)
            return html_string.encode('utf-8')
        
        try:
            html_string = render_to_string(self.template_name, context)
            html = HTML(string=html_string, base_url=self.request.build_absolute_uri())
            return html.write_pdf(stylesheets=self.get_pdf_styles())
        except Exception as e:
            print(f"PDF generation failed: {e}")
            # Fallback to HTML
            html_string = render_to_string(self.template_name, context)
            return html_string.encode('utf-8')
    
    def get(self, request, sale_id):
        try:
            print(f"Accessing receipt for sale_id: {sale_id}")
            print(f"User: {request.user}")
            print(f"User permissions: {list(request.user.get_all_permissions())}")
            
            # Temporarily comment out permission check for testing
            # if not request.user.has_perm(self.permission_required):
            #     raise PermissionDenied("You don't have permission to access this document")
            
            sale = self.get_object(sale_id)
            print(f"Sale found: {sale}")
            context = self.get_context_data(sale)
            print(f"Context generated successfully")
            pdf = self.generate_pdf(context)
            print(f"PDF generated successfully")
            
            response = HttpResponse(pdf, content_type='application/pdf')
            disposition = self.content_disposition
            filename = f"{self.filename_prefix}_{sale_id}.pdf"
            response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
            return response
            
        except Http404:
            print(f"Sale not found for ID: {sale_id}")
            return HttpResponse("Sale not found", status=404)
        except PermissionDenied as e:
            print(f"Permission denied: {str(e)}")
            return HttpResponse(str(e), status=403)
        except Exception as e:
            print(f"PDF Generation Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return HttpResponse("Error generating document", status=500)

class InvoicePDFView(BasePDFView):
    template_name = 'core/invoices/invoice_advanced.html'
    filename_prefix = "invoice"
    content_disposition = "attachment"
    permission_required = 'core.view_sale'
    
    def get_pdf_styles(self):
        return super().get_pdf_styles() + [
            CSS(string='.invoice-header { border-bottom: 2px solid #333; margin-bottom: 20px; }')
        ]

class ReceiptPDFView(BasePDFView):
    template_name = 'core/invoices/receipt_simple.html'
    filename_prefix = "receipt"
    content_disposition = "inline"
    permission_required = 'core.view_sale'
    
    def get(self, request, sale_id):
        try:
            print(f"Accessing receipt for sale_id: {sale_id}")
            print(f"User: {request.user}")
            print(f"User authenticated: {request.user.is_authenticated}")
            
            # Skip authentication for now
            sale = self.get_object(sale_id)
            print(f"Sale found: {sale}")
            print(f"Sale items count: {sale.items.count()}")
            
            context = self.get_context_data(sale)
            print(f"Context generated successfully")
            
            # Try to generate PDF, fallback to HTML
            try:
                print(f"Using template: {self.template_name}")
                print(f"Context keys: {list(context.keys())}")
                
                if WEASYPRINT_AVAILABLE:
                    pdf = self.generate_pdf(context)
                    if isinstance(pdf, bytes) and pdf.startswith(b'%PDF'):
                        response = HttpResponse(pdf, content_type='application/pdf')
                        disposition = self.content_disposition
                        filename = f"{self.filename_prefix}_{sale_id}.pdf"
                        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
                        return response
                
                # Fallback to HTML
                html_string = render_to_string(self.template_name, context)
                print(f"HTML generated successfully, length: {len(html_string)}")
                response = HttpResponse(html_string, content_type='text/html')
                response['Content-Disposition'] = 'inline'
                return response
                
            except Exception as e:
                print(f"Template rendering failed: {e}")
                import traceback
                traceback.print_exc()
                return HttpResponse(f"Template rendering error: {str(e)}", status=500)
            
        except Http404:
            print(f"Sale not found for ID: {sale_id}")
            return HttpResponse("Sale not found", status=404)
        except Exception as e:
            print(f"Receipt Generation Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return HttpResponse(f"Error generating document: {str(e)}", status=500)
    
    def get_pdf_styles(self):
        return super().get_pdf_styles() + [
            CSS(string='.receipt { font-size: 12pt; width: 80mm; } .receipt-header { text-align: center; }')
        ]

# Medication List for Sale
class MedicationListForSale(generics.ListAPIView):
    queryset = Medication.objects.filter(stock__gt=0)
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    # You can add pagination, filtering, etc. if needed

class UserRateThrottle(UserRateThrottle):
    scope = 'user'

class SalesAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    
    def get(self, request):
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        # Filter sales by date range
        sales_queryset = Sale.objects.filter(date__gte=start_date)
        
        # Daily revenue
        today = timezone.now().date()
        daily = Sale.objects.filter(date=today).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total')
        )
        
        # Monthly revenue
        first_day = today.replace(day=1)
        monthly = Sale.objects.filter(date__gte=first_day).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total')
        )
        
        # Top medications by quantity sold
        top_meds_by_quantity = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost')))
        ).order_by('-total_sold')[:10]
        
        # Top medications by revenue
        top_meds_by_revenue = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost')))
        ).order_by('-total_revenue')[:10]
        
        # Top medications by profit
        top_meds_by_profit = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost')))
        ).order_by('-total_profit')[:10]
        
        # Sales trend by day
        daily_trend = sales_queryset.annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit')
        ).order_by('day')
        
        # Payment method breakdown
        payment_methods = sales_queryset.values('payment_method').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id')
        ).order_by('-total_revenue')
        
        # Category performance
        category_performance = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values('medication__category').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost')))
        ).order_by('-total_revenue')
        
        return Response({
            'daily': daily,
            'monthly': monthly,
            'top_medications_by_quantity': list(top_meds_by_quantity),
            'top_medications_by_revenue': list(top_meds_by_revenue),
            'top_medications_by_profit': list(top_meds_by_profit),
            'daily_trend': list(daily_trend),
            'payment_methods': list(payment_methods),
            'category_performance': list(category_performance),
            'date_range': {
                'start_date': start_date,
                'end_date': today,
                'days': days
            }
        })

class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    
    def get(self, request):
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        # Filter sales by date range
        sales_queryset = Sale.objects.filter(date__gte=start_date)
        
        # Debug logging
        print(f"Analytics request - days: {days}, start_date: {start_date}")
        print(f"Total sales in date range: {sales_queryset.count()}")
        print(f"Total SaleItems: {SaleItem.objects.count()}")
        
        # Today's stats
        today = timezone.now().date()
        today_stats = Sale.objects.filter(date=today).aggregate(
            total_revenue=Sum('total') or 0,
            total_sales=Count('id') or 0,
            total_profit=Sum('profit') or 0,
            avg_sale_value=Avg('total') or 0
        )
        
        # This month's stats
        first_day = today.replace(day=1)
        month_stats = Sale.objects.filter(date__gte=first_day).aggregate(
            total_revenue=Sum('total') or 0,
            total_sales=Count('id') or 0,
            total_profit=Sum('profit') or 0,
            avg_sale_value=Avg('total') or 0
        )
        
        # Top products by quantity (for dashboard)
        top_products_by_quantity = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values(
            'medication__name', 
            'medication__id',
            'medication__category'
        ).annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
            avg_price=Avg('price')
        ).order_by('-total_sold')[:6]
        
        # Debug logging for top products
        print(f"Top products query result count: {len(top_products_by_quantity)}")
        for product in top_products_by_quantity:
            print(f"Product: {product['medication__name']}, Sold: {product['total_sold']}, Revenue: {product['total_revenue']}")
        
        # Top products by revenue
        top_products_by_revenue = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values(
            'medication__name', 
            'medication__id',
            'medication__category'
        ).annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
            avg_price=Avg('price')
        ).order_by('-total_revenue')[:6]
        
        # Recent sales trend (last 7 days)
        last_7_days = timezone.now().date() - timezone.timedelta(days=7)
        daily_trend = Sale.objects.filter(
            date__gte=last_7_days
        ).annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit')
        ).order_by('day')
        
        # Category performance
        category_performance = SaleItem.objects.filter(
            sale__date__gte=start_date
        ).values('medication__category').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost')))
        ).order_by('-total_revenue')[:5]
        
        return Response({
            'today_stats': today_stats,
            'month_stats': month_stats,
            'top_products_by_quantity': list(top_products_by_quantity),
            'top_products_by_revenue': list(top_products_by_revenue),
            'daily_trend': list(daily_trend),
            'category_performance': list(category_performance),
            'date_range': {
                'start_date': start_date,
                'end_date': today,
                'days': days
            }
        })

class HealthCheckView(APIView):
    def get(self, request):
        from django.db import connection
        from .monitoring import SystemMonitor, MetricsCollector, AlertManager
        
        try:
            # Basic health check
            connection.ensure_connection()
            
            # Get comprehensive health status
            health = SystemMonitor.get_system_health()
            
            # Get business metrics
            metrics = MetricsCollector.get_business_metrics()
            
            # Check for alerts
            alerts = AlertManager.check_alerts()
            
            return Response({
                "status": health['status'],
                "timestamp": timezone.now().isoformat(),
                "health": health,
                "metrics": metrics,
                "alerts": alerts
            }, status=200)
        except Exception as e:
            return Response({
                "status": "down", 
                "error": str(e),
                "timestamp": timezone.now().isoformat()
            }, status=500)