import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapMatch } from '../common/mappers';
import type { MatchDto } from '@liga/shared';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

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
}
