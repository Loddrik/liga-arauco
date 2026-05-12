import { Controller, Get } from '@nestjs/common';
import { RoundsService } from './rounds.service';

@Controller('rounds')
export class RoundsController {
  constructor(private rounds: RoundsService) {}

  @Get()
  list() {
    return this.rounds.list();
  }
}
