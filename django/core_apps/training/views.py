from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
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


class TrainingSessionDetailView(generics.RetrieveUpdateAPIView):
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
            for ergebnis in instance.satz_ergebnisse.filter(gewicht_erhoehen=True, uebung__isnull=False):
                uebung = ergebnis.uebung
                steigerung = uebung.trainingsplan.gewicht_steigerung
                Uebung.objects.filter(pk=uebung.pk).update(
                    gewicht=uebung.gewicht + steigerung
                )
        serializer.save()


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
        # Snapshot the exercise name
        uebung = serializer.validated_data.get("uebung")
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
