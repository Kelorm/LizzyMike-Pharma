"""
Pytest configuration and fixtures for LizzyMike Pharmacy tests.
"""
import pytest
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Branch
from core.tests.factories import (
    UserFactory, AdminFactory, PharmacistFactory,
    CustomerFactory, MedicationFactory, SaleFactory,
)


# =============================================================================
# Pytest Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def _clear_cache():
    """Prevent rate-limit / lockout cache bleed across tests."""
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    """Return an API client instance."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create and return a regular staff user."""
    return UserFactory()


@pytest.fixture
def pharmacist(db):
    """Create and return a pharmacist user."""
    return PharmacistFactory()


@pytest.fixture
def admin(db):
    """Create and return an admin user."""
    return AdminFactory()


@pytest.fixture
def customer(db):
    """Create and return a customer."""
    return CustomerFactory()


@pytest.fixture
def medication(db):
    """Create and return a medication with stock."""
    return MedicationFactory(stock=50)


@pytest.fixture
def medication_low_stock(db):
    """Create and return a medication with low stock."""
    return MedicationFactory(stock=5, min_stock=10)


@pytest.fixture
def sale(db, customer, medication):
    """Create and return a sale."""
    from core.models import SaleItem
    sale = SaleFactory(customer=customer, customer_name=customer.name)
    SaleItem.objects.create(
        sale=sale,
        medication=medication,
        medication_name=medication.name,
        qty=2,
        price=medication.price,
        cost=medication.cost,
        final_price=medication.price * 2
    )
    return sale


@pytest.fixture
def open_business_day(db, admin):
    """Ensure an open trading day exists (required to create sales)."""
    from django.utils import timezone
    from core.models import BusinessDay

    return BusinessDay.objects.create(
        business_date=timezone.localdate(),
        status=BusinessDay.STATUS_OPEN,
        opened_at=timezone.now(),
        opened_by=admin,
        opening_float=0,
    )


def _auth_client(user):
    branch = Branch.get_default()
    user.branches.add(branch)
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.defaults['HTTP_X_BRANCH_ID'] = str(branch.id)
    return client


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an API client authenticated as the given user."""
    return _auth_client(user)


@pytest.fixture
def pharmacist_client(api_client, pharmacist):
    """Return an API client authenticated as a pharmacist."""
    return _auth_client(pharmacist)


@pytest.fixture
def admin_client(api_client, admin):
    """Return an API client authenticated as an admin."""
    return _auth_client(admin)


# =============================================================================
# Database Fixtures
# =============================================================================

@pytest.fixture(scope='function')
def db_setup(db):
    """
    Ensure database is set up for each test.
    This is the default but explicit for clarity.
    """
    pass


# =============================================================================
# Model Fixtures
# =============================================================================

@pytest.fixture
def multiple_medications(db):
    """Create multiple medications for testing."""
    return [
        MedicationFactory(name='Aspirin', stock=100, price=10.00),
        MedicationFactory(name='Ibuprofen', stock=50, price=15.00),
        MedicationFactory(name='Paracetamol', stock=200, price=8.00),
    ]


@pytest.fixture
def multiple_customers(db):
    """Create multiple customers for testing."""
    return [
        CustomerFactory(name='John Doe'),
        CustomerFactory(name='Jane Smith'),
        CustomerFactory(name='Bob Johnson'),
    ]


# =============================================================================
# Request Data Fixtures
# =============================================================================

@pytest.fixture
def sale_create_data(customer, medication):
    """Return valid sale creation data."""
    return {
        'customer': str(customer.id),
        'payment_method': 'cash',
        'items': [
            {
                'medication': str(medication.id),
                'qty': 2,
            }
        ]
    }


@pytest.fixture
def sale_create_data_insufficient_stock(customer, medication):
    """Return sale creation data with insufficient stock."""
    return {
        'customer': str(customer.id),
        'payment_method': 'cash',
        'items': [
            {
                'medication': str(medication.id),
                'qty': 100,  # More than available stock
            }
        ]
    }


@pytest.fixture
def login_data(user):
    """Return valid login credentials."""
    return {
        'username': user.username,
        'password': 'testpass123',
    }


@pytest.fixture
def login_data_wrong_password(user):
    """Return login credentials with wrong password."""
    return {
        'username': user.username,
        'password': 'wrongpassword',
    }