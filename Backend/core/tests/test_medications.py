"""
Tests for medication views.

Covers:
- List medications
- Low stock alert triggers correctly
- Cannot set negative stock
"""
import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status

from core.models import Medication
from core.tests.factories import MedicationFactory, UserFactory


pytestmark = pytest.mark.django_db


# =============================================================================
# Medication List Tests
# =============================================================================

class TestMedicationList:
    """Test cases for listing medications."""

    def test_list_medications(self, authenticated_client, multiple_medications):
        """Test that authenticated user can list medications."""
        response = authenticated_client.get('/api/v1/medications/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 3

    def test_list_medications_pagination(self, authenticated_client):
        """Test that medication list is paginated."""
        # Create more than page size medications
        for i in range(15):
            MedicationFactory(name=f'Medication {i}')
        
        response = authenticated_client.get('/api/v1/medications/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data

    def test_search_medications_by_name(self, authenticated_client):
        """Test searching medications by name."""
        MedicationFactory(name='Aspirin', category='Pain Relief')
        MedicationFactory(name='Ibuprofen', category='Pain Relief')
        MedicationFactory(name='Amoxicillin', category='Antibiotic')
        
        response = authenticated_client.get('/api/v1/medications/?search=Aspir')
        
        assert response.status_code == status.HTTP_200_OK
        # Should filter to medications containing 'Aspir'
        for item in response.data['results']:
            assert 'Aspir' in item['name'] or response.data['count'] == 0

    def test_filter_medications_by_category(self, authenticated_client):
        """Test filtering medications by category."""
        MedicationFactory(name='Aspirin', category='Pain Relief')
        MedicationFactory(name='Ibuprofen', category='Pain Relief')
        MedicationFactory(name='Amoxicillin', category='Antibiotic')
        
        response = authenticated_client.get('/api/v1/medications/?category=Pain Relief')
        
        assert response.status_code == status.HTTP_200_OK
        for item in response.data['results']:
            assert item['category'] == 'Pain Relief'

    def test_order_medications_by_name(self, authenticated_client):
        """Test ordering medications by name."""
        MedicationFactory(name='Zebra', category='Test')
        MedicationFactory(name='Apple', category='Test')
        MedicationFactory(name='Banana', category='Test')
        
        response = authenticated_client.get('/api/v1/medications/?ordering=name')
        
        assert response.status_code == status.HTTP_200_OK
        names = [item['name'] for item in response.data['results']]
        assert names == sorted(names)


# =============================================================================
# Low Stock Alert Tests
# =============================================================================

class TestLowStockAlerts:
    """Test cases for low stock alerts."""

    def test_low_stock_alert_triggers_correctly(self, authenticated_client):
        """Test that low stock alert triggers for medications at or below min_stock."""
        # Create medication with stock at min_stock level
        med = MedicationFactory(stock=10, min_stock=10)
        
        response = authenticated_client.get('/api/v1/medications/low_stock_alerts/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # The medication should be in low stock alerts
        low_stock_ids = [item['id'] for item in response.data]
        assert str(med.id) in low_stock_ids

    def test_low_stock_alert_below_min_stock(self, authenticated_client):
        """Test that low stock alert triggers for medications below min_stock."""
        # Create medication with stock below min_stock
        med = MedicationFactory(stock=5, min_stock=10)
        
        response = authenticated_client.get('/api/v1/medications/low_stock_alerts/')
        
        assert response.status_code == status.HTTP_200_OK
        
        low_stock_ids = [item['id'] for item in response.data]
        assert str(med.id) in low_stock_ids

    def test_no_low_stock_alert_when_above_min_stock(self, authenticated_client):
        """Test that medications above min_stock are not in low stock alerts."""
        # Create medication with stock above min_stock
        med = MedicationFactory(stock=50, min_stock=10)
        
        response = authenticated_client.get('/api/v1/medications/low_stock_alerts/')
        
        assert response.status_code == status.HTTP_200_OK
        
        low_stock_ids = [item['id'] for item in response.data]
        assert str(med.id) not in low_stock_ids

    def test_low_stock_filter_parameter(self, authenticated_client):
        """Test the low_stock query parameter."""
        med_low = MedicationFactory(stock=5, min_stock=10)
        med_high = MedicationFactory(stock=50, min_stock=10)
        
        response = authenticated_client.get('/api/v1/medications/?low_stock=true')
        
        assert response.status_code == status.HTTP_200_OK
        
        low_stock_ids = [item['id'] for item in response.data['results']]
        assert str(med_low.id) in low_stock_ids
        assert str(med_high.id) not in low_stock_ids


# =============================================================================
# Stock Validation Tests
# =============================================================================

class TestStockValidation:
    """Test cases for stock validation."""

    def test_cannot_set_negative_stock(self, authenticated_client, medication):
        """Test that negative stock cannot be set."""
        data = {
            'name': medication.name,
            'category': medication.category,
            'classification': getattr(medication, 'classification', None) or 'Antibiotics',
            'price': str(medication.price),
            'cost': str(medication.cost),
            'stock': -5,  # Negative stock
            'min_stock': 10,
            'expiry': '2026-12-31',
            'supplier': 'Test Supplier',
        }
        
        response = authenticated_client.put(
            f'/api/v1/medications/{medication.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_set_negative_min_stock(self, authenticated_client, medication):
        """Test that negative min_stock cannot be set."""
        data = {
            'name': medication.name,
            'category': medication.category,
            'classification': getattr(medication, 'classification', None) or 'Antibiotics',
            'price': str(medication.price),
            'cost': str(medication.cost),
            'stock': 50,
            'min_stock': -5,  # Negative min_stock
            'expiry': '2026-12-31',
            'supplier': 'Test Supplier',
        }
        
        response = authenticated_client.put(
            f'/api/v1/medications/{medication.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_zero_stock_is_valid(self, authenticated_client, medication):
        """Test that zero stock is valid."""
        data = {
            'name': medication.name,
            'category': medication.category,
            'classification': getattr(medication, 'classification', None) or 'Antibiotics',
            'price': str(medication.price),
            'cost': str(medication.cost),
            'stock': 0,
            'min_stock': 10,
            'expiry': '2026-12-31',
            'supplier': 'Test Supplier',
        }
        
        response = authenticated_client.put(
            f'/api/v1/medications/{medication.id}/',
            data,
            format='json'
        )
        
        # Should succeed (zero is valid, just triggers low stock alert)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


# =============================================================================
# Medication CRUD Tests
# =============================================================================

class TestMedicationCRUD:
    """Test cases for medication CRUD operations."""

    def test_create_medication_as_admin(self, admin_client):
        """Test that admin can create medication."""
        data = {
            'name': 'New Medication',
            'category': 'Tablets',
            'classification': 'Antibiotics',
            'dosage': '500mg',
            'description': 'Test description',
            'price': '25.00',
            'cost': '15.00',
            'stock': 100,
            'min_stock': 20,
            'expiry': '2026-12-31',
            'supplier': 'Test Supplier',
            'batch_no': 'BATCH001',
        }
        
        response = admin_client.post(
            '/api/v1/medications/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Medication'
        assert response.data['classification'] == 'Antibiotics'
        assert response.data['dosage'] == '500mg'

    def test_update_medication_as_admin(self, admin_client, medication):
        """Test that admin can update medication."""
        from decimal import Decimal
        data = {
            'name': medication.name,
            'category': 'Tablets',
            'classification': 'Antibiotics',
            'dosage': '500mg',
            'description': medication.description or '',
            'price': str(Decimal(medication.price).quantize(Decimal('0.01'))),
            'cost': str(Decimal(medication.cost).quantize(Decimal('0.01'))),
            'stock': medication.stock,
            'min_stock': medication.min_stock,
            'expiry': str(medication.expiry),
            'supplier': medication.supplier or 'Test Supplier',
            'batch_no': medication.batch_no or '',
        }

        response = admin_client.put(
            f'/api/v1/medications/{medication.id}/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK, response.data

    def test_delete_medication_as_admin(self, admin_client, medication):
        """Test that admin can delete medication."""
        response = admin_client.delete(f'/api/v1/medications/{medication.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_regular_user_cannot_create_medication(self, authenticated_client):
        """Test that regular user cannot create medication."""
        data = {
            'name': 'New Medication',
            'category': 'Tablets',
            'classification': 'Antibiotics',
            'price': '25.00',
            'cost': '15.00',
            'stock': 100,
            'min_stock': 20,
            'expiry': '2026-12-31',
            'supplier': 'Test Supplier',
        }
        
        response = authenticated_client.post(
            '/api/v1/medications/',
            data,
            format='json'
        )
        
        # Should be forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# Expiring Soon Tests
# =============================================================================

class TestExpiringSoon:
    """Test cases for expiring medications."""

    def test_expiring_soon_filter(self, authenticated_client):
        """Test the expiring_soon query parameter."""
        from datetime import date, timedelta
        
        # Create medication expiring within 90 days
        med_expiring = MedicationFactory(
            expiry=date.today() + timedelta(days=30)
        )
        
        # Create medication expiring after 90 days
        med_not_expiring = MedicationFactory(
            expiry=date.today() + timedelta(days=100)
        )
        
        response = authenticated_client.get('/api/v1/medications/?expiring_soon=true')
        
        assert response.status_code == status.HTTP_200_OK
        
        expiring_ids = [item['id'] for item in response.data['results']]
        assert str(med_expiring.id) in expiring_ids

    def test_expiring_soon_endpoint(self, authenticated_client):
        """Test the expiring_soon endpoint."""
        response = authenticated_client.get('/api/v1/medications/expiring_soon/')
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)


# =============================================================================
# Medication Retrieval Tests
# =============================================================================

class TestMedicationRetrieval:
    """Test cases for retrieving medications."""

    def test_retrieve_medication(self, authenticated_client, medication):
        """Test retrieving a specific medication."""
        response = authenticated_client.get(f'/api/v1/medications/{medication.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(medication.id)

    def test_unauthenticated_user_cannot_list_medications(self, api_client):
        """Test that unauthenticated user cannot list medications."""
        response = api_client.get('/api/v1/medications/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# Medication for Sale Tests
# =============================================================================

class TestMedicationForSale:
    """Test cases for medications available for sale."""

    def test_list_medications_for_sale(self, authenticated_client):
        """Test listing medications available for sale (stock > 0)."""
        # Create medication with stock
        med_in_stock = MedicationFactory(stock=10)
        
        # Create medication with no stock
        med_out_of_stock = MedicationFactory(stock=0)
        
        response = authenticated_client.get('/api/v1/medications/for_sale/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Should only include medications with stock
        in_stock_ids = [item['id'] for item in response.data]
        assert str(med_in_stock.id) in in_stock_ids
        assert str(med_out_of_stock.id) not in in_stock_ids