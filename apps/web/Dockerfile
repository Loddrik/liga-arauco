# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @liga/shared build
RUN pnpm --filter @liga/web build

# ---------- runtime (nginx) ----------
FROM nginx:1.27-alpine AS runtime
# Plantilla nginx con ${PORT} resolved en startup por nginx (vía envsubst integrado).
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
