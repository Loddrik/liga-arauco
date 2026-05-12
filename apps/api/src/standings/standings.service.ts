import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapTeam } from '../common/mappers';
import type { StandingRowDto } from '@liga/shared';

// Sistema FIBA estándar: victoria=2, derrota=1, no presentado/postponed=0.
const POINTS_WIN = 2;
const POINTS_LOSS = 1;

interface CacheEntry {
  data: StandingRowDto[];
  expiresAt: number;
}

@Injectable()
export class StandingsService {
  private cache: CacheEntry | null = null;
  private readonly TTL_MS = 30_000;

  constructor(private prisma: PrismaService) {}

  async calculate(): Promise<StandingRowDto[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    const [teams, played] = await Promise.all([
      this.prisma.team.findMany(),
      this.prisma.match.findMany({
        where: { status: 'PLAYED', homeScore: { not: null }, awayScore: { not: null } },
      }),
    ]);

    const rows = teams.map<StandingRowDto>(t => ({
      team: mapTeam(t),
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      leaguePoints: 0,
    }));
    const byId = new Map(rows.map(r => [r.team.id, r]));

    for (const m of played) {
      if (!m.homeTeamId || !m.awayTeamId || m.homeScore == null || m.awayScore == null) continue;
      const home = byId.get(m.homeTeamId);
      const away = byId.get(m.awayTeamId);
      if (!home || !away) continue;

      home.played += 1;
      away.played += 1;
      home.pointsFor += m.homeScore;
      home.pointsAgainst += m.awayScore;
      away.pointsFor += m.awayScore;
      away.pointsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) {
        home.wins += 1;
        away.losses += 1;
        home.leaguePoints += POINTS_WIN;
        away.leaguePoints += POINTS_LOSS;
      } else if (m.awayScore > m.homeScore) {
        away.wins += 1;
        home.losses += 1;
        away.leaguePoints += POINTS_WIN;
        home.leaguePoints += POINTS_LOSS;
      }
    }

    for (const r of rows) r.pointDifferential = r.pointsFor - r.pointsAgainst;

    rows.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return a.team.name.localeCompare(b.team.name);
    });

    this.cache = { data: rows, expiresAt: Date.now() + this.TTL_MS };
    return rows;
  }

  invalidate() {
    this.cache = null;
  }
}
