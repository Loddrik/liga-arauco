import type { Team, Match, Round } from '@prisma/client';
import type { TeamDto, MatchDto, RoundDto } from '@liga/shared';

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
