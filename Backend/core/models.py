import uuid
from django.db import models, IntegrityError
from django.db.models import F
from django.contrib.auth.models import AbstractUser
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
import random
import string
import logging

logger = logging.getLogger(__name__)

def generate_unique_id(prefix: str, random_length: int = 8) -> str:
    """
    Generate a human-readable ID of the form ``PREFIX + YYMMDD + RANDOM``.

    The random segment is 8 characters (62^8 ≈ 218 trillion combinations),
    making accidental collisions negligible.  The *database unique constraint*
    is the authoritative collision guard; callers must catch ``IntegrityError``
    and retry (see ``_save_with_unique_id`` helper below).
    """
    timestamp = timezone.now().strftime('%y%m%d')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=random_length))
    return f"{prefix}{timestamp}{random_part}"


def _save_with_unique_id(instance, prefix, save_kwargs, max_attempts=10):
    """
    Save *instance* with a generated ``custom_id``, retrying up to
    *max_attempts* times on an ``IntegrityError`` collision.
    """
    for attempt in range(max_attempts):
        if not instance.custom_id:
            instance.custom_id = generate_unique_id(prefix)
        try:
            # Call the grandparent save (Model.save) directly to avoid
            # infinite recursion when called from a child's save().
            super(type(instance), instance).save(**save_kwargs)
            return
        except IntegrityError:
            if attempt == max_attempts - 1:
                logger.error(
                    "Could not generate unique %s ID after %d attempts.",
                    prefix, max_attempts,
                )
                raise
            instance.custom_id = None  # force regeneration on next loop

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, choices=[
        ('admin', 'Admin'),
        ('pharmacist', 'Pharmacist'),
        ('staff', 'Staff'),
    ], default='staff')
    phone = models.CharField(max_length=20, blank=True)
    branches = models.ManyToManyField(
        'Branch',
        related_name='users',
        blank=True,
        help_text='Branches this user can access (admins may access all).',
    )

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='core_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='core_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
    )

    def __str__(self):
        return self.full_name or self.username


class TaxRate(models.Model):
    """Named sales tax rate (shared catalog; branches pick a default)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0000'),
        help_text='Fractional rate, e.g. 0.03 = 3%',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.rate})"


class DiscountRate(models.Model):
    """Named percentage discount (shared catalog; branches pick a default)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0000'),
        help_text='Fractional rate, e.g. 0.10 = 10%',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.rate})"


