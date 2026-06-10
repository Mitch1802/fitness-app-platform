FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
RUN npm install

COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
