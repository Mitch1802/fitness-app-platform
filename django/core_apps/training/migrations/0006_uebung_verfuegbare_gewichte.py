from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("training", "0005_trainingsession_pausiert_datum_editable"),
    ]

    operations = [
        migrations.AddField(
            model_name="uebung",
            name="verfuegbare_gewichte",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
