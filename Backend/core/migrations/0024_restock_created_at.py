# Restore Restock.created_at in model state; add DB column only when missing
# (0012 removed the field from state but some databases still have the NOT NULL column).

from django.db import migrations, models


def add_created_at_if_missing(apps, schema_editor):
    Restock = apps.get_model('core', 'Restock')
    table = Restock._meta.db_table
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        columns = {
            col.name
            for col in connection.introspection.get_table_description(cursor, table)
        }
    if 'created_at' in columns:
        return
    field = models.DateTimeField(auto_now_add=True)
    field.set_attributes_from_name('created_at')
    schema_editor.add_field(Restock, field)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_taxrate_discountrate_defaults'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='restock',
                    name='created_at',
                    field=models.DateTimeField(auto_now_add=True),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_created_at_if_missing, migrations.RunPython.noop),
            ],
        ),
    ]
