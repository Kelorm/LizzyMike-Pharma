"""RBAC tests: staff POS create, prescription delete, medication write denial."""
import pytest
from rest_framework import status

from core.tests.factories import (
    MedicationFactory,
    PrescriptionFactory,
)

pytestmark = [
    pytest.mark.django_db(transaction=True),
    pytest.mark.usefixtures('open_business_day'),
]


@pytest.fixture
def staff_client(api_client, user):
    """API client authenticated as staff (default UserFactory role)."""
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestStaffSaleCreate:
    def test_staff_can_create_sale(self, staff_client, customer, medication):
        data = {
            'customer': str(customer.id),
            'customer_name': customer.name,
            'payment_method': 'cash',
            'items': [{'medication': str(medication.id), 'qty': 1}],
        }
        response = staff_client.post('/api/v1/sales/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_staff_cannot_write_medication(self, staff_client):
        response = staff_client.post(
            '/api/v1/medications/',
            {
                'name': 'Forbidden Med',
                'category': 'test',
                'price': '10.00',
                'cost': '5.00',
                'stock': 10,
                'min_stock': 2,
                'expiry': '2030-01-01',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestPrescriptionDestroyRbac:
    def test_pharmacist_cannot_delete_prescription(
        self, pharmacist_client, pharmacist, customer, medication
    ):
        rx = PrescriptionFactory(
            customer=customer,
            medication=medication,
            created_by=pharmacist,
        )
        response = pharmacist_client.delete(f'/api/v1/prescriptions/{rx.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_delete_prescription(
        self, admin_client, admin, customer, medication
    ):
        rx = PrescriptionFactory(
            customer=customer,
            medication=medication,
            created_by=admin,
        )
        response = admin_client.delete(f'/api/v1/prescriptions/{rx.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
