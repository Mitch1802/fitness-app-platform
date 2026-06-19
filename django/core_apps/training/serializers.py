from rest_framework import serializers
from .models import Trainingsplan, Uebung, TrainingSession, SatzErgebnis, ExtraUebung


class UebungSerializer(serializers.ModelSerializer):
    vorgaenger_name = serializers.SerializerMethodField()
    nachfolger_id = serializers.SerializerMethodField()
    nachfolger_name = serializers.SerializerMethodField()

    class Meta:
        model = Uebung
        fields = [
            "id", "trainingsplan", "name", "saetze", "hinweis",
            "gewicht", "gewicht_steigerung", "vorgaenger", "vorgaenger_name",
            "nachfolger_id", "nachfolger_name", "reihenfolge",
        ]
        read_only_fields = ["id", "trainingsplan", "vorgaenger_name", "nachfolger_id", "nachfolger_name"]

    def get_vorgaenger_name(self, obj):
        if obj.vorgaenger:
            return obj.vorgaenger.name
        return None

    def get_nachfolger_id(self, obj):
        nachfolger = obj.nachfolger.order_by("reihenfolge", "id").first()
        return nachfolger.id if nachfolger else None

    def get_nachfolger_name(self, obj):
        nachfolger = obj.nachfolger.order_by("reihenfolge", "id").first()
        return nachfolger.name if nachfolger else None

    def validate_saetze(self, value):
        if value is None:
            return []
        if value == "":
            raise serializers.ValidationError("Leere Zeichenketten sind für Sätze nicht erlaubt.")
        if not isinstance(value, list):
            raise serializers.ValidationError("Muss eine Liste sein.")
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Jeder Eintrag muss ein Objekt sein.")
            if "nr" not in item or "wdh" not in item:
                raise serializers.ValidationError(
                    'Jeder Eintrag braucht "nr" und "wdh".'
                )
            if not isinstance(item["wdh"], (str, int, float)):
                raise serializers.ValidationError('"wdh" muss eine Zahl oder ein Text (z.B. "8-12") sein.')
            if "gewicht" in item and item["gewicht"] is not None:
                try:
                    float(item["gewicht"])
                except (TypeError, ValueError):
                    raise serializers.ValidationError('"gewicht" muss eine Zahl sein.')
        return value

    def validate(self, attrs):
        plan = attrs.get("trainingsplan") or getattr(self.instance, "trainingsplan", None)
        vorgaenger = attrs.get("vorgaenger")

        if self.instance and vorgaenger and vorgaenger.pk == self.instance.pk:
            raise serializers.ValidationError({"vorgaenger": "Eine Übung kann nicht ihr eigener Vorgänger sein."})

        if plan and vorgaenger and vorgaenger.trainingsplan_id != plan.id:
            raise serializers.ValidationError({"vorgaenger": "Der Vorgänger muss aus demselben Trainingsplan stammen."})

        return attrs

    def create(self, validated_data):
        validated_data.setdefault("saetze", [])
        if validated_data.get("gewicht_steigerung") is None:
            plan = validated_data.get("trainingsplan")
            if plan:
                validated_data["gewicht_steigerung"] = plan.gewicht_steigerung
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "saetze" in validated_data and validated_data.get("saetze") is None:
            validated_data["saetze"] = []
        if "gewicht_steigerung" in validated_data and validated_data.get("gewicht_steigerung") is None:
            validated_data["gewicht_steigerung"] = instance.trainingsplan.gewicht_steigerung
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not isinstance(data.get("saetze"), list):
            data["saetze"] = []
        return data


class TrainingsplanSerializer(serializers.ModelSerializer):
    uebungen = UebungSerializer(many=True, read_only=True)
    uebungen_count = serializers.SerializerMethodField()

    class Meta:
        model = Trainingsplan
        fields = [
            "id", "name", "beschreibung", "aufwaermen", "gewicht_steigerung",
            "ist_aktiv", "erstellt_am", "aktualisiert_am",
            "uebungen", "uebungen_count",
        ]
        read_only_fields = ["id", "erstellt_am", "aktualisiert_am", "uebungen", "uebungen_count"]

    def get_uebungen_count(self, obj):
        return obj.uebungen.count()


class TrainingsplanListSerializer(serializers.ModelSerializer):
    uebungen_count = serializers.SerializerMethodField()

    class Meta:
        model = Trainingsplan
        fields = [
            "id", "name", "beschreibung", "aufwaermen", "gewicht_steigerung",
            "ist_aktiv", "erstellt_am", "aktualisiert_am", "uebungen_count",
        ]
        read_only_fields = ["id", "erstellt_am", "aktualisiert_am"]

    def get_uebungen_count(self, obj):
        return obj.uebungen.count()


class SatzErgebnisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SatzErgebnis
        fields = [
            "id", "session", "uebung", "uebung_name",
            "satz_nummer", "wiederholungen", "gewicht", "gewicht_erhoehen",
        ]
        read_only_fields = ["id", "session"]


class ExtraUebungSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtraUebung
        fields = [
            "id", "session", "name", "typ",
            "dauer_minuten", "distanz_km", "notiz",
        ]
        read_only_fields = ["id", "session"]


class TrainingSessionSerializer(serializers.ModelSerializer):
    satz_ergebnisse = SatzErgebnisSerializer(many=True, read_only=True)
    extra_uebungen = ExtraUebungSerializer(many=True, read_only=True)
    trainingsplan_name = serializers.SerializerMethodField()

    class Meta:
        model = TrainingSession
        fields = [
            "id", "trainingsplan", "trainingsplan_name",
            "datum", "abgeschlossen", "abgeschlossen_am",
            "warmup_abgeschlossen", "warmup_dauer_minuten", "warmup_notiz",
            "notiz", "pausiert", "satz_ergebnisse", "extra_uebungen",
        ]
        read_only_fields = ["id", "trainingsplan_name"]

    def get_trainingsplan_name(self, obj):
        if obj.trainingsplan:
            return obj.trainingsplan.name
        return None


class TrainingSessionListSerializer(serializers.ModelSerializer):
    trainingsplan_name = serializers.SerializerMethodField()
    saetze_count = serializers.SerializerMethodField()

    class Meta:
        model = TrainingSession
        fields = [
            "id", "trainingsplan", "trainingsplan_name",
            "datum", "abgeschlossen", "abgeschlossen_am",
            "warmup_abgeschlossen",
            "notiz", "pausiert", "saetze_count",
        ]
        read_only_fields = ["id"]

    def get_trainingsplan_name(self, obj):
        if obj.trainingsplan:
            return obj.trainingsplan.name
        return None

    def get_saetze_count(self, obj):
        return obj.satz_ergebnisse.count()


class StatistikSerializer(serializers.Serializer):
    uebung_id = serializers.IntegerField()
    uebung_name = serializers.CharField()
    daten = serializers.ListField(
        child=serializers.DictField()
    )
