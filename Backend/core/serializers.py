from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import Medication, Sale, SaleItem, User, Prescription, Restock, Customer, Discount, Promotion, AuditTrail, StockMovement, BusinessDay, PharmacyProfile, Branch, TaxRate, DiscountRate

CREATABLE_ROLES = ('staff', 'pharmacist')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    branch_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Branch.objects.all(),
        source='branches',
        required=False,
        write_only=True,
    )
    branches = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 'phone',
            'is_active', 'date_joined', 'password', 'branches', 'branch_ids',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_branches(self, obj):
        qs = obj.branches.all().order_by('name') if obj.pk else Branch.objects.none()
        return [
            {
                'id': str(b.id),
                'code': b.code,
                'name': b.name,
                'is_active': b.is_active,
            }
            for b in qs
        ]

    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError(
                'Cannot create or assign the admin role via the API.'
            )
        if value not in CREATABLE_ROLES:
            raise serializers.ValidationError(
                f'Role must be one of: {", ".join(CREATABLE_ROLES)}.'
            )
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('full_name') is None:
            data['full_name'] = instance.username
        return data

    def create(self, validated_data):
        branches = validated_data.pop('branches', [])
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if branches:
            user.branches.set(branches)
        elif Branch.objects.exists():
            user.branches.add(Branch.get_default())
        return user

    def update(self, instance, validated_data):
        branches = validated_data.pop('branches', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if branches is not None:
            instance.branches.set(branches)
        return instance


class UserActiveSerializer(serializers.ModelSerializer):
    """Admin-only: toggle account access (is_active)."""

    class Meta:
        model = User
        fields = ['id', 'is_active']
        read_only_fields = ['id']


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """Admin edit of staff/pharmacist accounts (and limited fields for admins)."""

    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    branch_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Branch.objects.all(),
        source='branches',
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 'phone',
            'is_active', 'password', 'branch_ids',
        ]
        read_only_fields = ['id', 'username']

    def validate_role(self, value):
        instance = getattr(self, 'instance', None)
        if instance and instance.role == 'admin':
            if value != 'admin':
                raise serializers.ValidationError('Cannot change an admin user role via this form.')
            return value
        if value == 'admin':
            raise serializers.ValidationError('Cannot assign the admin role via the API.')
        if value not in CREATABLE_ROLES:
            raise serializers.ValidationError(
                f'Role must be one of: {", ".join(CREATABLE_ROLES)}.'
            )
        return value

    def update(self, instance, validated_data):
        branches = validated_data.pop('branches', None)
        password = validated_data.pop('password', None)
        if instance.role == 'admin':
            # Never change admin role / is_active through this serializer path except fields below
            validated_data.pop('role', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            from django.contrib.auth.password_validation import validate_password
            validate_password(password, user=instance)
            instance.set_password(password)
        instance.save()
        if branches is not None:
            instance.branches.set(branches)
        return instance


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = ['id', 'name', 'rate', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rate(self, value):
        if value is None:
            return Decimal('0.0000')
        if value < 0 or value > 1:
            raise serializers.ValidationError('Rate must be between 0 and 1 (e.g. 0.03 for 3%).')
        return value

    def validate_name(self, value):
        name = (value or '').strip()
        if not name:
            raise serializers.ValidationError('Name is required.')
        return name


class DiscountRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountRate
        fields = ['id', 'name', 'rate', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rate(self, value):
        if value is None:
            return Decimal('0.0000')
        if value < 0 or value > 1:
            raise serializers.ValidationError('Rate must be between 0 and 1 (e.g. 0.10 for 10%).')
        return value

    def validate_name(self, value):
        name = (value or '').strip()
        if not name:
            raise serializers.ValidationError('Name is required.')
        return name


def _rate_summary(obj):
    if obj is None:
        return None
    return {
        'id': str(obj.id),
        'name': obj.name,
        'rate': str(obj.rate),
        'is_active': obj.is_active,
    }


class BranchSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    default_tax = serializers.SerializerMethodField()
    default_discount = serializers.SerializerMethodField()
    default_tax_id = serializers.PrimaryKeyRelatedField(
        queryset=TaxRate.objects.all(),
        source='default_tax',
        allow_null=True,
        required=False,
        write_only=True,
    )
    default_discount_id = serializers.PrimaryKeyRelatedField(
        queryset=DiscountRate.objects.all(),
        source='default_discount',
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Branch
        fields = [
            'id', 'code', 'name', 'is_active',
            'phone', 'email', 'license_no', 'address',
            'tax_enabled', 'tax_rate',
            'default_tax', 'default_discount',
            'default_tax_id', 'default_discount_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_default_tax(self, obj):
        return _rate_summary(obj.default_tax)

    def get_default_discount(self, obj):
        return _rate_summary(obj.default_discount)

    def validate_tax_rate(self, value):
        if value is None:
            return Decimal('0.0000')
        if value < 0 or value > 1:
            raise serializers.ValidationError('Tax rate must be between 0 and 1 (e.g. 0.03 for 3%).')
        return value

    def validate_code(self, value):
        code = (value or '').strip().upper()
        if not code:
            raise serializers.ValidationError('Branch code is required.')
        return code

    def validate_email(self, value):
        return (value or '').strip()


class PharmacyProfileSerializer(serializers.ModelSerializer):
    """Legacy shape — maps to the active Branch fields for FE compatibility."""

    email = serializers.EmailField(required=False, allow_blank=True)
    default_tax = serializers.SerializerMethodField()
    default_discount = serializers.SerializerMethodField()
    default_tax_id = serializers.PrimaryKeyRelatedField(
        queryset=TaxRate.objects.all(),
        source='default_tax',
        allow_null=True,
        required=False,
        write_only=True,
    )
    default_discount_id = serializers.PrimaryKeyRelatedField(
        queryset=DiscountRate.objects.all(),
        source='default_discount',
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Branch
        fields = [
            'name', 'phone', 'email', 'license_no', 'address',
            'tax_enabled', 'tax_rate',
            'default_tax', 'default_discount',
            'default_tax_id', 'default_discount_id',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def get_default_tax(self, obj):
        return _rate_summary(obj.default_tax)

    def get_default_discount(self, obj):
        return _rate_summary(obj.default_discount)

    def validate_tax_rate(self, value):
        if value is None:
            return Decimal('0.0000')
        if value < 0 or value > 1:
            raise serializers.ValidationError('Tax rate must be between 0 and 1 (e.g. 0.03 for 3%).')
        return value

    def validate_email(self, value):
        return (value or '').strip()


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'custom_id', 'name', 'phone', 'email', 'address', 'dob',
            'insurance', 'allergies', 'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'custom_id': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }

    def validate_phone(self, value):
        # Basic phone validation
        if len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user and getattr(user, 'role', None) == 'staff':
            for key in ('address', 'dob', 'insurance', 'allergies'):
                data.pop(key, None)
        return data


class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'current_usage': {'read_only': True}
        }

    def validate(self, data):
        start = data.get('start_date', getattr(self.instance, 'start_date', None))
        end = data.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and start >= end:
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
        fields = [
            'id', 'name', 'description', 'category', 'classification', 'dosage',
            'price', 'cost', 'stock', 'min_stock', 'expiry', 'supplier', 'batch_no',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'cost': {'required': True},
            'classification': {'required': True, 'allow_blank': False},
            'stock': {'min_value': 0},
            'min_stock': {'min_value': 0},
            'price': {'min_value': Decimal('0.01')},
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
            'dosage': {'required': False, 'allow_blank': True},
        }

    def validate_category(self, value):
        name = (value or '').strip()
        if not name:
            raise serializers.ValidationError('Category is required.')
        return name

    def validate_classification(self, value):
        name = (value or '').strip()
        if not name:
            raise serializers.ValidationError('Classification is required.')
        return name

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        # Staff (and anonymous) must not see wholesale cost
        if not user or not getattr(user, 'is_authenticated', False) or getattr(user, 'role', None) == 'staff':
            data.pop('cost', None)
        return data

class SaleItemSerializer(serializers.ModelSerializer):
    medication = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.filter(stock__gt=0)
    )
    medication_name = serializers.CharField(read_only=True, required=False)
    sale = serializers.PrimaryKeyRelatedField(read_only=True)
    # Unit price fields are always set server-side on create.
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

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


def _compute_discount_amount(discount, subtotal):
    """Server-side discount amount for a sale subtotal."""
    if discount.type == 'percentage':
        amount = (subtotal * discount.value) / Decimal('100')
        if discount.max_discount is not None:
            amount = min(amount, discount.max_discount)
        return amount.quantize(Decimal('0.01'))
    if discount.type == 'fixed':
        return min(discount.value, subtotal).quantize(Decimal('0.01'))
    # buy_x_get_y and unknown types: no automatic reduction without line rules
    return Decimal('0.00')


def _assert_discount_applicable(discount, customer, subtotal, medication_ids):
    """Raise ValidationError if discount cannot be applied to this sale."""
    now = timezone.now()
    if not discount.is_active:
        raise serializers.ValidationError(f"Discount '{discount.name}' is not active.")
    if discount.start_date > now or discount.end_date < now:
        raise serializers.ValidationError(f"Discount '{discount.name}' is outside its validity window.")
    if discount.usage_limit is not None and discount.current_usage >= discount.usage_limit:
        raise serializers.ValidationError(f"Discount '{discount.name}' has reached its usage limit.")
    if discount.min_purchase is not None and subtotal < discount.min_purchase:
        raise serializers.ValidationError(
            f"Discount '{discount.name}' requires minimum purchase of {discount.min_purchase}."
        )
    applicable_customers = discount.applicable_customers.all()
    if applicable_customers.exists() and customer not in applicable_customers:
        raise serializers.ValidationError(f"Discount '{discount.name}' is not valid for this customer.")
    applicable_meds = discount.applicable_medications.all()
    if applicable_meds.exists():
        allowed = set(applicable_meds.values_list('id', flat=True))
        if not set(medication_ids).intersection(allowed):
            raise serializers.ValidationError(
                f"Discount '{discount.name}' does not apply to the selected medications."
            )


class SaleSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField()
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    profit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    items = SaleItemSerializer(many=True)
    applied_discounts = DiscountSerializer(many=True, read_only=True)
    discount_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Discount.objects.all(),
        write_only=True,
        required=False,
        source='applied_discounts',
    )
    customer_details = CustomerSerializer(source='customer', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(required=False)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'custom_id': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'loyalty_points_earned': {'read_only': True},
            'created_by': {'read_only': True},
        }

    def get_created_by_name(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return None
        return user.full_name or user.get_full_name() or user.username

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user and getattr(user, 'role', None) == 'staff':
            data.pop('total_cost', None)
            data.pop('profit', None)
            items = data.get('items') or []
            for item in items:
                if isinstance(item, dict):
                    item.pop('cost', None)
        return data

    def validate(self, data):
        """Pre-create validation — no DB locks here, just business rule checks."""
        items = data.get('items') or []
        if not items:
            raise serializers.ValidationError({'items': 'At least one line item is required.'})
        for item in items:
            med = item['medication']
            if med.stock < item['qty']:
                raise serializers.ValidationError(
                    f"Insufficient stock for {med.name}. "
                    f"Available: {med.stock}, Requested: {item['qty']}"
                )
        return data

    def create(self, validated_data):
        from django.db import connection

        items_data = validated_data.pop('items')
        discounts = list(validated_data.pop('applied_discounts', []))

        # Drop any client-supplied money fields if present
        for money_field in (
            'subtotal', 'total', 'discount_total', 'total_cost', 'profit',
            'business_day', 'tax_enabled', 'tax_rate', 'tax_amount',
            'tax_name', 'discount_name', 'discount_rate',
        ):
            validated_data.pop(money_field, None)

        customer = validated_data.get('customer')
        if not validated_data.get('customer_name'):
            validated_data['customer_name'] = customer.name if customer else 'Walk-in Customer'

        medication_ids = []
        for item in items_data:
            med = item['medication']
            fefo = _resolve_fefo_medication(med, item['qty'])
            medication_ids.extend([med.id, fefo.id])
        medication_ids = list(set(medication_ids))

        if connection.vendor == 'postgresql':
            locked_meds = {
                m.id: m
                for m in Medication.objects.select_for_update().filter(id__in=medication_ids)
            }
        else:
            locked_meds = {
                m.id: m
                for m in Medication.objects.filter(id__in=medication_ids)
            }

        for item in items_data:
            med = locked_meds[item['medication'].id]
            qty = item['qty']
            fefo_med = _resolve_fefo_medication(med, qty)
            if fefo_med.stock < qty:
                raise serializers.ValidationError(
                    f"Insufficient stock for {med.name}. "
                    f"Available: {fefo_med.stock}, Requested: {qty}"
                )

        # Placeholder money fields — recomputed after line items exist
        validated_data['subtotal'] = Decimal('0.00')
        validated_data['discount_total'] = Decimal('0.00')
        validated_data['total'] = Decimal('0.00')
        validated_data['total_cost'] = Decimal('0.00')
        validated_data['profit'] = Decimal('0.00')

        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        if not validated_data.get('branch') and request:
            try:
                from .branching import resolve_branch
                validated_data['branch'] = resolve_branch(request, required=True)
            except Exception:
                validated_data['branch'] = Branch.get_default()

        sale = Sale.objects.create(**validated_data)

        line_subtotal = Decimal('0.00')
        line_cost = Decimal('0.00')

        for item_data in items_data:
            requested_med = locked_meds[item_data['medication'].id]
            qty = item_data['qty']
            med = _resolve_fefo_medication(requested_med, qty)
            if med.id != requested_med.id:
                locked_meds[med.id] = med
            previous_stock = med.stock

            updated = Medication.objects.filter(
                pk=med.id, stock__gte=qty
            ).update(stock=F('stock') - qty)

            if not updated:
                raise serializers.ValidationError(
                    f"Insufficient stock for {med.name} (concurrent update detected)."
                )

            new_stock = previous_stock - qty
            unit_price = med.price
            unit_cost = med.cost

            SaleItem.objects.create(
                sale=sale,
                medication=med,
                qty=qty,
                price=unit_price,
                cost=unit_cost,
                medication_name=med.name,
                discount=Decimal('0.00'),
                final_price=unit_price,
            )

            StockMovement.objects.create(
                branch=sale.branch,
                medication=med,
                movement_type='sale',
                quantity=-qty,
                previous_stock=previous_stock,
                new_stock=new_stock,
                reference_id=str(sale.id),
                created_by=self.context['request'].user,
            )

            line_subtotal += unit_price * qty
            line_cost += unit_cost * qty
            # Keep in-memory stock accurate for multi-line same-med edge cases
            med.stock = new_stock

        discount_total = Decimal('0.00')
        applied = []
        for discount in discounts:
            _assert_discount_applicable(discount, customer, line_subtotal, medication_ids)
            amount = _compute_discount_amount(discount, line_subtotal)
            discount_total += amount
            applied.append(discount)

        if discount_total > line_subtotal:
            discount_total = line_subtotal

        for discount in applied:
            # Atomic usage increment with limit guard
            qs = Discount.objects.filter(pk=discount.pk)
            if discount.usage_limit is not None:
                updated = qs.filter(current_usage__lt=discount.usage_limit).update(
                    current_usage=F('current_usage') + 1
                )
                if not updated:
                    raise serializers.ValidationError(
                        f"Discount '{discount.name}' has reached its usage limit."
                    )
            else:
                qs.update(current_usage=F('current_usage') + 1)

        if applied:
            sale.applied_discounts.set(applied)

        try:
            from .branching import resolve_branch
            request = self.context.get('request')
            branch = resolve_branch(request, required=True) if request else Branch.get_default()
        except Exception:
            branch = None

        discount_name = ''
        discount_rate = Decimal('0.0000')
        # Prefer branch default percentage discount when no legacy discounts applied
        if not applied and branch is not None:
            default_disc = getattr(branch, 'default_discount', None)
            if default_disc and default_disc.is_active and default_disc.rate > 0:
                discount_rate = Decimal(str(default_disc.rate)).quantize(Decimal('0.0001'))
                discount_total = (line_subtotal * discount_rate).quantize(Decimal('0.01'))
                if discount_total > line_subtotal:
                    discount_total = line_subtotal
                discount_name = default_disc.name or ''

        # Prices are tax-inclusive: customer pays net (subtotal − discount).
        # Tax is the embedded portion: net × rate / (1 + rate).
        net = max(Decimal('0.00'), line_subtotal - discount_total)

        tax_enabled = False
        tax_rate = Decimal('0.0000')
        tax_amount = Decimal('0.00')
        tax_name = ''
        if branch is not None:
            default_tax = getattr(branch, 'default_tax', None)
            if default_tax and default_tax.is_active and default_tax.rate > 0:
                tax_enabled = True
                tax_rate = Decimal(str(default_tax.rate)).quantize(Decimal('0.0001'))
                tax_name = default_tax.name or ''
            elif not default_tax and branch.tax_enabled and Decimal(str(branch.tax_rate or 0)) > 0:
                # Legacy fallback if defaults not migrated yet
                tax_enabled = True
                tax_rate = Decimal(str(branch.tax_rate)).quantize(Decimal('0.0001'))
                tax_name = 'Sales Tax'

        if tax_enabled and tax_rate > 0:
            tax_amount = (net * tax_rate / (Decimal('1') + tax_rate)).quantize(Decimal('0.01'))

        total = net

        sale.subtotal = line_subtotal.quantize(Decimal('0.01'))
        sale.discount_total = discount_total.quantize(Decimal('0.01'))
        sale.discount_name = discount_name
        sale.discount_rate = discount_rate
        sale.tax_enabled = tax_enabled
        sale.tax_name = tax_name
        sale.tax_rate = tax_rate
        sale.tax_amount = tax_amount
        sale.total = total.quantize(Decimal('0.01'))
        sale.total_cost = line_cost.quantize(Decimal('0.01'))
        sale.profit = (sale.total - sale.total_cost).quantize(Decimal('0.01'))
        update_fields = [
            'subtotal', 'discount_total', 'discount_name', 'discount_rate',
            'tax_enabled', 'tax_name', 'tax_rate', 'tax_amount',
            'total', 'total_cost', 'profit',
        ]
        if branch is not None and not sale.branch_id:
            sale.branch = branch
            update_fields.append('branch')
        sale.save(update_fields=update_fields)
        return sale

class PrescriptionSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_category = serializers.CharField(source='medication.category', read_only=True)
    customer_phone = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    
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
        read_only_fields = ('id', 'custom_id', 'created_at', 'updated_at', 'medication_name')

    def get_customer_name(self, obj):
        return obj.patient_name or (obj.customer.name if obj.customer_id else '')

    def get_customer_phone(self, obj):
        return obj.customer.phone if obj.customer_id else ''

    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer_id else ''


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new prescriptions (patient name is free text)."""
    patient_name = serializers.CharField(max_length=255, required=True, allow_blank=False)
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True,
    )

    class Meta:
        model = Prescription
        fields = [
            'patient_name', 'customer', 'medication', 'quantity_prescribed', 'dosage', 'frequency',
            'duration', 'administration_route', 'priority', 'prescribed_by',
            'doctor_license', 'doctor_phone', 'prescribed_date', 'expiry_date',
            'refills_allowed', 'diagnosis', 'allergies', 'special_instructions',
            'notes', 'insurance_provider', 'insurance_number', 'copay_amount',
            'patient_age', 'patient_weight'
        ]

    def validate_patient_name(self, value):
        name = (value or '').strip()
        if not name:
            raise serializers.ValidationError('Patient name is required.')
        return name

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

    def create(self, validated_data):
        validated_data['patient_name'] = validated_data['patient_name'].strip()
        return super().create(validated_data)


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating prescription status and dispensing"""

    class Meta:
        model = Prescription
        fields = [
            'status', 'quantity_dispensed', 'dispensed_date', 'verified_by',
            'digital_signature', 'signed_at', 'notes', 'refills_used'
        ]
        read_only_fields = [
            'verified_by', 'digital_signature', 'signed_at', 'refills_used',
        ]

    def validate_quantity_dispensed(self, value):
        if self.instance and value > self.instance.quantity_prescribed:
            raise serializers.ValidationError(
                "Quantity dispensed cannot exceed quantity prescribed"
            )
        return value


class PrescriptionSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for prescription lists and summaries"""
    customer_name = serializers.SerializerMethodField()
    medication_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'custom_id', 'customer_name', 'patient_name', 'medication_name', 'quantity_prescribed',
            'quantity_dispensed', 'status', 'status_display', 'priority', 'priority_display',
            'prescribed_by', 'prescribed_date', 'expiry_date', 'days_until_expiry',
            'created_at', 'refills_remaining'
        ]
        extra_kwargs = {
            'id': {'read_only': True}
        }

    def get_customer_name(self, obj):
        return obj.patient_name or (obj.customer.name if obj.customer_id else '')



def _normalize_batch_no(batch_number):
    return (batch_number or '').strip()


def _resolve_restock_medication(template, branch, batch_number, expiry_date, unit_cost, supplier):
    """
    Batch-aware target row: find existing (branch, name, batch) or clone a new line.
    """
    batch_no = _normalize_batch_no(batch_number)

    if branch is not None:
        existing = Medication.objects.filter(
            branch=branch,
            name=template.name,
            batch_no=batch_no,
        ).first()
        if existing:
            return existing

    if branch is None or template.branch_id == branch.id:
        if not template.batch_no or template.batch_no == batch_no:
            if batch_no and not template.batch_no:
                template.batch_no = batch_no
            return template

    return Medication.objects.create(
        branch=branch or template.branch,
        name=template.name,
        description=template.description,
        category=template.category,
        classification=template.classification or '',
        dosage=template.dosage or '',
        price=template.price,
        cost=unit_cost,
        stock=0,
        min_stock=template.min_stock,
        expiry=expiry_date,
        supplier=supplier or template.supplier or '',
        batch_no=batch_no,
    )


def _sync_medication_from_restock(med, batch_number, expiry_date, unit_cost, supplier):
    """Keep medication row aligned with the restock shipment."""
    batch_no = _normalize_batch_no(batch_number)
    updates = {}
    if batch_no and med.batch_no != batch_no:
        updates['batch_no'] = batch_no
    if expiry_date and med.expiry != expiry_date:
        updates['expiry'] = expiry_date
    if unit_cost is not None and med.cost != unit_cost:
        updates['cost'] = unit_cost
    if supplier and med.supplier != supplier:
        updates['supplier'] = supplier
    if updates:
        Medication.objects.filter(pk=med.pk).update(**updates)
        for key, val in updates.items():
            setattr(med, key, val)


def _resolve_fefo_medication(med, qty_needed):
    """Pick earliest-expiry batch with enough stock (same branch + product name)."""
    if not med.branch_id:
        return med
    siblings = list(
        Medication.objects.filter(
            branch_id=med.branch_id,
            name=med.name,
            stock__gt=0,
        ).order_by('expiry', 'created_at')
    )
    for candidate in siblings:
        if candidate.stock >= qty_needed:
            return candidate
    return med


class RestockSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)

    class Meta:
        model = Restock
        fields = [
            'id', 'medication', 'medication_name', 'quantity', 'unit_cost',
            'total_cost', 'supplier', 'batch_number', 'expiry_date', 'notes',
            'date_restocked', 'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'date_restocked', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        medication = attrs.get('medication') or getattr(self.instance, 'medication', None)
        if medication and request:
            from .branching import resolve_branch
            branch = resolve_branch(request, required=True)
            if medication.branch_id and medication.branch_id != branch.id:
                raise serializers.ValidationError(
                    {'medication': 'This medication belongs to another branch.'}
                )
        expiry = attrs.get('expiry_date')
        if expiry is None and self.instance:
            expiry = self.instance.expiry_date
        if expiry and expiry < timezone.localdate():
            raise serializers.ValidationError(
                {'expiry_date': 'Expiry date cannot be in the past.'}
            )
        qty = attrs.get('quantity')
        if qty is None and self.instance:
            qty = self.instance.quantity
        if qty is not None and qty <= 0:
            raise serializers.ValidationError(
                {'quantity': 'Quantity must be greater than 0.'}
            )
        return attrs

    def create(self, validated_data):
        from django.db import connection

        template = validated_data['medication']
        qty = validated_data['quantity']
        batch_number = validated_data.get('batch_number', '')
        expiry_date = validated_data['expiry_date']
        unit_cost = validated_data['unit_cost']
        supplier = validated_data.get('supplier', '')
        request = self.context.get('request')
        user = request.user if request else None

        from .branching import resolve_branch
        branch = validated_data.pop('branch', None)
        if branch is None and request:
            branch = resolve_branch(request, required=True)

        target = _resolve_restock_medication(
            template, branch, batch_number, expiry_date, unit_cost, supplier
        )
        validated_data['medication'] = target
        validated_data['medication_name'] = target.name

        if connection.vendor == 'postgresql':
            med = Medication.objects.select_for_update().get(pk=target.pk)
        else:
            med = Medication.objects.get(pk=target.pk)

        previous_stock = med.stock
        Medication.objects.filter(pk=med.pk).update(stock=F('stock') + qty)
        new_stock = previous_stock + qty
        _sync_medication_from_restock(med, batch_number, expiry_date, unit_cost, supplier)

        restock = Restock.objects.create(branch=branch, **validated_data)

        if user and user.is_authenticated:
            StockMovement.objects.create(
                branch=branch,
                medication=med,
                movement_type='restock',
                quantity=qty,
                previous_stock=previous_stock,
                new_stock=new_stock,
                reference_id=str(restock.id),
                created_by=user,
            )
        return restock

    def update(self, instance, validated_data):
        from django.db import connection

        if 'medication' in validated_data:
            validated_data['medication_name'] = validated_data['medication'].name

        request = self.context.get('request')
        user = request.user if request else None
        old_qty = instance.quantity
        old_med_id = instance.medication_id
        new_qty = validated_data.get('quantity', old_qty)
        new_med = validated_data.get('medication', instance.medication)
        diff = new_qty - old_qty

        if connection.vendor == 'postgresql':
            med = Medication.objects.select_for_update().get(pk=new_med.pk)
            if old_med_id != new_med.pk:
                old_med = Medication.objects.select_for_update().get(pk=old_med_id)
            else:
                old_med = med
        else:
            med = Medication.objects.get(pk=new_med.pk)
            old_med = Medication.objects.get(pk=old_med_id) if old_med_id != new_med.pk else med

        if old_med_id != new_med.pk:
            # Revert old medication, apply to new
            if old_med.stock < old_qty:
                raise serializers.ValidationError(
                    f"Cannot move restock: {old_med.name} stock would go negative."
                )
            previous_old = old_med.stock
            Medication.objects.filter(pk=old_med.pk, stock__gte=old_qty).update(
                stock=F('stock') - old_qty
            )
            previous_new = med.stock
            Medication.objects.filter(pk=med.pk).update(stock=F('stock') + new_qty)
            if user and user.is_authenticated:
                StockMovement.objects.create(
                    branch=instance.branch,
                    medication=old_med,
                    movement_type='adjustment',
                    quantity=-old_qty,
                    previous_stock=previous_old,
                    new_stock=previous_old - old_qty,
                    reference_id=str(instance.id),
                    notes='Restock medication changed (revert)',
                    created_by=user,
                )
                StockMovement.objects.create(
                    branch=instance.branch,
                    medication=med,
                    movement_type='restock',
                    quantity=new_qty,
                    previous_stock=previous_new,
                    new_stock=previous_new + new_qty,
                    reference_id=str(instance.id),
                    notes='Restock medication changed (apply)',
                    created_by=user,
                )
        elif diff != 0:
            if diff < 0 and med.stock < abs(diff):
                raise serializers.ValidationError(
                    f"Insufficient stock on {med.name} to reduce this restock by {abs(diff)}."
                )
            previous_stock = med.stock
            if diff < 0:
                updated = Medication.objects.filter(
                    pk=med.pk, stock__gte=abs(diff)
                ).update(stock=F('stock') + diff)
                if not updated:
                    raise serializers.ValidationError(
                        f"Insufficient stock on {med.name} to reduce this restock."
                    )
            else:
                Medication.objects.filter(pk=med.pk).update(stock=F('stock') + diff)
            if user and user.is_authenticated:
                StockMovement.objects.create(
                    branch=instance.branch,
                    medication=med,
                    movement_type='adjustment',
                    quantity=diff,
                    previous_stock=previous_stock,
                    new_stock=previous_stock + diff,
                    reference_id=str(instance.id),
                    notes='Restock quantity updated',
                    created_by=user,
                )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class AuditTrailSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditTrail
        fields = '__all__'
        extra_kwargs = {
            'id': {'read_only': True},
            'timestamp': {'read_only': True}
        }

    def get_user_name(self, obj):
        if not obj.user_id or obj.user is None:
            return None
        return obj.user.full_name or obj.user.username or None

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
class BusinessDaySerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source='opened_by.full_name', read_only=True)
    closed_by_name = serializers.CharField(source='closed_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = BusinessDay
        fields = [
            'id', 'business_date', 'status',
            'opened_at', 'opened_by', 'opened_by_name', 'opening_float', 'open_notes',
            'closed_at', 'closed_by', 'closed_by_name', 'closing_cash', 'close_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields
