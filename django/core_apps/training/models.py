from django.db import models
from django.conf import settings
from django.utils import timezone


class Trainingsplan(models.Model):
    """A user's training plan."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trainingspläne",
    )
    name = models.CharField(max_length=200)
    beschreibung = models.TextField(blank=True)
    aufwaermen = models.TextField(blank=True)
    # Default weight increase for new exercises within this plan.
    gewicht_steigerung = models.DecimalField(max_digits=5, decimal_places=2, default=2.5)
    ist_aktiv = models.BooleanField(default=True)
    erstellt_am = models.DateTimeField(auto_now_add=True)
    aktualisiert_am = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-erstellt_am"]

    def __str__(self):
        return f"{self.user.username} – {self.name}"


class Uebung(models.Model):
    """An exercise within a training plan."""
    trainingsplan = models.ForeignKey(
        Trainingsplan,
        on_delete=models.CASCADE,
        related_name="uebungen",
    )
    name = models.CharField(max_length=200)
    # JSON list of sets: [{"nr": 1, "wdh": 10}, {"nr": 2, "wdh": 8}]
    saetze = models.JSONField(default=list, blank=True)
    hinweis = models.TextField(blank=True)
    # The current planned weight for this exercise (kg)
    gewicht = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    # Optional weight increase for this exercise. Falls back to the plan default.
    gewicht_steigerung = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # Optional: predecessor exercise (must be completed before this one)
    vorgaenger = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="nachfolger",
    )
    reihenfolge = models.IntegerField(default=0)

    class Meta:
        ordering = ["reihenfolge", "id"]

    def __str__(self):
        return f"{self.trainingsplan.name} – {self.name}"


class TrainingSession(models.Model):
    """A single workout session (one training unit)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="training_sessions",
    )
    trainingsplan = models.ForeignKey(
        Trainingsplan,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
    )
    datum = models.DateTimeField(default=timezone.now)
    abgeschlossen = models.BooleanField(default=False)
    pausiert = models.BooleanField(default=False)
    abgeschlossen_am = models.DateTimeField(null=True, blank=True)
    warmup_abgeschlossen = models.BooleanField(default=False)
    warmup_dauer_minuten = models.IntegerField(null=True, blank=True)
    warmup_notiz = models.TextField(blank=True)
    notiz = models.TextField(blank=True)

    class Meta:
        ordering = ["-datum"]

    def __str__(self):
        plan_name = self.trainingsplan.name if self.trainingsplan else "Freies Training"
        return f"{self.user.username} – {plan_name} ({self.datum.date()})"


class SatzErgebnis(models.Model):
    """Tracked result for one set within a session."""
    session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="satz_ergebnisse",
    )
    uebung = models.ForeignKey(
        Uebung,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ergebnisse",
    )
    uebung_name = models.CharField(max_length=200, blank=True)  # snapshot of name
    satz_nummer = models.IntegerField(default=1)
    wiederholungen = models.IntegerField(default=0)
    gewicht = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    # If True: after this session the plan's exercise weight should be increased
    gewicht_erhoehen = models.BooleanField(default=False)

    class Meta:
        ordering = ["satz_nummer", "id"]

    def __str__(self):
        return f"Session {self.session_id} – {self.uebung_name} Satz {self.satz_nummer}"


class ExtraUebung(models.Model):
    """An extra/cardio exercise added ad-hoc during a session."""
    session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="extra_uebungen",
    )
    name = models.CharField(max_length=200)
    typ = models.CharField(max_length=50, blank=True)  # e.g. "Laufen", "Radfahren"
    dauer_minuten = models.IntegerField(null=True, blank=True)
    distanz_km = models.DecimalField(null=True, blank=True, max_digits=7, decimal_places=2)
    notiz = models.TextField(blank=True)

    def __str__(self):
        return f"Session {self.session_id} – Extra: {self.name}"