class Branch(models.Model):
    """Pharmacy location / branch with its own inventory, sales, and tax settings."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    license_no = models.CharField(max_length=100, blank=True, default='')
    address = models.TextField(blank=True, default='')
    tax_enabled = models.BooleanField(default=True)
    tax_rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0300'),
        help_text='Fractional rate, e.g. 0.03 = 3% (legacy; prefer default_tax)',
    )
    default_tax = models.ForeignKey(
        'TaxRate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='branches_as_default_tax',
    )
    default_discount = models.ForeignKey(
        'DiscountRate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='branches_as_default_discount',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Branches'

    def __str__(self):
        return f"{self.code} — {self.name}"

    @classmethod
    def get_default(cls):
        branch = cls.objects.filter(is_active=True).order_by('created_at').first()
        if branch:
            return branch
        return cls.objects.create(
            code='HQ',
            name='LizzyMike Pharmacy',
            is_active=True,
        )

class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    custom_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    insurance = models.CharField(max_length=100, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.custom_id:
            super().save(*args, **kwargs)
        else:
            _save_with_unique_id(self, 'CUST', kwargs)

    def __str__(self):
        return f"{self.custom_id} - {self.name}"

class Medication(models.Model):
    CATEGORY_CHOICES = [
        ('Herbal', 'Herbal'),
        ('Suspension', 'Suspension'),
        ('Syrup', 'Syrup'),
        ('Tablets', 'Tablets'),
        ('Soluble', 'Soluble'),
        ('Capsules', 'Capsules'),
        ('Ointment', 'Ointment'),
        ('Drops', 'Drops'),
        ('Inhaler', 'Inhaler'),
        ('Gel and cream', 'Gel and cream'),
        ('Antiseptics', 'Antiseptics'),
        ('Oil', 'Oil'),
        ('Contraceptives', 'Contraceptives'),
        ('Infusion', 'Infusion'),
        ('Injectables', 'Injectables'),
    ]
    CLASSIFICATION_CHOICES = [
        ('Antibiotics', 'Antibiotics'),
        ('Antifungals', 'Antifungals'),
        ('Antidiabetic', 'Antidiabetic'),
        ('Pain reliever', 'Pain reliever'),
        ('Antihistamine & allergy', 'Antihistamine & allergy'),
        ('Cardiovascular medications', 'Cardiovascular medications'),
        ('Antidepressants', 'Antidepressants'),
        ('Respiratory medications', 'Respiratory medications'),
        ('Sleep aids', 'Sleep aids'),
        ('Hormonal medications', 'Hormonal medications'),
        ('Gastrointestinal medication', 'Gastrointestinal medication'),
        ('Anticoagulants', 'Anticoagulants'),
        ('Anticonvulsants', 'Anticonvulsants'),
        ('Antipsychotics', 'Antipsychotics'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='medications', null=True, blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    # Free-text category / classification (defaults listed in CATEGORY_CHOICES / CLASSIFICATION_CHOICES)
    category = models.CharField(max_length=100)
    classification = models.CharField(max_length=100, blank=True, default='')
    dosage = models.CharField(max_length=255, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=10)
    expiry = models.DateField()
    supplier = models.CharField(max_length=255, blank=True, null=True)
    # Empty string (not NULL) so unique(name, batch_no) cannot duplicate null batches.
    batch_no = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['branch', 'name', 'batch_no'],
                name='unique_medication_branch_name_batch',
            )
        ]

    def save(self, *args, **kwargs):
        if self.batch_no is None:
            self.batch_no = ''
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Discount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=[
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
        ('buy_x_get_y', 'Buy X Get Y'),
    ])
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    applicable_medications = models.ManyToManyField(Medication, blank=True)
    applicable_customers = models.ManyToManyField(Customer, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    usage_limit = models.IntegerField(null=True, blank=True)
    current_usage = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Promotion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=[
        ('discount', 'Discount'),
        ('free_shipping', 'Free Shipping'),
        ('buy_x_get_y', 'Buy X Get Y'),
        ('loyalty_points', 'Loyalty Points'),
    ])
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE, null=True, blank=True)
    conditions = models.JSONField(default=dict)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Prescription(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready for Pickup'),
        ('dispensed', 'Dispensed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    custom_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='prescriptions', null=True, blank=True,
    )

    # Patient Information — name is free text; linked customer is optional
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, related_name='prescriptions', null=True, blank=True,
    )
    patient_name = models.CharField(max_length=255, default='')  # Primary display name
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    patient_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    
    # Medication Information
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT, related_name='prescriptions')
    medication_name = models.CharField(max_length=255, default='')  # Denormalized for quick access
    quantity_prescribed = models.PositiveIntegerField(default=1)
    quantity_dispensed = models.PositiveIntegerField(default=0)
    
    # Dosage Information
    dosage = models.CharField(max_length=100, default='', help_text="e.g., 500mg")
    frequency = models.CharField(max_length=100, default='', help_text="e.g., Twice daily")
    duration = models.CharField(max_length=100, default='', help_text="e.g., 7 days")
    administration_route = models.CharField(max_length=50, default='Oral', help_text="e.g., Oral, Topical, Injection")
    
    # Prescription Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    
    # Doctor Information
    prescribed_by = models.CharField(max_length=255, default='', help_text="Doctor's name")
    doctor_license = models.CharField(max_length=100, blank=True, null=True)
    doctor_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Dates
    prescribed_date = models.DateField(auto_now_add=True)
    expiry_date = models.DateField()
    dispensed_date = models.DateTimeField(null=True, blank=True)
    
    # Refill Information
    refills_allowed = models.PositiveIntegerField(default=0)
    refills_used = models.PositiveIntegerField(default=0)
    
    # Digital Signature & Verification
    digital_signature = models.TextField(blank=True, null=True, help_text="Base64 encoded signature")
    signed_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_prescriptions')
    
    # Additional Information
    diagnosis = models.CharField(max_length=500, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True, help_text="Patient allergies")
    special_instructions = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Insurance Information
    insurance_provider = models.CharField(max_length=255, blank=True, null=True)
    insurance_number = models.CharField(max_length=100, blank=True, null=True)
    copay_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # System Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_prescriptions')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['prescribed_date']),
            models.Index(fields=['customer', 'status']),
        ]
    
    def save(self, *args, **kwargs):
        # Prefer explicitly set patient_name; fall back to linked customer
        if self.customer and not (self.patient_name or '').strip():
            self.patient_name = self.customer.name
        if self.medication:
            self.medication_name = self.medication.name

        if self.custom_id:
            super().save(*args, **kwargs)
        else:
            _save_with_unique_id(self, 'RX', kwargs)
    
    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now().date() > self.expiry_date
    
    @property
    def refills_remaining(self):
        return max(0, self.refills_allowed - self.refills_used)
    
    @property
    def can_refill(self):
        return self.refills_remaining > 0 and not self.is_expired and self.status == 'completed'
    
    @property
    def days_until_expiry(self):
        from django.utils import timezone
        delta = self.expiry_date - timezone.now().date()
        return delta.days
    
    def __str__(self):
        return f"{self.custom_id or self.id} - {self.patient_name} - {self.medication_name}"

class Sale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    custom_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='sales', null=True, blank=True,
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, null=True, blank=True, related_name='sales'
    )
    customer_name = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_name = models.CharField(max_length=255, blank=True, default='')
    discount_rate = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('0.0000'))
    tax_enabled = models.BooleanField(default=False)
    tax_name = models.CharField(max_length=255, blank=True, default='')
    tax_rate = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('0.0000'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('insurance', 'Insurance'),
        ('insurance-copay', 'Insurance Copay'),
    ])
    notes = models.TextField(blank=True, null=True)
    applied_discounts = models.ManyToManyField(Discount, blank=True)
    loyalty_points_earned = models.IntegerField(default=0)
    business_day = models.ForeignKey(
        'BusinessDay',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales',
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.custom_id:
            super().save(*args, **kwargs)
        else:
            _save_with_unique_id(self, 'SALE', kwargs)

    def calculate_subtotal(self):
        """Line subtotal from unit final_price * qty (server-authoritative)."""
        return sum(
            (item.final_price or item.price) * item.qty
            for item in self.items.all()
        )

    def calculate_total(self):
        """Grand total after sale-level discount_total."""
        subtotal = self.calculate_subtotal()
        return max(Decimal('0'), subtotal - (self.discount_total or Decimal('0')))

    def __str__(self):
        return f"{self.custom_id} - {self.customer_name}"

class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT)
    medication_name = models.CharField(max_length=255)
    qty = models.PositiveIntegerField()  # cannot sell a negative quantity
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} x {self.qty}"

class Restock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='restocks', null=True, blank=True,
    )
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='restocks')
    medication_name = models.CharField(max_length=255)  # Denormalized for easy querying
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    # ``date_restocked`` is the canonical public timestamp; ``created_at`` mirrors it for
    # DB rows that still carry the legacy column from early migrations.
    date_restocked = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_restocked']
        verbose_name = 'Restock'
        verbose_name_plural = 'Restocks'

    def __str__(self):
        return f"{self.medication_name} - {self.quantity} units - {self.supplier}"

    def save(self, *args, **kwargs):
        # Stock mutations happen in RestockSerializer (transactional + ledger).
        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)

class AuditTrail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    # SET_NULL preserves audit history when a staff account is deleted.
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    entity = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} {self.entity}"

class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='stock_movements', null=True, blank=True,
    )
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=20, choices=[
        ('sale', 'Sale'),
        ('restock', 'Restock'),
        ('adjustment', 'Adjustment'),
        ('expiry', 'Expiry'),
    ])
    quantity = models.IntegerField()
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.medication.name} - {self.movement_type} ({self.quantity})"


# =============================================================================
# SECURITY MODELS
# =============================================================================

class FailedLoginAttempt(models.Model):
    """Track failed login attempts for rate limiting and lockout."""
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    attempt_time = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['username', 'attempt_time']),
            models.Index(fields=['ip_address', 'attempt_time']),
        ]
    
    def __str__(self):
        return f"{self.username} from {self.ip_address} at {self.attempt_time}"


class LockedAccount(models.Model):
    """Track locked accounts due to failed login attempts."""
    username = models.CharField(max_length=150, unique=True)
    locked_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Lockout settings
    LOCKOUT_DURATION_MINUTES = 30
    
    def expires_at(self):
        return self.locked_at + timedelta(minutes=self.LOCKOUT_DURATION_MINUTES)
    
    def is_expired(self):
        return timezone.now() >= self.expires_at()
    
    def __str__(self):
        return f"{self.username} locked at {self.locked_at}"


class APIRequestLog(models.Model):
    """Log all API requests for audit trail and rate limiting."""
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='api_logs'
    )
    username = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField()
    method = models.CharField(max_length=10)
    endpoint = models.CharField(max_length=500)
    status_code = models.IntegerField(null=True)
    response_time_ms = models.IntegerField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['endpoint', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} by {self.username} from {self.ip_address}"


class SecurityEvent(models.Model):
    """Track security-related events."""
    EVENT_TYPES = [
        ('login_success', 'Successful Login'),
        ('login_failed', 'Failed Login'),
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('invalid_token', 'Invalid Token'),
        ('unauthorized_access', 'Unauthorized Access'),
    ]
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    username = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    endpoint = models.CharField(max_length=500, blank=True)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.event_type} by {self.username} at {self.timestamp}"
class BusinessDay(models.Model):
    """Trading day opened by admin; staff must have an open day to create sales."""

    STATUS_OPEN = 'open'
    STATUS_CLOSED = 'closed'
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_CLOSED, 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        'Branch', on_delete=models.PROTECT, related_name='business_days', null=True, blank=True,
    )
    business_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)

    opened_at = models.DateTimeField()
    opened_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='opened_business_days'
    )
    opening_float = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00')
    )
    open_notes = models.TextField(blank=True, default='')

    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_business_days',
    )
    closing_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    close_notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-business_date', '-opened_at']
        constraints = [
            models.UniqueConstraint(
                fields=['branch', 'business_date'],
                name='unique_business_day_per_branch',
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'business_date']),
            models.Index(fields=['branch', 'status']),
        ]

    def __str__(self):
        return f"{self.business_date} ({self.status})"

    @classmethod
    def get_open_day(cls, branch=None):
        qs = cls.objects.filter(status=cls.STATUS_OPEN)
        if branch is not None:
            qs = qs.filter(branch=branch)
        return qs.first()


class PharmacyProfile(models.Model):
    """
    Deprecated singleton shim — identity/tax live on Branch.
    Kept temporarily so older imports/migrations resolve; prefer Branch.
    """

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    name = models.CharField(max_length=255, default='LizzyMike Pharmacy')
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    license_no = models.CharField(max_length=100, blank=True, default='')
    address = models.TextField(blank=True, default='')
    tax_enabled = models.BooleanField(default=True)
    tax_rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0300'),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pharmacy profile'
        verbose_name_plural = 'Pharmacy profile'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        """Compatibility: sync from / return default Branch as a profile-like object."""
        branch = Branch.get_default()
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                'name': branch.name,
                'phone': branch.phone,
                'email': branch.email,
                'license_no': branch.license_no,
                'address': branch.address,
                'tax_enabled': branch.tax_enabled,
                'tax_rate': branch.tax_rate,
            },
        )
        # Keep shim in sync with default branch for legacy callers
        changed = False
        for field in ('name', 'phone', 'email', 'license_no', 'address', 'tax_enabled', 'tax_rate'):
            if getattr(obj, field) != getattr(branch, field):
                setattr(obj, field, getattr(branch, field))
                changed = True
        if changed:
            obj.save()
        return obj
