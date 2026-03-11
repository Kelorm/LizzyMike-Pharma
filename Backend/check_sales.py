#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings')
django.setup()

from core.models import Sale, SaleItem, Medication
from django.utils import timezone
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDay

def check_sales_data():
    print("=== Checking Sales Data ===")
    
    # Check total sales
    total_sales = Sale.objects.count()
    print(f"Total sales in database: {total_sales}")
    
    if total_sales == 0:
        print("❌ No sales found in database!")
        return False
    
    # Check recent sales (last 30 days)
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    recent_sales = Sale.objects.filter(date__gte=thirty_days_ago).count()
    print(f"Sales in last 30 days: {recent_sales}")
    
    # Check today's sales
    today = timezone.now().date()
    today_sales = Sale.objects.filter(date=today).count()
    print(f"Sales today: {today_sales}")
    
    # Check sale items
    total_items = SaleItem.objects.count()
    print(f"Total sale items: {total_items}")
    
    if total_items == 0:
        print("❌ No sale items found!")
        return False
    
    # Check items with qty > 0
    items_with_qty = SaleItem.objects.filter(qty__gt=0).count()
    print(f"Sale items with qty > 0: {items_with_qty}")
    
    # Show some sample sales
    print("\n=== Sample Sales ===")
    sample_sales = Sale.objects.all()[:3]
    for sale in sample_sales:
        print(f"Sale ID: {sale.id}")
        print(f"Date: {sale.date}")
        print(f"Total: {sale.total}")
        print(f"Items: {sale.items.count()}")
        for item in sale.items.all():
            print(f"  - {item.medication_name}: {item.qty} × {item.price}")
        print()
    
    return True

def test_analytics_query():
    print("=== Testing Analytics Query ===")
    
    # Test the same query as the backend
    days = 30
    start_date = timezone.now().date() - timedelta(days=days)
    
    print(f"Querying sales from {start_date} to {timezone.now().date()}")
    
    # Top products by quantity
    top_products = SaleItem.objects.filter(
        sale__date__gte=start_date
    ).values(
        'medication__name', 
        'medication__id',
        'medication__category'
    ).annotate(
        total_sold=Sum('qty'),
        total_revenue=Sum(F('qty') * F('price')),
        total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        avg_price=Sum('price') / Count('id')
    ).order_by('-total_sold')[:6]
    
    print(f"Found {len(top_products)} top products:")
    for i, product in enumerate(top_products):
        print(f"{i+1}. {product['medication__name']}: {product['total_sold']} sold, GHS {product['total_revenue']:.2f}")
    
    return len(top_products) > 0

def create_test_sale():
    print("=== Creating Test Sale ===")
    
    # Check if we have medications
    medications = Medication.objects.all()
    if not medications.exists():
        print("❌ No medications found! Please add some medications first.")
        return False
    
    # Get first medication
    medication = medications.first()
    print(f"Using medication: {medication.name}")
    
    # Create a test sale
    from core.models import Customer
    
    # Get or create a test customer
    customer, created = Customer.objects.get_or_create(
        name="Test Customer",
        defaults={
            'phone': '1234567890',
            'email': 'test@example.com'
        }
    )
    
    # Create sale
    sale = Sale.objects.create(
        customer=customer,
        customer_name=customer.name,
        total=medication.price * 2,
        total_cost=medication.cost * 2,
        profit=(medication.price - medication.cost) * 2,
        subtotal=medication.price * 2,
        discount_total=0,
        payment_method='cash'
    )
    
    # Create sale item
    SaleItem.objects.create(
        sale=sale,
        medication=medication,
        medication_name=medication.name,
        qty=2,
        price=medication.price,
        cost=medication.cost
    )
    
    print(f"✅ Created test sale: {sale.id}")
    print(f"   - Customer: {customer.name}")
    print(f"   - Medication: {medication.name}")
    print(f"   - Quantity: 2")
    print(f"   - Total: GHS {sale.total}")
    
    return True

if __name__ == "__main__":
    print("🔍 Pharmacy Analytics Debug Tool")
    print("=" * 40)
    
    # Check existing data
    has_data = check_sales_data()
    
    if not has_data:
        print("\n❌ No sales data found!")
        response = input("Would you like to create a test sale? (y/n): ")
        if response.lower() == 'y':
            create_test_sale()
            print("\n🔄 Re-checking data...")
            check_sales_data()
    else:
        # Test analytics query
        test_analytics_query()
    
    print("\n✅ Debug complete!") 