import { Controller, Get, Param } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('teams/:slug/players')
export class PlayersController {
  constructor(private players: PlayersService) {}

  @Get()
  list(@Param('slug') slug: string) {
    return this.players.listPublicByTeamSlug(slug);
  }
}
