import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapTeam, mapMatch } from '../common/mappers';
import type { TeamDto, MatchDto } from '@liga/shared';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async list(): Promise<TeamDto[]> {
    const teams = await this.prisma.team.findMany({ orderBy: { name: 'asc' } });
    return teams.map(mapTeam);
  }

  async findBySlug(slug: string): Promise<{ team: TeamDto; matches: MatchDto[] }> {
    const team = await this.prisma.team.findUnique({ where: { slug } });
    if (!team) throw new NotFoundException(`team "${slug}" not found`);

    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: { round: true, homeTeam: true, awayTeam: true },
      orderBy: { number: 'asc' },
    });

    return { team: mapTeam(team), matches: matches.map(mapMatch) };
  }
}
