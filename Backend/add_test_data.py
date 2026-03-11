#!/usr/bin/env python
import os
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings')
django.setup()

from core.models import User, Customer, Medication, Sale, SaleItem

def add_test_data():
    print("Adding test data for Top Products...")
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@pharmacy.com',
            'full_name': 'Test User',
            'role': 'pharmacist'
        }
    )
    if created:
        user.set_password('test123')
        user.save()
        print("✓ Created test user")
    
    # Create test customer
    customer, created = Customer.objects.get_or_create(
        name='Test Customer',
        defaults={
            'phone': '+233123456789',
            'email': 'customer@test.com',
            'address': 'Test Address'
        }
    )
    if created:
        print("✓ Created test customer")
    
    # Create test medications
    medications = []
    med_data = [
        {'name': 'Paracetamol 500mg', 'category': 'Pain Relief', 'price': 5.00, 'cost': 3.00, 'stock': 100},
        {'name': 'Amoxicillin 250mg', 'category': 'Antibiotics', 'price': 15.00, 'cost': 10.00, 'stock': 50},
        {'name': 'Vitamin C 1000mg', 'category': 'Vitamins', 'price': 8.00, 'cost': 5.00, 'stock': 75},
        {'name': 'Ibuprofen 400mg', 'category': 'Pain Relief', 'price': 6.00, 'cost': 4.00, 'stock': 60},
    ]
    
    for med_info in med_data:
        med, created = Medication.objects.get_or_create(
            name=med_info['name'],
            defaults={
                'category': med_info['category'],
                'price': med_info['price'],
                'cost': med_info['cost'],
                'stock': med_info['stock'],
                'min_stock': 10,
                'expiry': datetime.now().date() + timedelta(days=365),
                'supplier': 'Test Supplier',
                'batch_no': f'TEST-{med_info["name"][:3].upper()}-001'
            }
        )
        medications.append(med)
        if created:
            print(f"✓ Created medication: {med.name}")
    
    # Create test sales
    sales_data = [
        # Today
        {'date': datetime.now(), 'items': [
            {'medication': medications[0], 'qty': 10, 'price': 5.00, 'cost': 3.00},
            {'medication': medications[1], 'qty': 5, 'price': 15.00, 'cost': 10.00},
        ]},
        {'date': datetime.now(), 'items': [
            {'medication': medications[2], 'qty': 8, 'price': 8.00, 'cost': 5.00},
            {'medication': medications[3], 'qty': 12, 'price': 6.00, 'cost': 4.00},
        ]},
        # Yesterday
        {'date': datetime.now() - timedelta(days=1), 'items': [
            {'medication': medications[0], 'qty': 15, 'price': 5.00, 'cost': 3.00},
            {'medication': medications[2], 'qty': 6, 'price': 8.00, 'cost': 5.00},
        ]},
        # Last week
        {'date': datetime.now() - timedelta(days=7), 'items': [
            {'medication': medications[1], 'qty': 3, 'price': 15.00, 'cost': 10.00},
            {'medication': medications[3], 'qty': 9, 'price': 6.00, 'cost': 4.00},
        ]},
    ]
    
    for i, sale_info in enumerate(sales_data):
        # Calculate totals
        subtotal = sum(item['qty'] * item['price'] for item in sale_info['items'])
        total_cost = sum(item['qty'] * item['cost'] for item in sale_info['items'])
        profit = subtotal - total_cost
        
        # Create sale
        sale = Sale.objects.create(
            customer=customer,
            customer_name=customer.name,
            date=sale_info['date'],
            subtotal=subtotal,
            total=subtotal,
            total_cost=total_cost,
            profit=profit,
            payment_method='cash'
        )
        
        # Create sale items
        for item_info in sale_info['items']:
            SaleItem.objects.create(
                sale=sale,
                medication=item_info['medication'],
                medication_name=item_info['medication'].name,
                qty=item_info['qty'],
                price=item_info['price'],
                cost=item_info['cost']
            )
        
        print(f"✓ Created sale {i+1}: GHS {sale.total}")
    
    print(f"\n✅ Test data created successfully!")
    print(f"📊 Total Sales: {Sale.objects.count()}")
    print(f"📦 Total SaleItems: {SaleItem.objects.count()}")
    print(f"💊 Total Medications: {Medication.objects.count()}")
    print(f"👥 Total Customers: {Customer.objects.count()}")

if __name__ == '__main__':
    add_test_data() 