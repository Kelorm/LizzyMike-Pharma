"""
Tests for sales views.

Covers:
- Creating a valid sale
- Sale reduces stock correctly
- Cannot sell more than stock available
- Sale is recorded in audit trail
- Unauthenticated user cannot create sale
"""
import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status

from core.models import Sale, SaleItem, StockMovement, AuditTrail
from core.tests.factories import (
    CustomerFactory, MedicationFactory, SaleFactory, SaleItemFactory
)


pytestmark = [
    pytest.mark.django_db(transaction=True),
    pytest.mark.usefixtures('open_business_day'),
]


# =============================================================================
# Sale Creation Tests
# =============================================================================

class TestSaleCreation:
    """Test cases for creating sales."""

    def test_create_valid_sale(self, pharmacist_client, customer, medication):
        """Test that a valid sale can be created."""
        data = {
            'customer': str(customer.id),
            'customer_name': customer.name,
            'payment_method': 'cash',
            'items': [
                {
                    'medication': str(medication.id),
                    'qty': 2,
                }
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        # Print response for debugging
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        
        assert response.status_code == status.HTTP_201_CREATED, f"Expected 201, got {response.status_code}: {response.data}"
        assert response.data['customer'] == str(customer.id)
        assert len(response.data['items']) == 1

    def test_create_sale_with_multiple_items(self, pharmacist_client, customer):
        """Test that a sale with multiple items can be created."""
        med1 = MedicationFactory(stock=50, price=10.00)
        med2 = MedicationFactory(stock=30, price=15.00)
        
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(med1.id), 'qty': 2},
                {'medication': str(med2.id), 'qty': 1},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['items']) == 2

    def test_sale_calculates_totals_correctly(self, pharmacist_client, customer, medication):
        """Test that sale totals are calculated correctly."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'card',
            'items': [
                {'medication': str(medication.id), 'qty': 3},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify totals
        expected_total = medication.price * 3
        assert Decimal(response.data['subtotal']) == expected_total
        assert Decimal(response.data['total']) == expected_total

    def test_create_sale_with_discount(self, pharmacist_client, customer, medication):
        """Test that a sale with discount is created correctly."""
        from core.models import Discount
        from core.tests.factories import DiscountFactory
        
        discount = DiscountFactory(
            type='percentage',
            value=Decimal('10.00'),
            is_active=True
        )
        
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 2},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED


# =============================================================================
# Stock Reduction Tests
# =============================================================================

class TestStockReduction:
    """Test cases for stock reduction on sale."""

    def test_sale_reduces_stock_correctly(self, pharmacist_client, customer, medication):
        """Test that sale reduces medication stock correctly."""
        initial_stock = medication.stock
        
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 5},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Refresh from database
        medication.refresh_from_db()
        
        assert medication.stock == initial_stock - 5

    def test_stock_movement_recorded_for_sale(self, pharmacist_client, customer, medication):
        """Test that stock movement is recorded when sale is created."""
        initial_stock = medication.stock
        
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 3},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Check stock movement was created
        movements = StockMovement.objects.filter(
            medication=medication,
            movement_type='sale'
        )
        
        assert movements.exists()
        movement = movements.first()
        assert movement.quantity == -3
        assert movement.previous_stock == initial_stock
        assert movement.new_stock == initial_stock - 3


# =============================================================================
# Insufficient Stock Tests
# =============================================================================

class TestInsufficientStock:
    """Test cases for insufficient stock scenarios."""

    def test_cannot_sell_more_than_stock_available(self, pharmacist_client, customer, medication):
        """Test that sale fails when trying to sell more than available stock."""
        # Ensure medication has limited stock
        medication.stock = 10
        medication.save()
        
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 15},  # More than stock
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        # Should fail with 400 Bad Request
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_sell_zero_quantity(self, pharmacist_client, customer, medication):
        """Test that sale fails with zero quantity."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 0},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_sell_negative_quantity(self, pharmacist_client, customer, medication):
        """Test that sale fails with negative quantity."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': -1},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# Audit Trail Tests
# =============================================================================

class TestSaleAuditTrail:
    """Test cases for sale audit trail."""

    def test_sale_is_recorded_in_audit_trail(self, pharmacist_client, customer, medication, pharmacist):
        """Test that sale creation is recorded in audit trail."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 2},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Check audit trail
        sale_id = response.data['id']
        audit_entries = AuditTrail.objects.filter(
            entity='sale',
            entity_id=sale_id
        )
        
        assert audit_entries.exists()
        
        # Should have create action
        create_entry = audit_entries.filter(action='create').first()
        assert create_entry is not None


# =============================================================================
# Authentication Tests
# =============================================================================

class TestSaleAuthentication:
    """Test cases for sale authentication."""

    def test_unauthenticated_user_cannot_create_sale(self, api_client, customer, medication):
        """Test that unauthenticated user cannot create sale."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 2},
            ]
        }
        
        response = api_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_regular_user_can_create_sale(self, authenticated_client, customer, medication):
        """Staff (counter) may create sales for POS."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 2},
            ]
        }

        response = authenticated_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_pharmacist_can_create_sale(self, pharmacist_client, customer, medication):
        """Test that pharmacist can create sale."""
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'items': [
                {'medication': str(medication.id), 'qty': 2},
            ]
        }
        
        response = pharmacist_client.post(
            '/api/v1/sales/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED


# =============================================================================
# Sale Retrieval Tests
# =============================================================================

class TestSaleRetrieval:
    """Test cases for retrieving sales."""

    def test_list_sales(self, authenticated_client, sale):
        """Test that authenticated user can list sales."""
        response = authenticated_client.get('/api/v1/sales/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1

    def test_retrieve_sale(self, authenticated_client, sale):
        """Test that authenticated user can retrieve a specific sale."""
        response = authenticated_client.get(f'/api/v1/sales/{sale.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(sale.id)

    def test_unauthenticated_user_cannot_list_sales(self, api_client):
        """Test that unauthenticated user cannot list sales."""
        response = api_client.get('/api/v1/sales/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# Sale Summary Tests
# =============================================================================

class TestSaleSummary:
    """Test cases for sale summary endpoints."""

    def test_daily_summary(self, pharmacist_client, sale):
        """Test daily summary endpoint."""
        response = pharmacist_client.get('/api/v1/sales/daily_summary/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_amount' in response.data
        assert 'total_transactions' in response.data

    def test_monthly_summary(self, pharmacist_client, sale):
        """Test monthly summary endpoint."""
        response = pharmacist_client.get('/api/v1/sales/monthly_summary/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_amount' in response.data
        assert 'total_transactions' in response.data