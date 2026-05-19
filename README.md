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

## Integración con Nuestro Momento (galerías de fotos)

Cada partido se sincroniza como un "evento" en Nuestro Momento para alojar
una galería de fotos pública. El sitio embebe la galería en `/partidos/:id`
vía iframe y muestra un QR imprimible para que los asistentes suban fotos
con su celular.

**Env vars requeridas** (apps/api):
- `NM_API_BASE_URL` — base del deploy NM (dev: `http://localhost:3000`, prod: `https://nuestro-momento.cl`)
- `NM_API_KEY` — API key emitida por `scripts/seed-liga-arauco.ts` del repo NM. Nunca commitear.
- `NM_ORG_SLUG=liga-arauco` (informativo)

**Env vars requeridas** (apps/web):
- `VITE_NM_BASE_URL` — mismo origen de NM. Se usa para validar `event.origin` del postMessage del iframe.

**Operación**:
1. Al crear/editar un match desde el admin, el API dispara sync async con NM (no bloquea).
2. Si la primera sync falla, usar el botón "Sync" por fila o ejecutar el backfill global en `/admin/nm-sync`.
3. El backfill es idempotente (NM dedupea por `external_id = match.id`).

Ver spec en `.backlog/in-progress/2026-05-004-liga-arauco-match-photos-integration.md`.

## Plan completo

Ver `/home/ruben/.claude-personal/plans/groovy-marinating-yao.md`.
