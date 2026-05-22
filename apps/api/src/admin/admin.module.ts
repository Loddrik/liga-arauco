import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StandingsModule } from '../standings/standings.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminTeamsController } from './admin-teams.controller';
import { AdminPlayersController } from './admin-players.controller';

@Module({
  imports: [AuthModule, StandingsModule, MatchesModule, PlayersModule],
  controllers: [AdminMatchesController, AdminTeamsController, AdminPlayersController],
})
export class AdminModule {}
