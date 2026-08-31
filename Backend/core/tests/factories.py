# Test factories for LizzyMike Pharmacy
import factory
from factory.django import DjangoModelFactory
from datetime import date, timedelta
from decimal import Decimal
import uuid
from django.utils import timezone

from core.models import (
    User, Customer, Medication, Discount, Promotion,
    Prescription, Sale, SaleItem, Restock, AuditTrail,
    StockMovement, FailedLoginAttempt, LockedAccount,
    APIRequestLog, SecurityEvent, Branch,
)


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
    
    id = factory.LazyFunction(uuid.uuid4)
    username = factory.Sequence(lambda n: f'user{n:04d}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@pharmacy.local')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    full_name = factory.Faker('name')
    role = 'staff'
    phone = factory.Faker('phone_number')
    is_active = True


class AdminFactory(UserFactory):
    """Factory for creating admin users."""
    role = 'admin'


class PharmacistFactory(UserFactory):
    """Factory for creating pharmacist users."""
    role = 'pharmacist'


class CustomerFactory(DjangoModelFactory):
    """Factory for creating Customer instances."""
    
    class Meta:
        model = Customer
    
    id = factory.LazyFunction(uuid.uuid4)
    custom_id = factory.Sequence(lambda n: f'CUST{n:06d}')
    name = factory.Faker('name')
    phone = factory.Faker('phone_number')
    email = factory.Faker('email')
    address = factory.Faker('address')
    dob = factory.Faker('date_of_birth', minimum_age=18, maximum_age=80)
    insurance = factory.Sequence(lambda n: f'INS{n:08d}')
    allergies = ''


class MedicationFactory(DjangoModelFactory):
    """Factory for creating Medication instances."""
    
    class Meta:
        model = Medication
    
    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Faker('word')
    description = factory.Faker('sentence')
    category = 'Tablets'
    classification = 'Antibiotics'
    dosage = '500mg'
    price = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    cost = factory.LazyAttribute(lambda obj: Decimal(str(float(obj.price) * 0.6)) if obj.price else Decimal('6.00'))
    stock = factory.Faker('random_int', min=0, max=100)
    min_stock = 10
    expiry = factory.LazyFunction(lambda: date.today() + timedelta(days=365))
    supplier = factory.Faker('company')
    batch_no = factory.Sequence(lambda n: f'BATCH{n:05d}')
    branch = factory.LazyFunction(Branch.get_default)


class DiscountFactory(DjangoModelFactory):
    """Factory for creating Discount instances."""
    
    class Meta:
        model = Discount
    
    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f'Discount {n}')
    type = 'percentage'
    value = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True)
    min_purchase = Decimal('10.00')
    max_discount = Decimal('50.00')
    start_date = factory.LazyFunction(timezone.now)
    end_date = factory.LazyFunction(lambda: timezone.now() + timedelta(days=30))
    is_active = True
    usage_limit = None
    current_usage = 0


class PromotionFactory(DjangoModelFactory):
    """Factory for creating Promotion instances."""
    
    class Meta:
        model = Promotion
    
    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f'Promotion {n}')
    description = factory.Faker('sentence')
    type = 'discount'
    discount = factory.SubFactory(DiscountFactory)
    conditions = factory.LazyFunction(dict)
    start_date = factory.LazyFunction(timezone.now)
    end_date = factory.LazyFunction(lambda: timezone.now() + timedelta(days=30))
    is_active = True


class PrescriptionFactory(DjangoModelFactory):
    """Factory for creating Prescription instances."""
    
    class Meta:
        model = Prescription
    
    id = factory.LazyFunction(uuid.uuid4)
    custom_id = factory.Sequence(lambda n: f'RX{n:06d}')
    customer = factory.SubFactory(CustomerFactory)
    patient_name = factory.LazyAttribute(lambda obj: obj.customer.name)
    patient_age = factory.Faker('random_int', min=18, max=80)
    patient_weight = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True)
    medication = factory.SubFactory(MedicationFactory)
    medication_name = factory.LazyAttribute(lambda obj: obj.medication.name)
    quantity_prescribed = factory.Faker('random_int', min=1, max=10)
    quantity_dispensed = 0
    dosage = '500mg'
    frequency = 'Twice daily'
    duration = '7 days'
    administration_route = 'Oral'
    status = 'pending'
    priority = 'normal'
    prescribed_by = factory.Faker('name')
    doctor_license = factory.Sequence(lambda n: f'DR{n:05d}')
    doctor_phone = factory.Faker('phone_number')
    expiry_date = factory.LazyFunction(lambda: date.today() + timedelta(days=30))
    refills_allowed = factory.Faker('random_int', min=0, max=3)
    refills_used = 0
    diagnosis = factory.Faker('sentence')
    allergies = ''
    special_instructions = ''
    notes = ''
    insurance_provider = factory.Faker('company')
    insurance_number = factory.Sequence(lambda n: f'INS{n:08d}')
    copay_amount = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True)
    created_by = factory.SubFactory(UserFactory)


