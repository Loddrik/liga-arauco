# Liga de Básquetbol Arauco 2026

Sitio web informativo + admin para la **LBA 2026**: fixture, resultados, tabla de posiciones.

## Stack

- Monorepo pnpm
- `apps/web` — React + Vite + Tailwind + shadcn/ui
- `apps/api` — NestJS + Prisma + Postgres (Neon)
- `packages/shared` — tipos y schemas Zod compartidos

## Dev

```bash
pnpm install
docker compose up -d postgres     # Postgres local en :5432
docker compose up -d adminer      # opcional, UI de DB en :8080
pnpm --filter @liga/api prisma migrate dev
pnpm dev:api                      # http://localhost:3000
pnpm dev:web                      # http://localhost:5173
```

## Deploy (Railway)

Servicios: `api` (Dockerfile en `apps/api`) + `web` (Dockerfile en `apps/web`) + Postgres plugin.
- `apps/api/Dockerfile` aplica `prisma migrate deploy` en startup.
- `apps/web/Dockerfile` build con `VITE_API_URL` apuntando al dominio del servicio API.

## Plan completo

Ver `/home/ruben/.claude-personal/plans/groovy-marinating-yao.md`.
