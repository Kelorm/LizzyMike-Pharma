"""Remediation coverage: sales integrity, discounts, sale-items read-only, auth cookies."""
import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status

from core.models import Discount, LockedAccount, Medication, Sale, SaleItem, StockMovement
from core.tests.factories import DiscountFactory, MedicationFactory


pytestmark = [
    pytest.mark.django_db(transaction=True),
    pytest.mark.usefixtures('open_business_day'),
]


class TestServerAuthoritativeTotals:
    def test_ignores_client_total(self, pharmacist_client, customer, medication):
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'subtotal': '1.00',
            'total': '1.00',
            'items': [{'medication': str(medication.id), 'qty': 2}],
        }
        response = pharmacist_client.post('/api/v1/sales/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        expected = (medication.price * 2).quantize(Decimal('0.01'))
        assert Decimal(response.data['total']) == expected
        assert Decimal(response.data['subtotal']) == expected

    def test_percentage_discount_applied(self, pharmacist_client, customer, medication):
        discount = DiscountFactory(
            type='percentage',
            value=Decimal('10.00'),
            min_purchase=Decimal('0.00'),
            max_discount=None,
            is_active=True,
        )
        data = {
            'customer': str(customer.id),
            'payment_method': 'cash',
            'discount_ids': [str(discount.id)],
            'items': [{'medication': str(medication.id), 'qty': 2}],
        }
        response = pharmacist_client.post('/api/v1/sales/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED, response.data
        subtotal = medication.price * 2
        expected_discount = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        assert Decimal(response.data['discount_total']) == expected_discount
        assert Decimal(response.data['total']) == (subtotal - expected_discount).quantize(Decimal('0.01'))
        discount.refresh_from_db()
        assert discount.current_usage == 1


class TestSaleItemReadOnly:
    def test_cannot_post_sale_item_directly(self, pharmacist_client, sale, medication):
        response = pharmacist_client.post(
            '/api/v1/sale-items/',
            {'medication': str(medication.id), 'qty': 1, 'sale': str(sale.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestStockMovementSign:
    def test_sale_records_negative_quantity(self, pharmacist_client, customer, medication):
        initial = medication.stock
        response = pharmacist_client.post(
            '/api/v1/sales/',
            {
                'customer': str(customer.id),
                'payment_method': 'cash',
                'items': [{'medication': str(medication.id), 'qty': 3}],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        movement = StockMovement.objects.filter(medication=medication, movement_type='sale').latest('created_at')
        assert movement.quantity == -3
        assert movement.previous_stock == initial
        assert movement.new_stock == initial - 3


class TestRestockLedger:
    def test_restock_increments_and_logs(self, pharmacist_client, medication):
        initial = medication.stock
        response = pharmacist_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(medication.id),
                'quantity': 10,
                'unit_cost': '5.00',
                'supplier': 'Acme',
                'batch_number': 'B1',
                'expiry_date': '2030-01-01',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        medication.refresh_from_db()
        assert medication.stock == initial + 10
        assert StockMovement.objects.filter(movement_type='restock', medication=medication).exists()


class TestProtectDelete:
    def test_cannot_delete_customer_with_sale(self, sale, customer):
        from django.db.models.deletion import ProtectedError
        with pytest.raises(ProtectedError):
            customer.delete()



class TestCookieAndBearerAuth:
    def test_login_sets_cookies_without_token_body(self, api_client, user):
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
        assert 'user' in response.data
        assert 'access_token' in response.cookies
        assert 'refresh_token' in response.cookies

    def test_logout_clears_cookies(self, api_client, user):
        user.set_password('testpass123')
        user.save()
        login = api_client.post(
            '/api/v1/token/',
            {'username': user.username, 'password': 'testpass123'},
            format='json',
        )
        refresh = login.cookies['refresh_token'].value
        response = api_client.post('/api/v1/auth/logout/', {'refresh': refresh}, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_lockout_after_five_failures(self, api_client, user):
        user.set_password('correctpassword')
        user.save()
        for _ in range(5):
            api_client.post(
                '/api/v1/token/',
                {'username': user.username, 'password': 'wrong'},
                format='json',
            )
        assert LockedAccount.objects.filter(username=user.username).exists()
        response = api_client.post(
            '/api/v1/token/',
            {'username': user.username, 'password': 'correctpassword'},
            format='json',
        )
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestWiredApis:
    def test_discounts_list(self, admin_client):
        DiscountFactory()
        response = admin_client.get('/api/v1/discounts/')
        assert response.status_code == status.HTTP_200_OK

    def test_audit_trail_admin_only(self, authenticated_client, admin_client):
        denied = authenticated_client.get('/api/v1/audit-trail/')
        assert denied.status_code == status.HTTP_403_FORBIDDEN
        allowed = admin_client.get('/api/v1/audit-trail/')
        assert allowed.status_code == status.HTTP_200_OK

    def test_liveness(self, api_client):
        response = api_client.get('/api/v1/health/live/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ok'
