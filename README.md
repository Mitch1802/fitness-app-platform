# FitTrack – Fitness Tracking App

Eine mobile-first Fitness-Tracking Web-App mit Angular 21 Frontend und Django REST Framework Backend.

## Funktionen

- 🔐 **Benutzerregistrierung & Anmeldung** – sicherer JWT-Authentifizierung
- 📋 **Trainingspläne** – erstelle und verwalte Pläne mit dynamischen Sätzen/Wiederholungen
- 🏋️ **Trainings-Tracking** – erfasse Gewichte & Wiederholungen pro Satz in Echtzeit
- 📈 **Gewichtssteigerung** – markiere Sätze für automatische Gewichtserhöhung beim nächsten Training
- 🚴 **Extra-Übungen** – füge spontane Cardio-Aktivitäten (Laufen, Radfahren) hinzu
- 📊 **Statistiken** – visualisiere deinen Fortschritt mit interaktiven Charts
- 📱 **PWA** – installierbar auf dem Home-Bildschirm (ohne Caching)

## Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Angular 21 + Angular Material |
| Backend | Django 5.2 + Django REST Framework |
| Datenbank | SQLite3 |
| Auth | JWT (HttpOnly Cookies via dj-rest-auth) |
| Container | Docker (Nginx + Django) |

## Architektur

```
┌─────────────────────────┐
│    Nginx Container       │
│  (Angular SPA + Proxy)  │
└────────────┬────────────┘
             │ /api/v1/
┌────────────▼────────────┐
│    Django Container      │
│  (REST API + SQLite3)   │
└─────────────────────────┘
```

## Quickstart mit Docker

```bash
# 1. Konfiguration
cp .env.example .env
# Generiere einen sicheren SECRET_KEY:
# python3 -c "import secrets; print(secrets.token_hex(50))"
# Trage den Key in .env ein.

# 2. Starten
docker compose up --build

# 3. App aufrufen
open http://localhost
```

## API Endpunkte

| Methode | URL | Beschreibung |
|---------|-----|--------------|
| GET | `/api/v1/auth/csrf/` | CSRF-Token holen |
| POST | `/api/v1/auth/login/` | Anmelden |
| POST | `/api/v1/auth/logout/` | Abmelden |
| POST | `/api/v1/users/register/` | Registrieren |
| GET | `/api/v1/users/self/` | Eigene Daten |
| GET/POST | `/api/v1/training/plaene/` | Trainingspläne |
| GET/PUT/DELETE | `/api/v1/training/plaene/{id}/` | Plan-Details |
| GET/POST | `/api/v1/training/plaene/{id}/uebungen/` | Übungen |
| GET/POST | `/api/v1/training/sessions/` | Sessions |
| GET | `/api/v1/training/sessions/aktiv/` | Aktive Session |
| GET/POST | `/api/v1/training/sessions/{id}/saetze/` | Satz-Ergebnisse |
| GET/POST | `/api/v1/training/sessions/{id}/extra/` | Extra-Übungen |
| GET | `/api/v1/training/statistik/` | Statistiken |
