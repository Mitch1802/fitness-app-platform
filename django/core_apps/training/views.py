from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.utils import timezone
from .models import Trainingsplan, Uebung, TrainingSession, SatzErgebnis, ExtraUebung
from .serializers import (
    TrainingsplanSerializer,
    TrainingsplanListSerializer,
    UebungSerializer,
    TrainingSessionSerializer,
    TrainingSessionListSerializer,
    SatzErgebnisSerializer,
    ExtraUebungSerializer,
)

WEIGHT_DECIMAL_PLACES = 2


class TrainingsplanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trainingsplan.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return TrainingsplanListSerializer
        return TrainingsplanSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TrainingsplanDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrainingsplanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trainingsplan.objects.filter(user=self.request.user)


class UebungListCreateView(generics.ListCreateAPIView):
    serializer_class = UebungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        plan_id = self.kwargs["plan_id"]
        return Uebung.objects.filter(
            trainingsplan_id=plan_id,
            trainingsplan__user=self.request.user,
        )

    def perform_create(self, serializer):
        plan_id = self.kwargs["plan_id"]
        plan = Trainingsplan.objects.get(id=plan_id, user=self.request.user)
        serializer.save(trainingsplan=plan)


class UebungDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UebungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Uebung.objects.filter(trainingsplan__user=self.request.user)


class TrainingSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TrainingSession.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return TrainingSessionListSerializer
        return TrainingSessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TrainingSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return TrainingSessionSerializer

    def get_queryset(self):
        return TrainingSession.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        # If marking as completed, apply any weight increases
        new_abgeschlossen = serializer.validated_data.get("abgeschlossen", instance.abgeschlossen)
        if new_abgeschlossen and not instance.abgeschlossen:
            serializer.validated_data.setdefault("abgeschlossen_am", timezone.now())
            # Increase exercise weights where flagged
            seen_uebung_ids = set()
            for ergebnis in instance.satz_ergebnisse.filter(gewicht_erhoehen=True, uebung__isnull=False):
                uebung = ergebnis.uebung
                if uebung.pk in seen_uebung_ids:
                    continue
                seen_uebung_ids.add(uebung.pk)
                uebung.refresh_from_db()
                verfuegbare = uebung.verfuegbare_gewichte
                if verfuegbare and isinstance(verfuegbare, list) and len(verfuegbare) > 0:
                    # Advance to next higher weight in the available list
                    try:
                        gewichte = sorted(float(g) for g in verfuegbare if g is not None)
                    except (TypeError, ValueError):
                        gewichte = []
                    current = float(uebung.gewicht)
                    next_gewichte = [g for g in gewichte if g > current]
                    if next_gewichte:
                        new_gewicht = next_gewichte[0]
                        self._apply_weight_increase(uebung, new_gewicht)
                else:
                    steigerung = (
                        uebung.gewicht_steigerung
                        if uebung.gewicht_steigerung is not None
                        else uebung.trainingsplan.gewicht_steigerung
                    )
                    new_gewicht = float(uebung.gewicht) + float(steigerung)
                    self._apply_weight_increase(uebung, new_gewicht)
        serializer.save()

    @staticmethod
    def _apply_weight_increase(uebung, new_gewicht):
        """Update uebung.gewicht and apply the same delta to any per-set weights in saetze."""
        delta = new_gewicht - float(uebung.gewicht)
        saetze = uebung.saetze
        if isinstance(saetze, list) and any(
            isinstance(s, dict) and s.get("gewicht") is not None for s in saetze
        ):
            updated_saetze = []
            for satz in saetze:
                if isinstance(satz, dict) and satz.get("gewicht") is not None:
                    try:
                        updated_satz = dict(satz)
                        updated_satz["gewicht"] = round(float(satz["gewicht"]) + delta, WEIGHT_DECIMAL_PLACES)
                        updated_saetze.append(updated_satz)
                    except (TypeError, ValueError):
                        updated_saetze.append(satz)
                else:
                    updated_saetze.append(satz)
            Uebung.objects.filter(pk=uebung.pk).update(gewicht=new_gewicht, saetze=updated_saetze)
        else:
            Uebung.objects.filter(pk=uebung.pk).update(gewicht=new_gewicht)

    def perform_destroy(self, instance):
        instance.delete()


class SatzErgebnisListCreateView(generics.ListCreateAPIView):
    serializer_class = SatzErgebnisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs["session_id"]
        return SatzErgebnis.objects.filter(
            session_id=session_id,
            session__user=self.request.user,
        )

    def perform_create(self, serializer):
        session_id = self.kwargs["session_id"]
        session = TrainingSession.objects.get(id=session_id, user=self.request.user)

        if session.abgeschlossen:
            raise ValidationError({"detail": "Abgeschlossene Sessions können nicht mehr bearbeitet werden."})

        # Snapshot the exercise name
        uebung = serializer.validated_data.get("uebung")

        if uebung and uebung.vorgaenger_id:
            predecessor_done = session.satz_ergebnisse.filter(uebung_id=uebung.vorgaenger_id).exists()
            if not predecessor_done:
                predecessor_name = uebung.vorgaenger.name
                raise ValidationError({
                    "uebung": [f"{predecessor_name} muss zuerst abgeschlossen werden."],
                })

        uebung_name = uebung.name if uebung else serializer.validated_data.get("uebung_name", "")
        serializer.save(session=session, uebung_name=uebung_name)


class SatzErgebnisDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SatzErgebnisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SatzErgebnis.objects.filter(session__user=self.request.user)


class ExtraUebungListCreateView(generics.ListCreateAPIView):
    serializer_class = ExtraUebungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs["session_id"]
        return ExtraUebung.objects.filter(
            session_id=session_id,
            session__user=self.request.user,
        )

    def perform_create(self, serializer):
        session_id = self.kwargs["session_id"]
        session = TrainingSession.objects.get(id=session_id, user=self.request.user)

        if session.abgeschlossen:
            raise ValidationError({"detail": "Abgeschlossene Sessions können nicht mehr bearbeitet werden."})

        serializer.save(session=session)


class ExtraUebungDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExtraUebungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExtraUebung.objects.filter(session__user=self.request.user)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def statistik_view(request):
    """
    Returns weight progression per exercise.
    Optional query param: uebung_id=<id>
    """
    uebung_id = request.query_params.get("uebung_id")
    user = request.user

    # Build base queryset of completed sessions for this user
    saetze_qs = SatzErgebnis.objects.filter(
        session__user=user,
        session__abgeschlossen=True,
        uebung__isnull=False,
    ).select_related("uebung", "session")

    if uebung_id:
        saetze_qs = saetze_qs.filter(uebung_id=uebung_id)

    # Group by exercise
    from collections import defaultdict
    by_uebung = defaultdict(list)
    for s in saetze_qs.order_by("session__datum"):
        by_uebung[s.uebung].append({
            "datum": s.session.datum.isoformat(),
            "satz_nummer": s.satz_nummer,
            "wiederholungen": s.wiederholungen,
            "gewicht": float(s.gewicht),
        })

    result = []
    for uebung, daten in by_uebung.items():
        result.append({
            "uebung_id": uebung.id,
            "uebung_name": uebung.name,
            "daten": daten,
        })

    return Response(result)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def aktive_session_view(request):
    """Returns the current unfinished session, if any."""
    session = TrainingSession.objects.filter(
        user=request.user,
        abgeschlossen=False,
    ).first()
    if session:
        return Response(TrainingSessionSerializer(session).data)
    return Response(None)
