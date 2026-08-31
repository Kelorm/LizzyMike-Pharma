# Allow free-text medication category and classification (no choices constraint).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_prescription_customer_nullable'),
    ]

    operations = [
        migrations.AlterField(
            model_name='medication',
            name='category',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='medication',
            name='classification',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
