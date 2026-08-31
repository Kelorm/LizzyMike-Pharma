"""Business day open/close and sale gating."""
import pytest
from django.utils import timezone
from rest_framework import status

from core.models import BusinessDay
from core.tests.factories import MedicationFactory


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def staff_client(api_client, user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestBusinessDayOpenClose:
    def test_current_closed_when_none_open(self, authenticated_client):
        response = authenticated_client.get('/api/v1/business-days/current/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'closed'
        assert response.data['day'] is None

    def test_admin_can_open_day(self, admin_client):
        response = admin_client.post(
            '/api/v1/business-days/open/',
            {'opening_float': '50.00', 'open_notes': 'Morning float'},
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data['status'] == 'open'
        assert BusinessDay.objects.filter(status=BusinessDay.STATUS_OPEN).count() == 1

        current = admin_client.get('/api/v1/business-days/current/')
        assert current.data['status'] == 'open'
        assert current.data['day']['id'] == response.data['id']

    def test_second_open_fails(self, admin_client, admin):
        BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_OPEN,
            opened_at=timezone.now(),
            opened_by=admin,
        )
        response = admin_client.post('/api/v1/business-days/open/', {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already open' in response.data['detail'].lower()

    def test_staff_cannot_open(self, staff_client):
        response = staff_client.post('/api/v1/business-days/open/', {}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_reopen_closed_day(self, admin_client, admin):
        day = BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_CLOSED,
            opened_at=timezone.now(),
            opened_by=admin,
            closed_at=timezone.now(),
            closed_by=admin,
            closing_cash='100.00',
            close_notes='End of day',
        )
        response = admin_client.post(
            '/api/v1/business-days/open/',
            {'opening_float': '25.00', 'open_notes': 'Reopened after lunch'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data['status'] == 'open'
        day.refresh_from_db()
        assert day.status == BusinessDay.STATUS_OPEN
        assert day.closed_at is None
        assert day.closed_by is None
        assert day.closing_cash is None
        assert float(day.opening_float) == 25.0
        assert BusinessDay.objects.filter(status=BusinessDay.STATUS_OPEN).count() == 1

    def test_staff_cannot_reopen_closed_day(self, staff_client, admin):
        BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_CLOSED,
            opened_at=timezone.now(),
            opened_by=admin,
            closed_at=timezone.now(),
            closed_by=admin,
        )
        response = staff_client.post('/api/v1/business-days/open/', {}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert BusinessDay.get_open_day() is None

    def test_staff_can_close(self, staff_client, user, admin):
        day = BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_OPEN,
            opened_at=timezone.now(),
            opened_by=admin,
        )
        response = staff_client.post(
            '/api/v1/business-days/close/',
            {'closing_cash': '120.00'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        day.refresh_from_db()
        assert day.status == BusinessDay.STATUS_CLOSED
        assert day.closed_by_id == user.id

        current = staff_client.get('/api/v1/business-days/current/')
        assert current.data['status'] == 'closed'

    def test_admin_can_list(self, admin_client, admin):
        BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_CLOSED,
            opened_at=timezone.now(),
            opened_by=admin,
            closed_at=timezone.now(),
            closed_by=admin,
        )
        response = admin_client.get('/api/v1/business-days/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) >= 1

    def test_staff_cannot_list(self, staff_client):
        response = staff_client.get('/api/v1/business-days/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestSaleGatingByBusinessDay:
    def test_sale_create_blocked_when_closed(self, staff_client, customer, medication):
        assert BusinessDay.get_open_day() is None
        response = staff_client.post(
            '/api/v1/sales/',
            {
                'customer': str(customer.id),
                'payment_method': 'cash',
                'items': [{'medication': str(medication.id), 'qty': 1}],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        detail = response.data.get('detail', '')
        assert 'trading day is closed' in str(detail).lower()

    def test_sale_create_allowed_when_open(self, staff_client, customer, medication, admin):
        BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_OPEN,
            opened_at=timezone.now(),
            opened_by=admin,
        )
        med = MedicationFactory(stock=20) if medication.stock < 1 else medication
        response = staff_client.post(
            '/api/v1/sales/',
            {
                'customer': str(customer.id),
                'payment_method': 'cash',
                'items': [{'medication': str(med.id), 'qty': 1}],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_sale_create_blocked_after_close(self, staff_client, customer, medication, admin):
        BusinessDay.objects.create(
            business_date=timezone.localdate(),
            status=BusinessDay.STATUS_OPEN,
            opened_at=timezone.now(),
            opened_by=admin,
        )
        close = staff_client.post('/api/v1/business-days/close/', {}, format='json')
        assert close.status_code == status.HTTP_200_OK

        response = staff_client.post(
            '/api/v1/sales/',
            {
                'customer': str(customer.id),
                'payment_method': 'cash',
                'items': [{'medication': str(medication.id), 'qty': 1}],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
