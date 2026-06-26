# ── Build Stage: Angular ──────────────────────────────────────────────────────
FROM node:22-alpine AS node-build
WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm install --prefer-offline
COPY ./frontend/ ./
ARG APP_VERSION=test
RUN ./node_modules/.bin/ng build --define "APP_VERSION=\"${APP_VERSION}\""

# ── Runtime Stage: Nginx ──────────────────────────────────────────────────────
FROM nginx:1.27.4-alpine-slim

RUN rm /etc/nginx/conf.d/default.conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY --from=node-build /app/dist/fitness-app/browser /usr/share/nginx/html
