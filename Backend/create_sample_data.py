#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings')
django.setup()

from core.models import User, Customer, Medication, Sale, SaleItem

def create_sample_data():
    print("Creating sample data...")
    
    # Create a test user if it doesn't exist
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@pharmacy.com',
            'full_name': 'Admin User',
            'role': 'admin'
        }
    )
    if created:
        user.set_password('admin123')
        user.save()
        print("Created admin user")
    
    # Create a test customer
    customer, created = Customer.objects.get_or_create(
        name='John Doe',
        defaults={
            'phone': '+233123456789',
            'email': 'john@example.com',
            'address': 'Accra, Ghana'
        }
    )
    if created:
        print("Created test customer")
    
    # Create some medications
    medications = []
    med_data = [
        {'name': 'Paracetamol 500mg', 'category': 'Pain Relief', 'price': 5.00, 'cost': 3.00, 'stock': 100},
        {'name': 'Amoxicillin 250mg', 'category': 'Antibiotics', 'price': 15.00, 'cost': 10.00, 'stock': 50},
        {'name': 'Vitamin C 1000mg', 'category': 'Vitamins', 'price': 8.00, 'cost': 5.00, 'stock': 75},
        {'name': 'Ibuprofen 400mg', 'category': 'Pain Relief', 'price': 6.00, 'cost': 4.00, 'stock': 60},
        {'name': 'Omeprazole 20mg', 'category': 'Gastrointestinal', 'price': 25.00, 'cost': 18.00, 'stock': 30},
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
                'supplier': 'Pharma Supplier Ltd',
                'batch_no': f'BATCH-{med_info["name"][:3].upper()}-001'
            }
        )
        medications.append(med)
        if created:
            print(f"Created medication: {med.name}")
    
    # Create some sales with different dates
    sales_data = [
        # Today's sales
        {'date': datetime.now(), 'items': [
            {'medication': medications[0], 'qty': 5, 'price': 5.00, 'cost': 3.00},
            {'medication': medications[1], 'qty': 2, 'price': 15.00, 'cost': 10.00},
        ]},
        {'date': datetime.now(), 'items': [
            {'medication': medications[2], 'qty': 3, 'price': 8.00, 'cost': 5.00},
            {'medication': medications[3], 'qty': 4, 'price': 6.00, 'cost': 4.00},
        ]},
        # Yesterday's sales
        {'date': datetime.now() - timedelta(days=1), 'items': [
            {'medication': medications[0], 'qty': 10, 'price': 5.00, 'cost': 3.00},
            {'medication': medications[4], 'qty': 1, 'price': 25.00, 'cost': 18.00},
        ]},
        # Last week's sales
        {'date': datetime.now() - timedelta(days=7), 'items': [
            {'medication': medications[1], 'qty': 3, 'price': 15.00, 'cost': 10.00},
            {'medication': medications[2], 'qty': 2, 'price': 8.00, 'cost': 5.00},
        ]},
        # Last month's sales
        {'date': datetime.now() - timedelta(days=30), 'items': [
            {'medication': medications[0], 'qty': 8, 'price': 5.00, 'cost': 3.00},
            {'medication': medications[3], 'qty': 6, 'price': 6.00, 'cost': 4.00},
        ]},
    ]
    
    for sale_info in sales_data:
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
        
        print(f"Created sale: {sale.id} - {sale.total}")
    
    print(f"\nSample data created successfully!")
    print(f"Total Sales: {Sale.objects.count()}")
    print(f"Total SaleItems: {SaleItem.objects.count()}")
    print(f"Total Medications: {Medication.objects.count()}")
    print(f"Total Customers: {Customer.objects.count()}")

if __name__ == '__main__':
    create_sample_data() 