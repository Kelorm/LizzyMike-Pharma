# Generated manually: allow prescriptions without a linked Customer (free-text patient name)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_restock_created_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='prescription',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='prescriptions',
                to='core.customer',
            ),
        ),
    ]