class SaleFactory(DjangoModelFactory):
    """Factory for creating Sale instances."""
    
    class Meta:
        model = Sale
    
    id = factory.LazyFunction(uuid.uuid4)
    custom_id = factory.Sequence(lambda n: f'SALE{n:08d}')
    customer = factory.SubFactory(CustomerFactory)
    customer_name = factory.LazyAttribute(lambda obj: obj.customer.name)
    subtotal = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    discount_total = Decimal('0.00')
    total = factory.LazyAttribute(lambda obj: obj.subtotal - obj.discount_total)
    total_cost = factory.LazyAttribute(lambda obj: obj.subtotal * Decimal('0.6'))
    profit = factory.LazyAttribute(lambda obj: obj.subtotal - obj.total_cost)
    payment_method = 'cash'
    notes = ''
    loyalty_points_earned = 0


class SaleItemFactory(DjangoModelFactory):
    """Factory for creating SaleItem instances."""
    
    class Meta:
        model = SaleItem
    
    id = factory.LazyFunction(uuid.uuid4)
    sale = factory.SubFactory(SaleFactory)
    medication = factory.SubFactory(MedicationFactory)
    medication_name = factory.LazyAttribute(lambda obj: obj.medication.name)
    qty = factory.Faker('random_int', min=1, max=5)
    price = factory.LazyAttribute(lambda obj: obj.medication.price)
    cost = factory.LazyAttribute(lambda obj: obj.medication.cost)
    discount = Decimal('0.00')
    final_price = factory.LazyAttribute(lambda obj: obj.price * obj.qty - obj.discount)


class RestockFactory(DjangoModelFactory):
    """Factory for creating Restock instances."""
    
    class Meta:
        model = Restock
    
    id = factory.LazyFunction(uuid.uuid4)
    medication = factory.SubFactory(MedicationFactory)
    medication_name = factory.LazyAttribute(lambda obj: obj.medication.name)
    quantity = factory.Faker('random_int', min=10, max=100)
    unit_cost = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    total_cost = factory.LazyAttribute(lambda obj: obj.quantity * obj.unit_cost)
    supplier = factory.Faker('company')
    batch_number = factory.Sequence(lambda n: f'BATCH{n:05d}')
    expiry_date = factory.LazyFunction(lambda: date.today() + timedelta(days=365))
    notes = ''


class AuditTrailFactory(DjangoModelFactory):
    """Factory for creating AuditTrail instances."""
    
    class Meta:
        model = AuditTrail
    
    id = factory.LazyFunction(uuid.uuid4)
    user = factory.SubFactory(UserFactory)
    action = factory.Faker('word')
    entity = factory.Faker('word')
    entity_id = factory.LazyFunction(uuid.uuid4)
    details = factory.LazyFunction(dict)
    ip_address = '127.0.0.1'
    user_agent = factory.Faker('user_agent')
    session_id = factory.LazyFunction(uuid.uuid4)


class StockMovementFactory(DjangoModelFactory):
    """Factory for creating StockMovement instances."""
    
    class Meta:
        model = StockMovement
    
    id = factory.LazyFunction(uuid.uuid4)
    medication = factory.SubFactory(MedicationFactory)
    movement_type = 'sale'
    quantity = factory.Faker('random_int', min=1, max=10)
    previous_stock = factory.Faker('random_int', min=10, max=100)
    new_stock = factory.LazyAttribute(lambda obj: obj.previous_stock - obj.quantity)
    reference_id = factory.LazyFunction(uuid.uuid4)
    notes = ''
    created_by = factory.SubFactory(UserFactory)


class FailedLoginAttemptFactory(DjangoModelFactory):
    """Factory for creating FailedLoginAttempt instances."""
    
    class Meta:
        model = FailedLoginAttempt
    
    username = factory.Faker('user_name')
    ip_address = factory.Faker('ipv4')


class LockedAccountFactory(DjangoModelFactory):
    """Factory for creating LockedAccount instances."""
    
    class Meta:
        model = LockedAccount
    
    username = factory.Faker('user_name')
    locked_at = factory.LazyFunction(timezone.now)
    ip_address = factory.Faker('ipv4')


class APIRequestLogFactory(DjangoModelFactory):
    """Factory for creating APIRequestLog instances."""
    
    class Meta:
        model = APIRequestLog
    
    user = factory.SubFactory(UserFactory)
    username = factory.LazyAttribute(lambda obj: obj.user.username)
    ip_address = factory.Faker('ipv4')
    method = 'GET'
    endpoint = '/api/v1/medications/'
    status_code = 200
    response_time_ms = factory.Faker('random_int', min=10, max=500)


class SecurityEventFactory(DjangoModelFactory):
    """Factory for creating SecurityEvent instances."""
    
    class Meta:
        model = SecurityEvent
    
    event_type = 'login_success'
    user = factory.SubFactory(UserFactory)
    username = factory.LazyAttribute(lambda obj: obj.user.username)
    ip_address = factory.Faker('ipv4')
    endpoint = '/api/v1/token/'
    details = ''
