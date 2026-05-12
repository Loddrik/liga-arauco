import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from '../standings/standings.service';
import { ZodValidationPipe } from '../common/zod.pipe';
import { updateMatchSchema, type UpdateMatchInput } from '@liga/shared';
import { mapMatch } from '../common/mappers';

@Controller('admin/matches')
@UseGuards(JwtAuthGuard)
export class AdminMatchesController {
  constructor(
    private prisma: PrismaService,
    private standings: StandingsService,
  ) {}

  @Get()
  async list() {
    const matches = await this.prisma.match.findMany({
      include: { round: true, homeTeam: true, awayTeam: true },
      orderBy: { number: 'asc' },
    });
    return matches.map(mapMatch);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMatchSchema)) body: UpdateMatchInput,
  ) {
    // Si se cargan ambos scores y status no está explícito, marcamos PLAYED.
    const inferredStatus =
      body.status ??
      (body.homeScore != null && body.awayScore != null ? 'PLAYED' : undefined);

    const updated = await this.prisma.match.update({
      where: { id },
      data: { ...body, ...(inferredStatus ? { status: inferredStatus } : {}) },
      include: { round: true, homeTeam: true, awayTeam: true },
    });

    this.standings.invalidate();
    return mapMatch(updated);
  }
}
