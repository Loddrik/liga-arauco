import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/zod.pipe';
import { updateTeamSchema, type UpdateTeamInput } from '@liga/shared';
import { mapTeam } from '../common/mappers';

@Controller('admin/teams')
@UseGuards(JwtAuthGuard)
export class AdminTeamsController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: UpdateTeamInput,
  ) {
    const team = await this.prisma.team.update({ where: { id }, data: body });
    return mapTeam(team);
  }
}
