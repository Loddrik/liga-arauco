import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createPlayerSchema,
  updatePlayerSchema,
  type CreatePlayerInput,
  type UpdatePlayerInput,
} from '@liga/shared';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ZodValidationPipe } from '../common/zod.pipe';
import { PlayersService } from '../players/players.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminPlayersController {
  constructor(private players: PlayersService) {}

  @Get('teams/:teamId/players')
  list(@Param('teamId') teamId: string) {
    return this.players.listAdminByTeamId(teamId);
  }

  @Post('teams/:teamId/players')
  create(
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(createPlayerSchema)) body: CreatePlayerInput,
  ) {
    return this.players.create(teamId, body);
  }

  @Patch('players/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlayerSchema)) body: UpdatePlayerInput,
  ) {
    return this.players.update(id, body);
  }

  @Delete('players/:id')
  remove(@Param('id') id: string) {
    return this.players.remove(id);
  }
}
