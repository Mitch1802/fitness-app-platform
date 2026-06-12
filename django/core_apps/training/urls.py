from django.urls import path
from .views import (
    TrainingsplanListCreateView,
    TrainingsplanDetailView,
    UebungListCreateView,
    UebungDetailView,
    TrainingSessionListCreateView,
    TrainingSessionDetailView,
    SatzErgebnisListCreateView,
    SatzErgebnisDetailView,
    ExtraUebungListCreateView,
    ExtraUebungDetailView,
    statistik_view,
    aktive_session_view,
)

urlpatterns = [
    path("plaene/", TrainingsplanListCreateView.as_view(), name="plan-list"),
    path("plaene/<int:pk>/", TrainingsplanDetailView.as_view(), name="plan-detail"),
    path("plaene/<int:plan_id>/uebungen/", UebungListCreateView.as_view(), name="uebung-list"),
    path("uebungen/<int:pk>/", UebungDetailView.as_view(), name="uebung-detail"),
    path("sessions/", TrainingSessionListCreateView.as_view(), name="session-list"),
    path("sessions/aktiv/", aktive_session_view, name="session-aktiv"),
    path("sessions/<int:pk>/", TrainingSessionDetailView.as_view(), name="session-detail"),
    path("sessions/<int:session_id>/saetze/", SatzErgebnisListCreateView.as_view(), name="satz-list"),
    path("saetze/<int:pk>/", SatzErgebnisDetailView.as_view(), name="satz-detail"),
    path("sessions/<int:session_id>/extra/", ExtraUebungListCreateView.as_view(), name="extra-list"),
    path("extra/<int:pk>/", ExtraUebungDetailView.as_view(), name="extra-detail"),
    path("statistik/", statistik_view, name="statistik"),
]
