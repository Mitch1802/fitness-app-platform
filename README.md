# TrainFlow - Trainings PWA

TrainFlow ist eine installierbare Trainings-App (PWA) mit Login, Uebersicht, Trainingsplan-Erstellung, Trainingsbegleitung und Trainingshistorie.

## Stack

- Frontend: React + Vite + vite-plugin-pwa
- Backend: Node.js + Express
- DB: SQLite (persistent im Docker Volume)
- Deployment: Docker Compose

## Funktionen (Stand v0.1)

- Anmeldung erforderlich (Benutzername + Passwort)
- Dashboard mit Funktionsuebersicht und Kennzahlen
- Trainingshistorie mit abgeschlossenen Sessions
- Training starten und Saetze dokumentieren
- Trainingsplan erstellen
- Uebungen mit Geraet, Saetzen, Wiederholungen, Zielgewicht und Notizen
- PWA installierbar

## Lokal starten

1. Abhaengigkeiten installieren:
   npm install
2. Dev starten:
   - Backend: npm run dev -w backend
   - Frontend: npm run dev -w frontend
3. Frontend aufrufen: <http://localhost:5173>

## Docker Deployment (FTP + SSH)

1. Projektdateien per FTP auf den Server kopieren.
2. Auf dem Server im Projektordner `.env` mit produktiven Werten setzen.
3. Container bauen und starten:
   docker compose up -d --build
4. App aufrufen:
   <http://SERVER:8080>

## Persistente SQLite DB

- SQLite liegt im Backend unter `/data/app.db`.
- Compose mountet ein Named Volume `sqlite_data` auf `/data`.
- Daten bleiben bei `docker compose down` erhalten.

## API Basis

- Health: GET /health
- Auth:
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me
- Dashboard: GET /api/dashboard
- Plaene:
  - GET /api/plans
  - POST /api/plans
  - GET /api/plans/:id
  - POST /api/plans/:id/exercises
- Sessions:
  - POST /api/sessions/start
  - POST /api/sessions/:id/sets
  - POST /api/sessions/:id/complete
- Historie: GET /api/history
