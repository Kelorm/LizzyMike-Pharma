# Generated manually for TaxRate / DiscountRate catalogs

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def seed_defaults_from_branch_tax(apps, schema_editor):
    TaxRate = apps.get_model('core', 'TaxRate')
    Branch = apps.get_model('core', 'Branch')

    # Group by (enabled, rate) so we don't create one rate per branch unnecessarily
    seen = {}
    for branch in Branch.objects.all():
        if not branch.tax_enabled:
            continue
        rate = branch.tax_rate or Decimal('0.0300')
        key = str(rate)
        tax = seen.get(key)
        if tax is None:
            pct = (rate * Decimal('100')).quantize(Decimal('0.01'))
            tax = TaxRate.objects.create(
                id=uuid.uuid4(),
                name=f'Sales Tax {pct}%',
                rate=rate,
                is_active=True,
            )
            seen[key] = tax
        Branch.objects.filter(pk=branch.pk).update(default_tax_id=tax.pk)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_seed_default_branch'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxRate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('rate', models.DecimalField(decimal_places=4, default=Decimal('0.0000'), help_text='Fractional rate, e.g. 0.03 = 3%', max_digits=6)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='DiscountRate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('rate', models.DecimalField(decimal_places=4, default=Decimal('0.0000'), help_text='Fractional rate, e.g. 0.10 = 10%', max_digits=6)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='branch',
            name='default_discount',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='branches_as_default_discount', to='core.discountrate'),
        ),
        migrations.AddField(
            model_name='branch',
            name='default_tax',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='branches_as_default_tax', to='core.taxrate'),
        ),
        migrations.AddField(
            model_name='sale',
            name='discount_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='sale',
            name='discount_rate',
            field=models.DecimalField(decimal_places=4, default=Decimal('0.0000'), max_digits=6),
        ),
        migrations.AddField(
            model_name='sale',
            name='tax_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='branch',
            name='tax_rate',
            field=models.DecimalField(decimal_places=4, default=Decimal('0.0300'), help_text='Fractional rate, e.g. 0.03 = 3% (legacy; prefer default_tax)', max_digits=6),
        ),
        migrations.RunPython(seed_defaults_from_branch_tax, noop_reverse),
    ]
