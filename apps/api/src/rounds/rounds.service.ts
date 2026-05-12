import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapRound } from '../common/mappers';
import type { RoundDto } from '@liga/shared';

@Injectable()
export class RoundsService {
  constructor(private prisma: PrismaService) {}

  async list(): Promise<RoundDto[]> {
    const rounds = await this.prisma.round.findMany({
      orderBy: { number: 'asc' },
      include: {
        matches: {
          include: { round: true, homeTeam: true, awayTeam: true },
        },
      },
    });
    return rounds.map(mapRound);
  }
}
