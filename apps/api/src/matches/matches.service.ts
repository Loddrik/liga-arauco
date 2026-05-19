import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Match } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapMatch } from '../common/mappers';
import { NmService } from '../nm/nm.service';
import type { MatchDto } from '@liga/shared';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private nm: NmService,
  ) {}

  async upcoming(limit = 3): Promise<MatchDto[]> {
    const matches = await this.prisma.match.findMany({
      where: { status: 'SCHEDULED' },
      include: { round: true, homeTeam: true, awayTeam: true },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
    return matches.map(mapMatch);
  }

  async recent(limit = 6): Promise<MatchDto[]> {
    const matches = await this.prisma.match.findMany({
      where: { status: 'PLAYED' },
      include: { round: true, homeTeam: true, awayTeam: true },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });
    return matches.map(mapMatch);
  }

  /**
   * Devuelve config para que el frontend embeba la galería NM del partido.
   * Si el match aún no está sincronizado (nmEventId is null), retorna nulls
   * y el frontend muestra un placeholder.
   */
  async getPhotosConfig(matchId: string): Promise<{
    slug: string | null;
    embedUrl: string | null;
    qrUrl: string | null;
  }> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true },
    });
    if (!match) throw new NotFoundException(`match "${matchId}" not found`);

    if (!match.nmEventSlug) {
      return { slug: null, embedUrl: null, qrUrl: null };
    }

    const primaryColor = match.homeTeam?.primaryColor ?? null;
    const embedUrl = this.nm.buildEmbedUrl(match.nmEventSlug, primaryColor);
    // El QR apunta al endpoint propio que stream-ea un PNG; así el front
    // sólo necesita un <img src="…">.
    const qrUrl = `/api/matches/${match.id}/qr.png`;

    return {
      slug: match.nmEventSlug,
      embedUrl,
      qrUrl,
    };
  }

  /**
   * Devuelve la URL pública (no-embed) del evento NM, usada para encodear
   * en el QR. Si no está sincronizado, retorna null.
   */
  async getPublicEventUrl(matchId: string): Promise<string | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { nmEventSlug: true },
    });
    if (!match?.nmEventSlug) return null;
    return this.nm.buildPublicUrl(match.nmEventSlug);
  }

  /**
   * Sincroniza un match con Nuestro Momento creando el evento correspondiente.
   * Idempotente: si el match ya tiene nmEventId, no hace nada.
   * Esta función NO debe tirar errores que bloqueen el flujo principal —
   * los callers que la disparan async hacen `.catch(...)`.
   */
  async syncMatch(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) {
      this.logger.warn(`syncMatch: match ${matchId} no existe, skip`);
      return;
    }
    if (match.nmEventId) {
      this.logger.log(
        `syncMatch: match ${matchId} ya tiene nmEventId=${match.nmEventId}, skip`,
      );
      return;
    }
    if (!this.nm.isEnabled()) {
      this.logger.warn(
        `syncMatch: NM deshabilitado (sin NM_API_KEY), skip ${matchId}`,
      );
      return;
    }

    const homeName = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD';
    const awayName = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD';
    const homeSlug = match.homeTeam?.slug ?? slugify(homeName);
    const awaySlug = match.awayTeam?.slug ?? slugify(awayName);
    const datePart = match.scheduledAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const displayDate = formatDateEs(match.scheduledAt);

    const eventName = `${homeName} vs ${awayName} — ${displayDate}`;
    const slug = `liga-arauco-${datePart}-${homeSlug}-vs-${awaySlug}`;
    const primaryColor = match.homeTeam?.primaryColor;

    const event = await this.nm.createEvent({
      name: eventName,
      // NM acepta 'corporate' como event_type genérico — el spec pedía
      // 'deporte', pero la API NM no lo tiene en su lista todavía
      // (ver PENDING-OPS en nuestros-momentos).
      event_type: 'corporate',
      event_date: datePart,
      slug,
      external_id: match.id,
      ...(primaryColor ? { primary_color: primaryColor } : {}),
    });

    await this.prisma.match.update({
      where: { id: match.id },
      data: {
        nmEventId: event.id,
        nmEventSlug: event.slug,
        nmSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `syncMatch: match ${matchId} → NM event ${event.id} (slug=${event.slug})`,
    );
  }

  /**
   * Dispara syncMatch en background sin bloquear al caller.
   * Usado por endpoints de create/update de match.
   */
  fireSyncMatch(match: Pick<Match, 'id'>) {
    this.syncMatch(match.id).catch(err => {
      this.logger.error(
        `syncMatch background falló para match ${match.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
}

function formatDateEs(d: Date): string {
  // dd/mm/yyyy
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
