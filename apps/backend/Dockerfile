FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install

COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/app.db

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json

RUN mkdir -p /data
EXPOSE 3001

CMD ["node", "dist/index.js"]
