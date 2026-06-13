from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("training", "0003_plan_warmup_exercise_increment"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainingsession",
            name="warmup_abgeschlossen",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="trainingsession",
            name="warmup_dauer_minuten",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="trainingsession",
            name="warmup_notiz",
            field=models.TextField(blank=True),
        ),
    ]
