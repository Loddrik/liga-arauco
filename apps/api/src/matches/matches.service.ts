import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Match } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPlayerStatRows,
  mapMatch,
  mapMatchPeriod,
} from '../common/mappers';
import { NmService } from '../nm/nm.service';
import { StandingsService } from '../standings/standings.service';
import type {
  MatchDto,
  MatchStatsDto,
  UpsertMatchStatsInput,
} from '@liga/shared';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private nm: NmService,
    private standings: StandingsService,
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

  /**
   * Lee las stats de un partido. Para cada equipo devuelve el roster completo
   * (jugaron o no) para que el admin pueda editar a cualquier jugador sin
   * tener que diferenciar entre "tiene row" y "no tiene row".
   */
  async getMatchStats(matchId: string): Promise<MatchStatsDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeamId: true, awayTeamId: true },
    });
    if (!match) throw new NotFoundException(`match "${matchId}" not found`);
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new BadRequestException(
        'No se pueden cargar stats si el partido no tiene ambos equipos asignados.',
      );
    }

    const [periods, stats, homeRoster, awayRoster] = await Promise.all([
      this.prisma.matchPeriod.findMany({
        where: { matchId },
        orderBy: { period: 'asc' },
      }),
      this.prisma.matchPlayerStat.findMany({ where: { matchId } }),
      this.prisma.player.findMany({
        where: { teamId: match.homeTeamId },
        orderBy: [{ jersey: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.player.findMany({
        where: { teamId: match.awayTeamId },
        orderBy: [{ jersey: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      matchId,
      periods: periods.map(mapMatchPeriod),
      homePlayers: buildPlayerStatRows(homeRoster, stats),
      awayPlayers: buildPlayerStatRows(awayRoster, stats),
    };
  }

  /**
   * Upsert masivo de stats del partido. Reemplaza períodos y stats por jugador
   * con los del payload (delete + create en transacción).
   *
   * Side effects:
   * - Recalcula Match.homeScore/awayScore a partir de la suma de períodos.
   * - Si hay períodos, marca Match.status='PLAYED'.
   * - Invalida cache de standings.
   *
   * Valida que cada playerStat.playerId pertenezca al roster de uno de los
   * dos equipos del partido (anti-data-corruption).
   */
  async upsertMatchStats(
    matchId: string,
    input: UpsertMatchStatsInput,
  ): Promise<MatchStatsDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeamId: true, awayTeamId: true },
    });
    if (!match) throw new NotFoundException(`match "${matchId}" not found`);
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new BadRequestException(
        'No se pueden cargar stats si el partido no tiene ambos equipos asignados.',
      );
    }

    // Validar que los playerIds pertenezcan a alguno de los dos rosters.
    const playerIds = input.playerStats.map(p => p.playerId);
    if (playerIds.length > 0) {
      const validPlayers = await this.prisma.player.findMany({
        where: {
          id: { in: playerIds },
          teamId: { in: [match.homeTeamId, match.awayTeamId] },
        },
        select: { id: true, teamId: true },
      });
      if (validPlayers.length !== new Set(playerIds).size) {
        throw new BadRequestException(
          'Algún jugador del payload no pertenece al roster de los equipos del partido.',
        );
      }
    }

    // Mapa playerId -> teamId para denormalizar al insertar.
    const teamByPlayerId = new Map<string, string>();
    if (playerIds.length > 0) {
      const players = await this.prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, teamId: true },
      });
      for (const p of players) teamByPlayerId.set(p.id, p.teamId);
    }

    const totals = input.periods.reduce(
      (acc, p) => ({
        home: acc.home + p.homePoints,
        away: acc.away + p.awayPoints,
      }),
      { home: 0, away: 0 },
    );

    await this.prisma.$transaction([
      this.prisma.matchPeriod.deleteMany({ where: { matchId } }),
      this.prisma.matchPlayerStat.deleteMany({ where: { matchId } }),
      ...(input.periods.length > 0
        ? [
            this.prisma.matchPeriod.createMany({
              data: input.periods.map(p => ({ matchId, ...p })),
            }),
          ]
        : []),
      ...(input.playerStats.length > 0
        ? [
            this.prisma.matchPlayerStat.createMany({
              data: input.playerStats.map(s => ({
                matchId,
                playerId: s.playerId,
                teamId: teamByPlayerId.get(s.playerId)!,
                played: s.played,
                points: s.points,
                fouls: s.fouls,
              })),
            }),
          ]
        : []),
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          homeScore: input.periods.length > 0 ? totals.home : null,
          awayScore: input.periods.length > 0 ? totals.away : null,
          ...(input.periods.length > 0 ? { status: 'PLAYED' as const } : {}),
        },
      }),
    ]);

    this.standings.invalidate();
    return this.getMatchStats(matchId);
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
