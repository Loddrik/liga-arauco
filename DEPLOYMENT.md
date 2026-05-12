# Deploy a Railway

Guía paso a paso para desplegar Liga Arauco en Railway.

## Arquitectura productiva

```
┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  liga-web       │       │  liga-api        │       │  liga-postgres   │
│  (nginx + Vite) │──HTTPS│  (NestJS)        │──TCP─▶│  (plugin Railway)│
│  ${WEB_URL}     │       │  ${API_URL}/api  │       │                  │
└─────────────────┘       └──────────────────┘       └──────────────────┘
```

3 servicios independientes en un mismo proyecto Railway:
- **liga-postgres**: plugin oficial. Provee `DATABASE_URL` automáticamente.
- **liga-api**: build desde `apps/api/Dockerfile`. Corre `prisma migrate deploy` en startup.
- **liga-web**: build desde `apps/web/Dockerfile`. Sirve estáticos con nginx; recibe `VITE_API_URL` en build time.

## Prerrequisitos

1. Cuenta en [railway.com](https://railway.com) (~$5/mes Hobby).
2. Repo en GitHub (Railway tira deploys desde ramas Git).
3. Railway CLI opcional pero recomendado:
   ```bash
   curl -fsSL https://railway.com/install.sh | sh
   railway login
   ```

## Pasos

### 1 · Crear el proyecto en Railway

1. New Project → **Deploy from GitHub repo** → seleccionar `liga-arauco`.
2. Railway intentará auto-detectar el servicio. Cancelar la auto-detección porque tenemos monorepo.
3. Borrar el servicio creado por default; agregaremos los servicios manualmente.

### 2 · Agregar Postgres

1. En el proyecto, click **+ New** → **Database** → **Add PostgreSQL**.
2. Esperar a que aparezca el servicio `Postgres`. Genera automáticamente la variable de referencia `${{ Postgres.DATABASE_URL }}` que usaremos en la API.

### 3 · Servicio `liga-api`

1. **+ New** → **GitHub Repo** → tu fork de `liga-arauco`, rama `main`.
2. En **Settings** del servicio:
   - **Service Name**: `liga-api`
   - **Root Directory**: `apps/api` (Railway lee `railway.json` desde acá)
   - **Watch Paths**: `apps/api/**`, `packages/shared/**`, `apps/api/prisma/**`
3. En **Variables**, agregar:
   ```env
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   JWT_SECRET=<generar uno random largo>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://${{liga-web.RAILWAY_PUBLIC_DOMAIN}}
   ADMIN_EMAIL=tu@email.com
   ADMIN_PASSWORD=<password admin del dashboard>
   ```
   Generar JWT_SECRET así: `openssl rand -base64 48`.
4. En **Networking** → **Generate Domain** (queda algo como `liga-api-production-xxxx.up.railway.app`).
5. **Deploy**. El primer build tarda ~3-4 min. Logs deberían mostrar:
   ```
   Prisma schema loaded
   ... migrations applied ...
   Nest application successfully started
   API listening on http://localhost:3000/api
   ```
6. Probar: `curl https://liga-api-...up.railway.app/api/teams` → debería devolver `[]` (DB vacía).

### 4 · Seed inicial

Hay datos pre-existentes (fixture, equipos, resultados). Subirlos una vez:

```bash
# Conectarse al servicio liga-api por shell
railway shell --service liga-api

# Dentro del shell del container:
./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx prisma/update-results.ts
./node_modules/.bin/tsx prisma/extract-logos.ts
exit
```

Si `extract-logos.ts` falla (los URLs de IG pueden expirar), saltarlo y usar el admin para subir logos manualmente.

Validar:
```bash
curl https://liga-api-....up.railway.app/api/teams | jq length    # → 8
curl https://liga-api-....up.railway.app/api/standings | jq '.[0].team.name'  # → "Navidad"
```

### 5 · Servicio `liga-web`

1. **+ New** → **GitHub Repo** → mismo repo.
2. **Settings**:
   - **Service Name**: `liga-web`
   - **Root Directory**: `apps/web`
   - **Watch Paths**: `apps/web/**`, `packages/shared/**`
3. **Variables** → **Build Variables** (no runtime, son para `docker build`):
   ```env
   VITE_API_URL=https://${{liga-api.RAILWAY_PUBLIC_DOMAIN}}/api
   ```
4. **Networking** → **Generate Domain**.
5. **Deploy**.

### 6 · Cross-link

Volver al servicio `liga-api` y actualizar `CORS_ORIGIN` para apuntar al dominio real de web:
```env
CORS_ORIGIN=https://liga-web-production-xxxx.up.railway.app
```
Esto fuerza un re-deploy de la API. ~1 min.

### 7 · Probar end-to-end

1. Abrir el dominio de `liga-web` en el browser.
2. Verificar Home, Fixture, Tabla, TeamDetail.
3. `/admin/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD` de las env vars.
4. Editar un partido → ver que la home se actualiza.

## Dominio custom (opcional)

Cuando esté listo:
1. En el servicio `liga-web`, **Networking** → **Custom Domain** → ingresar `ligaarauco.cl` (o el dominio que tengas).
2. Railway muestra los registros DNS a configurar (`CNAME` o `A`).
3. Actualizar `CORS_ORIGIN` en `liga-api` al nuevo dominio.

## Re-deploys

Por default, cada push a `main` dispara deploy en ambos servicios (con las `Watch Paths` configuradas, solo el servicio afectado se re-buildea).

## Costos esperados

- Postgres plugin: ~$5/mes incluido en plan Hobby ($5 mensual con $5 de crédito incluidos).
- Cada servicio: pay-per-use, usualmente <$1/mes para tráfico bajo.
- Total proyectado para esta liga (tráfico bajo): **~$5-7/mes**.

## Troubleshooting

| Síntoma | Probable causa | Fix |
|---|---|---|
| Build de api falla en `prisma generate` | Falta `binaryTargets` linux-musl | Ya está en schema.prisma; verificar que el cambio se commiteó |
| Frontend ve `/api/teams 404` | `VITE_API_URL` no se inyectó en build | Verificar Build Variables en Railway, redeployar |
| 401 desde admin después de login | `JWT_SECRET` distinto entre login y request | Verificar que la env var no cambió entre deploys |
| CORS error en consola | `CORS_ORIGIN` no incluye el dominio del web | Actualizar var en `liga-api` |
| `prisma migrate deploy` cuelga | DB no accesible | Verificar referencia `${{ Postgres.DATABASE_URL }}` |
