from django.db import migrations, models



def copy_plan_increment_to_exercises(apps, schema_editor):
    """Copy each plan's default increment to existing exercises that do not have one yet."""
    Uebung = apps.get_model("training", "Uebung")

    updates = []
    for uebung in Uebung.objects.select_related("trainingsplan").all():
        if uebung.gewicht_steigerung is None and uebung.trainingsplan_id:
            uebung.gewicht_steigerung = uebung.trainingsplan.gewicht_steigerung
            updates.append(uebung)

    if updates:
        Uebung.objects.bulk_update(updates, ["gewicht_steigerung"])


class Migration(migrations.Migration):

    dependencies = [
        ("training", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainingsplan",
            name="aufwaermen",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="uebung",
            name="gewicht_steigerung",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name="uebung",
            name="saetze",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(copy_plan_increment_to_exercises, migrations.RunPython.noop),
    ]
