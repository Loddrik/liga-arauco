import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StandingsModule } from '../standings/standings.module';
import { MatchesModule } from '../matches/matches.module';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminTeamsController } from './admin-teams.controller';

@Module({
  imports: [AuthModule, StandingsModule, MatchesModule],
  controllers: [AdminMatchesController, AdminTeamsController],
})
export class AdminModule {}
