from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from .models import Medication, Sale, SaleItem, User, Prescription, Restock, Customer, Discount, Promotion, AuditTrail, StockMovement

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'phone']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure full_name is not None
        if data.get('full_name') is None:
            data['full_name'] = instance.username
        return data

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True}
        }

    def validate_phone(self, value):
        # Basic phone validation
        if len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits")
        return value

class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'current_usage': {'read_only': True}
        }

    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError("End date must be after start date")
        return data

class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True}
        }

class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'cost': {'required': True},
            'stock': {'min_value': 0},
            'min_stock': {'min_value': 0},
            'price': {'min_value': Decimal('0.01')}
        }

class SaleItemSerializer(serializers.ModelSerializer):
    medication = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.filter(stock__gt=0)
    )
    medication_name = serializers.CharField(read_only=True)
    sale = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SaleItem
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True}
        }

    def validate_qty(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

class SaleSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField()
    total_cost = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    items = SaleItemSerializer(many=True)
    applied_discounts = DiscountSerializer(many=True, read_only=True)
    customer_details = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True}
        }

    def get_total_cost(self, obj):
        return sum(item.medication.cost * item.qty for item in obj.items.all())

    def get_profit(self, obj):
        return obj.total - self.get_total_cost(obj)

    def validate(self, data):
        with transaction.atomic():
            medication_ids = [item['medication'].id for item in data['items']]
            medications = Medication.objects.select_for_update().filter(
                id__in=medication_ids
            ).in_bulk()
            
            for item in data['items']:
                med = medications.get(item['medication'].id)
                if not med:
                    raise serializers.ValidationError(
                        f"Medication ID {item['medication'].id} not found"
                    )
                if med.stock < item['qty']:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {med.name}. "
                        f"Available: {med.stock}, Requested: {item['qty']}"
                    )
            return data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        applied_discounts_data = validated_data.pop('applied_discounts', [])
        
        sale = Sale.objects.create(**validated_data)
        
        # Add applied discounts
        if applied_discounts_data:
            sale.applied_discounts.set(applied_discounts_data)
        
        for item_data in items_data:
            med = item_data['medication']
            # Atomic stock update
            updated = Medication.objects.filter(
                pk=med.id, 
                stock__gte=item_data['qty']
            ).update(stock=F('stock') - item_data['qty'])
            
            if not updated:
                raise serializers.ValidationError(
                    f"Insufficient stock for {med.name}"
                )
                
            # Create sale item
            sale_item = SaleItem.objects.create(
                sale=sale,
                medication=med,
                qty=item_data['qty'],
                price=med.price,
                cost=med.cost,
                medication_name=med.name,
                discount=item_data.get('discount', 0),
                final_price=item_data.get('final_price', med.price)
            )
            
            # Record stock movement
            StockMovement.objects.create(
                medication=med,
                movement_type='sale',
                quantity=-item_data['qty'],
                previous_stock=med.stock + item_data['qty'],
                new_stock=med.stock,
                reference_id=str(sale.id),
                created_by=self.context['request'].user
            )
        
        # Recalculate total
        sale.total = sale.calculate_total()
        sale.save()
        return sale

class PrescriptionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_category = serializers.CharField(source='medication.category', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    
    # Computed fields
    is_expired = serializers.ReadOnlyField()
    refills_remaining = serializers.ReadOnlyField()
    can_refill = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    
    # Status display
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ('id', 'custom_id', 'created_at', 'updated_at', 'patient_name', 'medication_name')


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new prescriptions"""
    
    class Meta:
        model = Prescription
        fields = [
            'customer', 'medication', 'quantity_prescribed', 'dosage', 'frequency', 
            'duration', 'administration_route', 'priority', 'prescribed_by', 
            'doctor_license', 'doctor_phone', 'prescribed_date', 'expiry_date',
            'refills_allowed', 'diagnosis', 'allergies', 'special_instructions', 
            'notes', 'insurance_provider', 'insurance_number', 'copay_amount',
            'patient_age', 'patient_weight'
        ]
    
    def validate(self, data):
        # Validate expiry date is in the future
        from django.utils import timezone
        if data.get('expiry_date') and data['expiry_date'] <= timezone.now().date():
            raise serializers.ValidationError("Expiry date must be in the future")
        
        # Validate prescribed date is not in the future
        if data.get('prescribed_date') and data['prescribed_date'] > timezone.now().date():
            raise serializers.ValidationError("Prescribed date cannot be in the future")
        
        # Validate quantity
        if data.get('quantity_prescribed', 0) <= 0:
            raise serializers.ValidationError("Quantity prescribed must be greater than 0")
        
        return data


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating prescription status and dispensing"""
    
    class Meta:
        model = Prescription
        fields = [
            'status', 'quantity_dispensed', 'dispensed_date', 'verified_by',
            'digital_signature', 'signed_at', 'notes', 'refills_used'
        ]
    
    def validate_quantity_dispensed(self, value):
        if self.instance and value > self.instance.quantity_prescribed:
            raise serializers.ValidationError(
                "Quantity dispensed cannot exceed quantity prescribed"
            )
        return value


class PrescriptionSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for prescription lists and summaries"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'custom_id', 'customer_name', 'medication_name', 'quantity_prescribed',
            'quantity_dispensed', 'status', 'status_display', 'priority', 'priority_display',
            'prescribed_by', 'prescribed_date', 'expiry_date', 'days_until_expiry',
            'created_at', 'refills_remaining'
        ]
        extra_kwargs = {
            'id': {'read_only': True}
        }

class RestockSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    
    class Meta:
        model = Restock
        fields = [
            'id', 'medication', 'medication_name', 'quantity', 'unit_cost', 
            'total_cost', 'supplier', 'batch_number', 'expiry_date', 'notes',
            'date_restocked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'date_restocked', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set medication_name from the medication
        medication = validated_data['medication']
        validated_data['medication_name'] = medication.name
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Update medication_name if medication changes
        if 'medication' in validated_data:
            medication = validated_data['medication']
            validated_data['medication_name'] = medication.name
        return super().update(instance, validated_data)

class AuditTrailSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = AuditTrail
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'timestamp': {'read_only': True}
        }

class StockMovementSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True}
        }