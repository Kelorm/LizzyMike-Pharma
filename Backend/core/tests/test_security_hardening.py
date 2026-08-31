"""Security hardening tests: cookies, honeypot, trimmed fields, password validation."""
import pytest
from rest_framework import status

pytestmark = pytest.mark.django_db(transaction=True)


class TestLoginSecurityHardening:
    def test_login_body_has_no_tokens(self, api_client, user):
        user.set_password('testpass123')
        user.save()
        response = api_client.post(
            '/api/v1/token/',
            {'username': user.username, 'password': 'testpass123'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' not in response.data
        assert 'refresh' not in response.data
        assert response.data.get('user', {}).get('username') == user.username

    def test_honeypot_blocks_login(self, api_client, user):
        user.set_password('testpass123')
        user.save()
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'testpass123',
                'website': 'https://bot.example',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTrimmedApiResponses:
    def test_staff_medication_hides_cost(self, authenticated_client, medication):
        response = authenticated_client.get(f'/api/v1/medications/{medication.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'cost' not in response.data
        assert 'price' in response.data

    def test_admin_medication_includes_cost(self, admin_client, medication):
        response = admin_client.get(f'/api/v1/medications/{medication.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'cost' in response.data


class TestRegisterPasswordValidation:
    def test_weak_password_rejected(self, admin_client):
        response = admin_client.post(
            '/api/v1/auth/register/',
            {
                'username': 'weakuser',
                'email': 'weak@pharmacy.local',
                'password': 'password',
                'full_name': 'Weak User',
                'role': 'staff',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data
