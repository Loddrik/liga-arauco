# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
# Compilar el package shared primero (api lo consume vía main: dist/index.js).
RUN pnpm --filter @liga/shared build
RUN pnpm --filter @liga/api exec prisma generate
RUN pnpm --filter @liga/api build

# ---------- prod deps only ----------
FROM base AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod
# Generar Prisma Client en el árbol de prod-deps para que copie a runtime con el cliente listo.
RUN pnpm --filter @liga/api exec prisma generate

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# OpenSSL es requerido por Prisma en alpine
RUN apk add --no-cache openssl

COPY --from=prod-deps /repo/node_modules /app/node_modules
COPY --from=prod-deps /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=prod-deps /repo/packages/shared/node_modules /app/packages/shared/node_modules
COPY --from=build /repo/apps/api/dist /app/apps/api/dist
COPY --from=build /repo/apps/api/prisma /app/apps/api/prisma
COPY --from=build /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=build /repo/packages/shared /app/packages/shared

WORKDIR /app/apps/api
EXPOSE 3000
# migrate deploy aplica migraciones pendientes en startup; seed se corre aparte
# Usamos el binario local de prisma (instalado como dependency, no devDep) en vez de npx.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
