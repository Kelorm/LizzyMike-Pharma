# Generated manually to add missing fields to Restock model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_user_full_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='restock',
            name='medication_name',
            field=models.CharField(max_length=255, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='restock',
            name='batch_number',
            field=models.CharField(max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='restock',
            name='expiry_date',
            field=models.DateField(default='2025-12-31'),
            preserve_default=False,
        ),

        migrations.AddField(
            model_name='restock',
            name='date_restocked',
            field=models.DateTimeField(auto_now_add=True, default='2025-07-31T00:00:00Z'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='restock',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default='2025-07-31T00:00:00Z'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='restock',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.RenameField(
            model_name='restock',
            old_name='cost_per_unit',
            new_name='unit_cost',
        ),
        migrations.AlterField(
            model_name='restock',
            name='medication',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='restocks', to='core.medication'),
        ),
        migrations.AlterModelOptions(
            name='restock',
            options={'ordering': ['-date_restocked'], 'verbose_name': 'Restock', 'verbose_name_plural': 'Restocks'},
        ),
    ] 