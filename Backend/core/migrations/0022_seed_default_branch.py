# Data migration: seed default branch and backfill FKs

import uuid
from decimal import Decimal

from django.db import migrations


def seed_and_backfill(apps, schema_editor):
    Branch = apps.get_model('core', 'Branch')
    PharmacyProfile = apps.get_model('core', 'PharmacyProfile')
    User = apps.get_model('core', 'User')

    profile = PharmacyProfile.objects.filter(pk=1).first()
    branch, created = Branch.objects.get_or_create(
        code='HQ',
        defaults={
            'id': uuid.uuid4(),
            'name': (profile.name if profile else None) or 'LizzyMike Pharmacy',
            'is_active': True,
            'phone': (profile.phone if profile else '') or '',
            'email': (profile.email if profile else '') or '',
            'license_no': (profile.license_no if profile else '') or '',
            'address': (profile.address if profile else '') or '',
            'tax_enabled': bool(profile.tax_enabled) if profile else True,
            'tax_rate': (profile.tax_rate if profile else None) or Decimal('0.0300'),
        },
    )
    if not created and profile:
        Branch.objects.filter(pk=branch.pk).update(
            name=profile.name or branch.name,
            phone=profile.phone or '',
            email=profile.email or '',
            license_no=profile.license_no or '',
            address=profile.address or '',
            tax_enabled=bool(profile.tax_enabled),
            tax_rate=profile.tax_rate or Decimal('0.0300'),
        )

    for model_name in (
        'Medication', 'Sale', 'BusinessDay', 'Restock', 'StockMovement', 'Prescription',
    ):
        Model = apps.get_model('core', model_name)
        Model.objects.filter(branch__isnull=True).update(branch_id=branch.pk)

    # Assign all non-admin users to HQ; admins can access all via role
    for user in User.objects.all():
        user.branches.add(branch)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_branch_multi_location'),
    ]

    operations = [
        migrations.RunPython(seed_and_backfill, noop_reverse),
    ]
