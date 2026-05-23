import type {
  Team,
  Match,
  Round,
  Player,
  MatchPeriod,
  MatchPlayerStat,
} from '@prisma/client';
import type {
  TeamDto,
  MatchDto,
  RoundDto,
  PlayerPublicDto,
  PlayerAdminDto,
  MatchPeriodDto,
  MatchPlayerStatDto,
} from '@liga/shared';

export function mapTeam(t: Team): TeamDto {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    instagramHandle: t.instagramHandle,
    logoUrl: t.logoUrl,
    logoSvgUrl: t.logoSvgUrl,
    coverPhotoUrl: t.coverPhotoUrl,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
  };
}

type MatchWithRelations = Match & {
  round: { number: number };
  homeTeam: Team | null;
  awayTeam: Team | null;
};

export function mapMatch(m: MatchWithRelations): MatchDto {
  return {
    id: m.id,
    number: m.number,
    roundNumber: m.round.number,
    scheduledAt: m.scheduledAt.toISOString(),
    homeTeam: m.homeTeam ? mapTeam(m.homeTeam) : null,
    awayTeam: m.awayTeam ? mapTeam(m.awayTeam) : null,
    homePlaceholder: m.homePlaceholder,
    awayPlaceholder: m.awayPlaceholder,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
  };
}

type RoundWithMatches = Round & {
  matches: MatchWithRelations[];
};

export function mapRound(r: RoundWithMatches): RoundDto {
  return {
    id: r.id,
    number: r.number,
    label: r.label,
    phase: r.phase,
    date: r.date.toISOString(),
    matches: r.matches.sort((a, b) => a.number - b.number).map(mapMatch),
  };
}

export function mapPlayerPublic(p: Player): PlayerPublicDto {
  return {
    id: p.id,
    name: p.name,
    jersey: p.jersey,
    position: p.position,
  };
}

export function mapPlayerAdmin(p: Player): PlayerAdminDto {
  return {
    ...mapPlayerPublic(p),
    rut: p.rut,
    teamId: p.teamId,
  };
}

export function mapMatchPeriod(p: MatchPeriod): MatchPeriodDto {
  return {
    period: p.period,
    homePoints: p.homePoints,
    awayPoints: p.awayPoints,
    homeTeamFouls: p.homeTeamFouls,
    awayTeamFouls: p.awayTeamFouls,
    homeTimeouts: p.homeTimeouts,
    awayTimeouts: p.awayTimeouts,
  };
}

// Combina el roster del equipo con las stats grabadas para producir un row
// por jugador, incluyendo los que no tienen stats (played=false, ceros).
export function buildPlayerStatRows(
  roster: Player[],
  stats: MatchPlayerStat[],
): MatchPlayerStatDto[] {
  const byPlayerId = new Map(stats.map(s => [s.playerId, s]));
  return roster.map(player => {
    const stat = byPlayerId.get(player.id);
    const fouls = stat?.fouls ?? 0;
    return {
      player: mapPlayerPublic(player),
      teamId: player.teamId,
      played: stat?.played ?? false,
      points: stat?.points ?? 0,
      fouls,
      fouledOut: fouls >= 5,
    };
  });
}
