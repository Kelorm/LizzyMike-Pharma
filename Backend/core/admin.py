from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Sum, F
from .models import Medication, Customer, Prescription, Sale, SaleItem, Restock, AuditTrail

User = get_user_model()

# ============================================================================
# AUTHENTICATION & AUTHORIZATION
# ============================================================================

class CustomUserAdmin(BaseUserAdmin):
    """Enhanced User Administration with role-based management"""
    
    # Display fields in the user list
    list_display = ('username', 'email', 'full_name', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('username', 'email', 'full_name', 'phone')
    ordering = ('-date_joined',)
    
    # Fieldsets for the user detail/edit page
    fieldsets = (
        ('Authentication', {
            'fields': ('username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'full_name', 'email', 'phone')
        }),
        ('Role & Permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('wide',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    # Fieldsets for adding a new user
    add_fieldsets = (
        ('Authentication', {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Personal Information', {
            'classes': ('wide',),
            'fields': ('full_name', 'phone'),
        }),
        ('Role Assignment', {
            'classes': ('wide',),
            'fields': ('role', 'is_active', 'is_staff'),
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()

class AuditTrailAdmin(admin.ModelAdmin):
    """Audit Trail for tracking user actions"""
    list_display = ('timestamp', 'user', 'action', 'entity', 'entity_id', 'ip_address')
    list_filter = ('action', 'entity', 'timestamp', 'user')
    search_fields = ('user__username', 'action', 'entity', 'entity_id', 'ip_address')
    readonly_fields = ('timestamp', 'user', 'action', 'entity', 'entity_id', 'details', 'ip_address', 'user_agent', 'session_id')
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False  # Audit trails should not be manually created
    
    def has_change_permission(self, request, obj=None):
        return False  # Audit trails should not be modified
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superusers can delete audit trails

# Register Authentication & Authorization models
admin.site.register(User, CustomUserAdmin)
admin.site.register(AuditTrail, AuditTrailAdmin)

# Unregister the default Group admin and register with custom settings
admin.site.unregister(Group)

@admin.register(Group)
class CustomGroupAdmin(admin.ModelAdmin):
    """Enhanced Group Administration for role-based permissions"""
    list_display = ('name', 'user_count')
    search_fields = ('name',)
    filter_horizontal = ('permissions',)
    
    def user_count(self, obj):
        return obj.user_set.count()
    user_count.short_description = 'Number of Users'

# ============================================================================
# PHARMACY MANAGEMENT
# ============================================================================

@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'expiry']  # Removed 'batch_no'
    search_fields = ['name', 'category']
    list_filter = ['category', 'expiry']

class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'insurance']
    search_fields = ['name', 'phone', 'email', 'insurance']
    list_filter = ['insurance']

admin.site.register(Customer, CustomerAdmin)

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = [
        'customer', 'medication', 'dosage', 'frequency', 'duration', 'status', 'prescribed_by', 'prescribed_date', 'expiry_date'
    ]  # Removed 'patient', 'quantity', 'date', 'doctor_name'
    ordering = ['-created_at']  # Use valid field
    list_filter = ['status', 'prescribed_by', 'prescribed_date']  # Removed 'date', 'doctor_name'
    search_fields = ['customer__name', 'medication__name', 'prescribed_by']

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    readonly_fields = ('total_price',)
    
    def total_price(self, instance):
        return instance.quantity * instance.medication.price
    total_price.short_description = 'Total'

class SaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'customer', 'total_annotated', 'payment_method', 'receipt_link', 'invoice_link')
    list_filter = ('date', 'payment_method')
    search_fields = ('customer__name', 'id')
    inlines = [SaleItemInline]
    ordering = ('-date',)
    actions = ['generate_receipts', 'generate_invoices']
    
    def total_annotated(self, obj):
        return f"${obj.total_annotated:.2f}"
    total_annotated.short_description = 'Total'
    
    def receipt_link(self, obj):
        url = reverse('receipt-direct', args=[obj.id])
        return format_html('<a href="{}" target="_blank" class="button">Receipt</a>', url)
    receipt_link.short_description = 'Receipt'
    
    def invoice_link(self, obj):
        url = reverse('sale-invoice', args=[obj.id])
        return format_html('<a href="{}" target="_blank" class="button">Invoice</a>', url)
    invoice_link.short_description = 'Invoice'
    
    @admin.action(description='Generate receipts for selected sales')
    def generate_receipts(self, request, queryset):
        for sale in queryset:
            # Add your receipt generation logic here
            pass
        self.message_user(request, f"Receipts generated for {queryset.count()} sales")
    
    @admin.action(description='Generate invoices for selected sales')
    def generate_invoices(self, request, queryset):
        for sale in queryset:
            # Add your invoice generation logic here
            pass
        self.message_user(request, f"Invoices generated for {queryset.count()} sales")
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            total_annotated=Sum(F('items__qty') * F('items__medication__price'))
        )

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        # Removed unused Sale.objects.get and exception handling, as sale is not used
        extra_context['receipt_url'] = reverse('receipt-direct', args=[object_id])
        extra_context['invoice_url'] = reverse('sale-invoice', args=[object_id])
        return super().change_view(request, object_id, form_url, extra_context=extra_context)

admin.site.register(Sale, SaleAdmin)

class SaleItemAdmin(admin.ModelAdmin):
    list_display = ('sale', 'medication', 'qty', 'unit_price', 'total_price')  # Changed 'quantity' to 'qty'
    list_filter = ('medication__category',)
    search_fields = ('sale__id', 'medication__name')
    
    def unit_price(self, obj):
        return obj.price  # Use the stored price at time of sale
    
    def total_price(self, obj):
        return obj.qty * obj.price  # Use qty and stored price
    
    unit_price.short_description = 'Unit Price'
    total_price.short_description = 'Total Price'

admin.site.register(SaleItem, SaleItemAdmin)

@admin.register(Restock)
class RestockAdmin(admin.ModelAdmin):
    list_display = ['medication_name', 'supplier', 'quantity', 'unit_cost', 'total_cost', 'batch_number', 'expiry_date', 'date_restocked']
    list_filter = ['supplier', 'date_restocked', 'expiry_date']
    search_fields = ['medication_name', 'supplier', 'batch_number']
    readonly_fields = ['id', 'total_cost', 'date_restocked', 'created_at', 'updated_at']
    date_hierarchy = 'date_restocked'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('medication', 'medication_name', 'quantity', 'unit_cost', 'total_cost')
        }),
        ('Supplier Information', {
            'fields': ('supplier', 'batch_number', 'expiry_date')
        }),
        ('Additional Information', {
            'fields': ('notes', 'date_restocked', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

# Admin site customization is now handled in apps.py