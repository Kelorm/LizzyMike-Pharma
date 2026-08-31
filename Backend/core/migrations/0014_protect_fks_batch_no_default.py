# Generated manually for remediation: PROTECT FKs + batch_no default

from django.db import migrations, models
import django.db.models.deletion


def normalize_batch_no(apps, schema_editor):
    Medication = apps.get_model('core', 'Medication')
    Medication.objects.filter(batch_no__isnull=True).update(batch_no='')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_lockedaccount_failedloginattempt_apirequestlog_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_batch_no, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='medication',
            name='batch_no',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='prescription',
            name='customer',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='prescriptions',
                to='core.customer',
            ),
        ),
        migrations.AlterField(
            model_name='prescription',
            name='medication',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='prescriptions',
                to='core.medication',
            ),
        ),
        migrations.AlterField(
            model_name='sale',
            name='customer',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to='core.customer',
            ),
        ),
        migrations.AlterField(
            model_name='saleitem',
            name='medication',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to='core.medication',
            ),
        ),
    ]
