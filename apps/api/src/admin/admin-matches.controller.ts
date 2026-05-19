import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from '../standings/standings.service';
import { MatchesService } from '../matches/matches.service';
import { NmService } from '../nm/nm.service';
import { ZodValidationPipe } from '../common/zod.pipe';
import { updateMatchSchema, type UpdateMatchInput } from '@liga/shared';
import { mapMatch } from '../common/mappers';

@Controller('admin/matches')
@UseGuards(JwtAuthGuard)
export class AdminMatchesController {
  private readonly logger = new Logger(AdminMatchesController.name);

  constructor(
    private prisma: PrismaService,
    private standings: StandingsService,
    private matches: MatchesService,
    private nm: NmService,
  ) {}

  @Get()
  async list() {
    const matches = await this.prisma.match.findMany({
      include: { round: true, homeTeam: true, awayTeam: true },
      orderBy: { number: 'asc' },
    });
    // mapMatch ignora los campos NM (no están en MatchDto), pero los inyectamos
    // aparte para que el frontend del admin pueda mostrar el badge.
    return matches.map(m => ({
      ...mapMatch(m),
      nmEventId: m.nmEventId,
      nmEventSlug: m.nmEventSlug,
      nmSyncedAt: m.nmSyncedAt?.toISOString() ?? null,
    }));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMatchSchema)) body: UpdateMatchInput,
  ) {
    const inferredStatus =
      body.status ??
      (body.homeScore != null && body.awayScore != null ? 'PLAYED' : undefined);

    const updated = await this.prisma.match.update({
      where: { id },
      data: { ...body, ...(inferredStatus ? { status: inferredStatus } : {}) },
      include: { round: true, homeTeam: true, awayTeam: true },
    });

    this.standings.invalidate();

    // Sync con NM en background (no bloquea response).
    // Idempotente: si ya tiene nmEventId no hace nada.
    this.matches.fireSyncMatch(updated);

    return mapMatch(updated);
  }

  /**
   * Re-sincroniza un partido específico con NM.
   * Útil cuando la sync inicial falló y el admin quiere reintentar manualmente.
   */
  @Post(':id/nm-sync')
  async manualSync(@Param('id') id: string) {
    await this.matches.syncMatch(id);
    const match = await this.prisma.match.findUnique({ where: { id } });
    return {
      ok: true,
      nmEventId: match?.nmEventId ?? null,
      nmEventSlug: match?.nmEventSlug ?? null,
      nmSyncedAt: match?.nmSyncedAt?.toISOString() ?? null,
    };
  }

  /**
   * Backfill: crea eventos NM para todos los partidos que aún no están
   * sincronizados (nmEventId IS NULL). Lo hace en chunks de 50 vía bulk.
   *
   * Idempotente al lado NM porque `external_id=match.id` y NM dedupea.
   */
  @Post('backfill-nm-events')
  async backfill() {
    if (!this.nm.isEnabled()) {
      return {
        created: 0,
        existing: 0,
        skipped: 0,
        failed: 0,
        errors: ['NM_API_KEY no está configurada'],
      };
    }

    const pending = await this.prisma.match.findMany({
      where: { nmEventId: null },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { scheduledAt: 'asc' },
    });

    if (pending.length === 0) {
      return { created: 0, existing: 0, skipped: 0, failed: 0, errors: [] };
    }

    let created = 0;
    let existing = 0;
    let failed = 0;
    const errors: string[] = [];

    const chunkSize = 50;
    for (let i = 0; i < pending.length; i += chunkSize) {
      const chunk = pending.slice(i, i + chunkSize);
      const events = chunk.map(m => buildEventPayload(m));

      try {
        const result = await this.nm.bulkCreateEvents({ events });

        // Map externo_id → match para actualizar Prisma.
        const byExternal = new Map<string, (typeof result.created)[number]>();
        for (const e of result.created) {
          if (e.external_id) byExternal.set(e.external_id, e);
        }
        for (const e of result.existing) {
          if (e.external_id) byExternal.set(e.external_id, e);
        }

        const now = new Date();
        await this.prisma.$transaction(
          chunk
            .map(m => {
              const e = byExternal.get(m.id);
              if (!e) return null;
              return this.prisma.match.update({
                where: { id: m.id },
                data: {
                  nmEventId: e.id,
                  nmEventSlug: e.slug,
                  nmSyncedAt: now,
                },
              });
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
        );

        created += result.created.length;
        existing += result.existing.length;
        if (result.errors?.length) {
          failed += result.errors.length;
          for (const err of result.errors) {
            errors.push(`item ${err.index}: ${err.error}`);
          }
        }
      } catch (err) {
        failed += chunk.length;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`chunk ${i / chunkSize}: ${msg}`);
        this.logger.error(`backfill chunk ${i / chunkSize} failed: ${msg}`);
      }
    }

    return {
      created,
      existing,
      skipped: 0,
      failed,
      errors,
    };
  }
}

// Helper local (duplica un poco la lógica de matches.service.syncMatch, pero
// para bulk necesitamos construir el payload sin disparar requests individuales)
function buildEventPayload(m: {
  id: string;
  scheduledAt: Date;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeTeam: { name: string; slug: string; primaryColor: string } | null;
  awayTeam: { name: string; slug: string } | null;
}) {
  const homeName = m.homeTeam?.name ?? m.homePlaceholder ?? 'TBD';
  const awayName = m.awayTeam?.name ?? m.awayPlaceholder ?? 'TBD';
  const homeSlug = m.homeTeam?.slug ?? slugify(homeName);
  const awaySlug = m.awayTeam?.slug ?? slugify(awayName);
  const datePart = m.scheduledAt.toISOString().slice(0, 10);
  const displayDate = formatDateEs(m.scheduledAt);

  return {
    name: `${homeName} vs ${awayName} — ${displayDate}`,
    event_type: 'corporate' as const,
    event_date: datePart,
    slug: `liga-arauco-${datePart}-${homeSlug}-vs-${awaySlug}`,
    external_id: m.id,
    ...(m.homeTeam?.primaryColor
      ? { primary_color: m.homeTeam.primaryColor }
      : {}),
  };
}

function formatDateEs(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
