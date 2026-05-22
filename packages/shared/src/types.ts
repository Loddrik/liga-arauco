export type MatchStatus = 'SCHEDULED' | 'PLAYED' | 'POSTPONED';
export type RoundPhase = 'REGULAR' | 'SEMI' | 'FINAL';

export interface TeamDto {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  instagramHandle: string | null;
  logoUrl: string | null;
  logoSvgUrl: string | null;
  coverPhotoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
}

export interface MatchDto {
  id: string;
  number: number;
  roundNumber: number;
  scheduledAt: string;
  homeTeam: TeamDto | null;
  awayTeam: TeamDto | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
}

export interface RoundDto {
  id: string;
  number: number;
  label: string;
  phase: RoundPhase;
  date: string;
  matches: MatchDto[];
}

export interface StandingRowDto {
  team: TeamDto;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  leaguePoints: number;
}
