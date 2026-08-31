"""Restock: batch-aware inventory, branch validation, ledger."""
from datetime import date, timedelta

import pytest
from rest_framework import status

from core.models import Branch, Medication, Restock, StockMovement
from core.tests.factories import MedicationFactory

pytestmark = pytest.mark.django_db(transaction=True)


def _ensure_branch(medication):
    branch = Branch.get_default()
    if branch and not medication.branch_id:
        medication.branch = branch
        medication.save(update_fields=['branch'])
    return branch


@pytest.fixture
def branch_medication(db):
    med = MedicationFactory(stock=10, batch_no='BATCH-A')
    _ensure_branch(med)
    return med


class TestRestockCreate:
    def test_same_batch_increments_stock(self, authenticated_client, branch_medication):
        before = branch_medication.stock
        response = authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(branch_medication.id),
                'quantity': 5,
                'unit_cost': '2.50',
                'supplier': 'Supplier One',
                'batch_number': 'BATCH-A',
                'expiry_date': '2030-12-31',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        branch_medication.refresh_from_db()
        assert branch_medication.stock == before + 5
        assert StockMovement.objects.filter(
            medication=branch_medication, movement_type='restock'
        ).exists()

    def test_new_batch_creates_inventory_row(self, authenticated_client, branch_medication):
        response = authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(branch_medication.id),
                'quantity': 8,
                'unit_cost': '3.00',
                'supplier': 'Supplier Two',
                'batch_number': 'BATCH-B',
                'expiry_date': '2031-06-30',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        branch = branch_medication.branch
        rows = Medication.objects.filter(branch=branch, name=branch_medication.name)
        assert rows.count() == 2
        new_row = rows.get(batch_no='BATCH-B')
        assert new_row.stock == 8
        branch_medication.refresh_from_db()
        assert branch_medication.stock == 10

    def test_past_expiry_rejected(self, authenticated_client, branch_medication):
        response = authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(branch_medication.id),
                'quantity': 1,
                'unit_cost': '2.00',
                'supplier': 'Bad Expiry Co',
                'batch_number': 'BATCH-X',
                'expiry_date': (date.today() - timedelta(days=1)).isoformat(),
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_syncs_medication_cost_and_expiry(self, authenticated_client, branch_medication):
        authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(branch_medication.id),
                'quantity': 2,
                'unit_cost': '9.99',
                'supplier': 'Sync Supplier',
                'batch_number': 'BATCH-A',
                'expiry_date': '2032-01-15',
            },
            format='json',
        )
        branch_medication.refresh_from_db()
        assert str(branch_medication.cost) == '9.99'
        assert branch_medication.expiry.isoformat() == '2032-01-15'


class TestRestockDelete:
    def test_admin_delete_reverses_batch_row(self, admin_client, branch_medication):
        create = admin_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(branch_medication.id),
                'quantity': 5,
                'unit_cost': '2.50',
                'supplier': 'Delete Test',
                'batch_number': 'BATCH-A',
                'expiry_date': '2030-12-31',
            },
            format='json',
        )
        assert create.status_code == status.HTTP_201_CREATED
        restock_id = create.data['id']
        branch_medication.refresh_from_db()
        assert branch_medication.stock == 15

        delete = admin_client.delete(f'/api/v1/restocks/{restock_id}/')
        assert delete.status_code == status.HTTP_204_NO_CONTENT
        branch_medication.refresh_from_db()
        assert branch_medication.stock == 10


class TestRestockBranchValidation:
    def test_cross_branch_medication_rejected(self, authenticated_client, branch_medication):
        other = Branch.objects.create(code='OTHER', name='Other Branch', is_active=True)
        foreign = MedicationFactory(stock=5, batch_no='FOREIGN', branch=other)
        response = authenticated_client.post(
            '/api/v1/restocks/',
            {
                'medication': str(foreign.id),
                'quantity': 1,
                'unit_cost': '2.00',
                'supplier': 'X',
                'batch_number': 'FOREIGN',
                'expiry_date': '2030-12-31',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
