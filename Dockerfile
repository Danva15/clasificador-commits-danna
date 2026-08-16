# ---------- Etapa 1: construcción ----------
FROM node:22-alpine AS builder

WORKDIR /build

COPY package*.json ./

RUN npm ci


# ---------- Etapa 2: ejecución ----------
FROM node:22-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]