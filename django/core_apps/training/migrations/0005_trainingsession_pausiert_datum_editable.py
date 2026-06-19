import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("training", "0004_trainingsession_warmup_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="trainingsession",
            name="datum",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="trainingsession",
            name="pausiert",
            field=models.BooleanField(default=False),
        ),
    ]
