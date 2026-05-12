import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private matches: MatchesService) {}

  @Get('upcoming')
  upcoming(@Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number) {
    return this.matches.upcoming(limit);
  }

  @Get('recent')
  recent(@Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number) {
    return this.matches.recent(limit);
  }
}
