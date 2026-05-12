import { Controller, Get, Param } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private teams: TeamsService) {}

  @Get()
  list() {
    return this.teams.list();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.teams.findBySlug(slug);
  }
}
