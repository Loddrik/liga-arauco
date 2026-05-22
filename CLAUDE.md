# Liga Arauco — Claude Instructions

> Sitio público + admin para la **Liga de Básquetbol Arauco (LBA) 2026**: fixture, resultados, tabla de posiciones y galerías de fotos por partido.

## Project Overview

**Purpose**: Web informativa para hinchas/jugadores + panel admin para que la organización cargue resultados. Proyecto freelance/portafolio para una liga amateur de 8 equipos en Arauco (Chile).

**Domain**: Básquetbol amateur — fixture fijo, 32 partidos, 12 fechas (10 regulares + semis + final), sábados 03/05/2026 → 19/07/2026.

**Key Entities**: `Team` (8 fijos), `Round` (12 fechas), `Match` (32 partidos, números 1-32), `AdminUser`.

**Deploy**: Railway (3 servicios: Postgres + api + web, todos vía Dockerfile).
- Web pública: https://liga-web-production.up.railway.app
- API: https://liga-api-production.up.railway.app/api
- Admin: `/admin/login` con `admin@liga-arauco.cl`

## Tech Stack

- **Monorepo**: pnpm workspaces (Node ≥22)
- **Frontend** (`apps/web`): React 18 + Vite + Tailwind + shadcn/ui + React Router + TanStack Query + Axios
- **Backend** (`apps/api`): NestJS 10 + Prisma 5 + Postgres + JWT (passport-jwt + bcrypt) + Zod + class-validator
- **Shared** (`packages/shared`): tipos TS + schemas Zod compartidos entre front y back
- **DB**: Postgres (Railway plugin en prod, docker-compose local en `:5432`)

## Path Aliases

**Web** (`apps/web/tsconfig.json` + `vite.config.ts`):
- `@/*` → `apps/web/src/*`

**API**: sin aliases custom — imports relativos desde `apps/api/src/`.

**Shared**: importar como `@liga/shared` desde web o api (workspace).

## Critical Rules

### ALWAYS
- **Recalcular standings derivados**: nunca persistir tabla — usar `StandingsService.calculate()`. Tiene cache TTL 30s; llamar `standings.invalidate()` tras cualquier mutación de match.
- **Compartir tipos vía `@liga/shared`**: si un endpoint devuelve un DTO o consume un schema, definirlo en `packages/shared/src/` (types.ts para DTOs, schemas.ts para validación Zod). Después correr `pnpm --filter @liga/shared build` o el `dev` watcher.
- **NM sync en background**: tras crear/editar match desde admin usar `matches.fireSyncMatch(updated)` — NUNCA `await syncMatch(...)` desde un endpoint, no bloquear la response.
- **Re-correr `update-results.ts` después de cualquier `db:seed`**: el seed hace upsert y revierte resultados ya cargados (notablemente match 5).
- **Validar inputs admin con Zod**: `@Body(new ZodValidationPipe(schema))` usando los schemas de `@liga/shared`.

### NEVER
- **No persistir standings**: derivados de matches con `status=PLAYED`. Cambiar esto rompe la única fuente de verdad.
- **No commitear `NM_API_KEY`**: la emite `scripts/seed-liga-arauco.ts` del repo `nuestros-momentos`. Solo va en env vars de Railway / `.env` local.
- **No tirar errores desde `syncMatch` al caller principal**: NM puede estar caído o sin key — la app debe seguir funcionando. Loguear y seguir.
- **No tocar `Match.number` ni `Round.number`**: son identificadores estables que se usan en URLs públicas y en el backfill de NM (`external_id = match.id`, pero el number lo ven los hinchas).
- **No introducir arquitectura hexagonal**: scope no lo justifica, decisión tomada (ver memoria). Patrón estándar Nest: controller → service → prisma.

## File Structure

```
apps/api/src/
├── main.ts                  # bootstrap, CORS, prefix /api, ValidationPipe global
├── app.module.ts
├── prisma/                  # PrismaService + PrismaModule
├── auth/                    # JWT login admin (email+password, bcrypt)
├── teams/                   # GET público de equipos
├── rounds/                  # GET público fixture por fecha
├── matches/                 # GET públicos + integración NM (sync, photos, qr)
├── standings/               # cálculo derivado con cache 30s
├── admin/                   # endpoints protegidos JwtAuthGuard (matches, teams, nm-sync)
├── nm/                      # cliente HTTP de Nuestro Momento (retry, logger, test seam)
└── common/                  # mappers (Prisma → DTO) + ZodValidationPipe

apps/api/prisma/
├── schema.prisma            # Team, Round, Match, AdminUser + enums
├── seed.ts                  # carga 8 equipos + 32 matches (upsert — cuidado en prod)
├── update-results.ts        # carga resultados de partidos ya jugados
└── extract-logos.ts         # procesa logos PNG → colores con node-vibrant + sharp

apps/web/src/
├── App.tsx                  # rutas públicas + admin con RequireAuth
├── lib/
│   ├── http.ts              # cliente axios con baseURL y JWT
│   ├── api.ts               # llamadas públicas
│   ├── admin-api.ts         # llamadas admin (con token)
│   └── auth.tsx             # AuthProvider + RequireAuth + useAuth
├── pages/
│   ├── Home, Fixture, Standings, TeamDetail, MatchDetail
│   └── admin/ (Login, Dashboard, MatchEditor, TeamsAdmin, NmSync)
└── components/
    ├── Layout, AdminLayout
    ├── StandingsTable, MatchCard, TeamBadge, ScoresTicker, PhotosAnnouncement
    └── match/MatchPhotosSection.tsx  # iframe + QR de NM

packages/shared/src/
├── types.ts                 # TeamDto, MatchDto, RoundDto, StandingRowDto
├── schemas.ts               # loginSchema, updateMatchSchema, updateTeamSchema, assignPlayoffSchema
└── index.ts
```

