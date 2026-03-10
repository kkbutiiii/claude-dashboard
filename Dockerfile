# Multi-stage build for Claude Dashboard

# Stage 1: Build web frontend
FROM node:20-alpine AS web-builder

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY --from=server-builder /app/server/dist ./dist
COPY --from=web-builder /app/web/dist ./public

RUN mkdir -p /app/data/claude-projects /app/data/dashboard

EXPOSE 3727

CMD ["node", "dist/index.js"]
