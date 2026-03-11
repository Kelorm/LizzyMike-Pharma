import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from decimal import Decimal
from django.utils import timezone
import random
import string

def generate_unique_id(prefix, model_class):
    """Generate a unique ID with prefix and timestamp"""
    while True:
        # Generate timestamp part (YYMMDD)
        now = timezone.now()
        timestamp = now.strftime('%y%m%d')
        
        # Generate random part (4 characters)
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
        # Combine: PREFIX + YYMMDD + RANDOM
        unique_id = f"{prefix}{timestamp}{random_part}"
        
        # Check if this ID already exists
        if not model_class.objects.filter(custom_id=unique_id).exists():
            return unique_id

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

    def __str__(self):
        return self.full_name or self.username

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
        if not self.custom_id:
            self.custom_id = generate_unique_id('CUST', Customer)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.custom_id} - {self.name}"

class Medication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=10)
    expiry = models.DateField()
    supplier = models.CharField(max_length=255, blank=True, null=True)
    batch_no = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    
    # Patient Information
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='prescriptions')
    patient_name = models.CharField(max_length=255, default='')  # Denormalized for quick access
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    patient_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    
    # Medication Information
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='prescriptions')
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
        if not self.custom_id:
            self.custom_id = generate_unique_id('RX', Prescription)
        
        # Auto-populate denormalized fields
        if self.customer:
            self.patient_name = self.customer.name
        if self.medication:
            self.medication_name = self.medication.name
            
        super().save(*args, **kwargs)
    
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
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.custom_id:
            self.custom_id = generate_unique_id('SALE', Sale)
        super().save(*args, **kwargs)

    def calculate_total(self):
        return sum(item.price * item.qty for item in self.items.all())

    def __str__(self):
        return f"{self.custom_id} - {self.customer_name}"

class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE)
    medication_name = models.CharField(max_length=255)
    qty = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} x {self.qty}"

class Restock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='restocks')
    medication_name = models.CharField(max_length=255)  # Denormalized for easy querying
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
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
        self.total_cost = self.quantity * self.unit_cost

        if self.pk is None or not Restock.objects.filter(pk=self.pk).exists():
            # New restock
            self.medication.stock += self.quantity
        else:
            # Updating existing restock
            old = Restock.objects.get(pk=self.pk)
            diff = self.quantity - old.quantity
            self.medication.stock += diff

        self.medication.save()
        super().save(*args, **kwargs)

class AuditTrail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
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