## Domain Models

- **Team**: `slug` (único, usado en URLs), `name`, `shortName`, `instagramHandle`, `logoUrl`/`logoSvgUrl`, `primaryColor`/`secondaryColor` (hex). 8 equipos fijos: BasketArauco, Buffalos, Huillines, Navidad, Ragko, Laraquete, Lafken, Lautaro.
- **Round**: `number` (1-12 único), `label`, `phase` (REGULAR | SEMI | FINAL), `date`.
- **Match**: `number` (1-32 único), pertenece a `Round`, opcional `homeTeam`/`awayTeam` (en playoffs puede haber `homePlaceholder`/`awayPlaceholder` tipo "Ganador G1"), `homeScore`/`awayScore`, `status` (SCHEDULED | PLAYED | POSTPONED), campos NM: `nmEventId`, `nmEventSlug`, `nmSyncedAt`.
- **AdminUser**: `email` único + `passwordHash` (bcrypt).

## Business Rules

- **Puntos liga (FIBA estándar)**: victoria = 2, derrota = 1, no presentado/postponed = 0. Si la liga decide otro sistema, cambiar las constantes en `standings.service.ts` (`POINTS_WIN`, `POINTS_LOSS`).
- **Ordenamiento standings**: leaguePoints DESC → pointDifferential DESC → pointsFor DESC → name ASC.
- **Inferencia de status en admin**: si el editor envía `homeScore` y `awayScore` no nulos sin especificar `status`, se asume `PLAYED`. Ver `AdminMatchesController.update()`.
- **Standings cache**: TTL 30s, invalidar explícitamente tras `PATCH /admin/matches/:id`.
- **Galería NM**: cada match se sincroniza como un "event" en Nuestro Momento (org `liga-arauco`). `external_id = match.id` para dedupe idempotente. Si la primera sync falla, hay backfill manual en `/admin/nm-sync`.
- **Sin NM_API_KEY**: la app sigue arrancando (warn en logs), pero los endpoints NM tiran 503. El sitio sigue funcionando sin galerías.

## Common Workflows

**Cargar resultado de un partido** (admin):
1. `POST /api/auth/login` → JWT.
2. `PATCH /api/admin/matches/:id` con `{ homeScore, awayScore }`.
3. Server: actualiza match → `standings.invalidate()` → `matches.fireSyncMatch(updated)` async.
4. Front: TanStack Query refetch automático de fixture + standings.

**Subir fotos a un partido** (usuario final):
1. En `/partidos/:id`, hinchas ven QR + iframe embebido de NM.
2. QR apunta a `/api/matches/:id/qr.png` que sirve PNG generado con `qrcode`.
3. Mobile escanea → abre URL pública de NM (`{NM_API_BASE_URL}/e/{slug}`) → suben fotos.
4. iframe en `MatchPhotosSection.tsx` valida `event.origin === VITE_NM_BASE_URL` para postMessage.

**Backfill global NM** (si quedaron matches sin syncar):
1. `/admin/nm-sync` lista matches sin `nmEventId`.
2. Botón "Sync todos" o por fila → llama endpoint admin que itera y sincroniza.
3. Idempotente: NM dedupea por `external_id`.

## Inter-Service Dependencies

| Servicio | Dirección | Datos intercambiados |
|----------|-----------|----------------------|
| Nuestro Momento (NM) | API → NM | `POST /api/org/v1/events` (crea galería), `GET /events/:id`, `GET /events/:id/photos`. Auth: `Bearer NM_API_KEY`. |
| Postgres (Railway) | API ↔ DB | Prisma client. Migraciones se aplican en startup via `prisma migrate deploy` (Dockerfile). |
| Frontend Web | Web → API | Axios con `VITE_API_URL`. JWT en localStorage para admin. |
| NM iframe | Web ⇄ NM | postMessage para autoresize. Validar `event.origin` contra `VITE_NM_BASE_URL`. |

## Development Workflow

```bash
pnpm install
docker compose up -d postgres                       # Postgres local :5432
docker compose up -d adminer                        # opcional, UI DB :8080
pnpm --filter @liga/api prisma migrate dev          # aplica migraciones
pnpm --filter @liga/api db:seed                     # carga 8 equipos + 32 matches
pnpm --filter @liga/api tsx prisma/update-results.ts  # resultados fechas 1-2 ya jugadas
pnpm dev:api                                        # http://localhost:3000/api
pnpm dev:web                                        # http://localhost:5173
pnpm build                                          # build recursivo
pnpm lint
```

**Env vars críticas** (apps/api): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NM_API_BASE_URL`, `NM_API_KEY`.
**Env vars críticas** (apps/web, build-time): `VITE_API_URL`, `VITE_NM_BASE_URL`.

## Skills Reference

| Skill | Cuándo |
|-------|--------|
| `verify` | Antes de declarar listo cualquier cambio UI/admin — correr el dev server y probar. |
| `simplify` | Después de implementar una feature, revisar reuse/calidad. |
| `run` | Para levantar el stack y tomar screenshot. |

**Nota**: este repo NO sigue los standards de Red Pine (`backend-standards`, `frontend-standards`, `component-creator`, etc.). Es un proyecto standalone con su propio patrón Nest modular + React+shadcn directo.
