"""Tests: admin user management and staff restock."""
import pytest
from rest_framework import status

pytestmark = pytest.mark.django_db(transaction=True)


class TestUserRegisterRbac:
    def test_admin_can_create_staff(self, admin_client):
        response = admin_client.post(
            '/api/v1/auth/register/',
            {
                'username': 'counter1',
                'email': 'counter1@pharmacy.local',
                'password': 'SecurePass1!',
                'full_name': 'Counter One',
                'role': 'staff',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data['role'] == 'staff'
        assert response.data['is_active'] is True

    def test_admin_cannot_create_admin_role(self, admin_client):
        response = admin_client.post(
            '/api/v1/auth/register/',
            {
                'username': 'eviladmin',
                'email': 'evil@pharmacy.local',
                'password': 'SecurePass1!',
                'full_name': 'Evil Admin',
                'role': 'admin',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_staff_cannot_register(self, authenticated_client):
        response = authenticated_client.post(
            '/api/v1/auth/register/',
            {
                'username': 'noperm',
                'email': 'noperm@pharmacy.local',
                'password': 'SecurePass1!',
                'full_name': 'No Perm',
                'role': 'staff',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUserActiveToggle:
    def test_admin_can_deactivate_user(self, admin_client, api_client, user):
        response = admin_client.patch(
            f'/api/v1/users/{user.id}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is False
        user.refresh_from_db()
        assert user.is_active is False

        login = api_client.post(
            '/api/v1/token/',
            {'username': user.username, 'password': 'testpass123'},
            format='json',
        )
        assert login.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_cannot_deactivate_self(self, admin_client, admin):
        response = admin_client.patch(
            f'/api/v1/users/{admin.id}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        admin.refresh_from_db()
        assert admin.is_active is True

    def test_staff_cannot_list_users(self, authenticated_client):
        response = authenticated_client.get('/api/v1/users/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestStaffRestock:
    def test_staff_can_create_restock(self, authenticated_client, medication):
        before = medication.stock
        response = authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(medication.id),
                'quantity': 5,
                'unit_cost': '2.50',
                'supplier': 'Test Supplier',
                'batch_number': medication.batch_no or 'BATCH001',
                'expiry_date': '2030-12-31',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        medication.refresh_from_db()
        assert medication.stock == before + 5

    def test_staff_still_cannot_create_medication(self, authenticated_client):
        response = authenticated_client.post(
            '/api/v1/medications/',
            {
                'name': 'Forbidden',
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
