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

/** Vista pública del jugador (sin RUT). */
export interface PlayerPublicDto {
  id: string;
  name: string;
  jersey: number | null;
  position: string | null;
}

/** Vista admin del jugador (incluye RUT). */
export interface PlayerAdminDto extends PlayerPublicDto {
  rut: string;
  teamId: string;
}

/** Parcial de un período (cuarto u OT) de un partido. */
export interface MatchPeriodDto {
  period: number; // 1..4 = cuartos; 5+ = OT
  homePoints: number;
  awayPoints: number;
  homeTeamFouls: number;
  awayTeamFouls: number;
  homeTimeouts: number;
  awayTimeouts: number;
}

/** Stats de un jugador en un partido (puede no haber jugado: played=false). */
export interface MatchPlayerStatDto {
  player: PlayerPublicDto;
  teamId: string;
  played: boolean;
  points: number;
  fouls: number;
  fouledOut: boolean; // derivado: fouls >= 5
}

/** Bundle de estadísticas de un partido. */
export interface MatchStatsDto {
  matchId: string;
  periods: MatchPeriodDto[];
  // Stats por equipo, cada array incluye TODO el roster
  // (jugaron o no). Ordenados por jersey luego nombre.
  homePlayers: MatchPlayerStatDto[];
  awayPlayers: MatchPlayerStatDto[];
}
