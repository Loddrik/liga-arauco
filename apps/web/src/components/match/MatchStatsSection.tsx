import type { MatchPeriodDto, MatchPlayerStatDto, TeamDto } from '@liga/shared';
import { useMatchStats } from '@/lib/api';

const REGULAR_PERIODS = 4;

interface Props {
  matchId: string;
  homeTeam: TeamDto | null;
  awayTeam: TeamDto | null;
}

export function MatchStatsSection({ matchId, homeTeam, awayTeam }: Props) {
  const { data, isLoading } = useMatchStats(matchId);

  if (isLoading || !data) return null;

  // Si no hay datos cargados aún (ni parciales ni jugadores que hayan jugado),
  // no renderizar nada — la página queda con el render simple del marcador.
  const hasPeriods = data.periods.length > 0;
  const playedPlayers = [...data.homePlayers, ...data.awayPlayers].filter(p => p.played);
  if (!hasPeriods && playedPlayers.length === 0) return null;

  const homeName = homeTeam?.shortName ?? homeTeam?.name ?? 'Local';
  const awayName = awayTeam?.shortName ?? awayTeam?.name ?? 'Visita';

  return (
    <div className="space-y-8">
      {hasPeriods && (
        <PeriodScoreboard periods={data.periods} homeName={homeName} awayName={awayName} />
      )}
      <BoxScore
        homeName={homeTeam?.name ?? 'Local'}
        awayName={awayTeam?.name ?? 'Visita'}
        homePlayers={data.homePlayers}
        awayPlayers={data.awayPlayers}
      />
    </div>
  );
}

interface PeriodScoreboardProps {
  periods: MatchPeriodDto[];
  homeName: string;
  awayName: string;
}

function PeriodScoreboard({ periods, homeName, awayName }: PeriodScoreboardProps) {
  const sorted = [...periods].sort((a, b) => a.period - b.period);
  const totals = sorted.reduce(
    (acc, p) => ({ home: acc.home + p.homePoints, away: acc.away + p.awayPoints }),
    { home: 0, away: 0 },
  );

  function label(period: number) {
    return period <= REGULAR_PERIODS ? `P${period}` : `OT${period - REGULAR_PERIODS}`;
  }

  return (
    <section>
      <h2 className="eyebrow text-court mb-3">Parciales por período</h2>
      <div className="overflow-x-auto border border-ink-100 bg-paper-50">
        <table className="w-full text-sm">
          <thead className="bg-ink-50">
            <tr>
              <th className="text-left font-display tracking-wide py-2 px-3 text-ink-700">
                Equipo
              </th>
              {sorted.map(p => (
                <th
                  key={p.period}
                  className="text-center font-display tracking-wide py-2 px-3 text-ink-700"
                >
                  {label(p.period)}
                </th>
              ))}
              <th className="text-center font-display tracking-wide py-2 px-3 pl-4 border-l border-ink-100 text-ink-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ink-100">
              <th scope="row" className="text-left py-2 px-3 font-medium">
                {homeName}
              </th>
              {sorted.map(p => (
                <td key={p.period} className="text-center py-2 px-3 tabular-nums">
                  {p.homePoints}
                </td>
              ))}
              <td className="text-center py-2 px-3 pl-4 border-l border-ink-100 font-bold tabular-nums">
                {totals.home}
              </td>
            </tr>
            <tr className="border-t border-ink-100">
              <th scope="row" className="text-left py-2 px-3 font-medium">
                {awayName}
              </th>
              {sorted.map(p => (
                <td key={p.period} className="text-center py-2 px-3 tabular-nums">
                  {p.awayPoints}
                </td>
              ))}
              <td className="text-center py-2 px-3 pl-4 border-l border-ink-100 font-bold tabular-nums">
                {totals.away}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface BoxScoreProps {
  homeName: string;
  awayName: string;
  homePlayers: MatchPlayerStatDto[];
  awayPlayers: MatchPlayerStatDto[];
}

function BoxScore({ homeName, awayName, homePlayers, awayPlayers }: BoxScoreProps) {
  return (
    <section>
      <h2 className="eyebrow text-court mb-3">Box score</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <TeamBox name={homeName} players={homePlayers} />
        <TeamBox name={awayName} players={awayPlayers} />
      </div>
    </section>
  );
}

function TeamBox({ name, players }: { name: string; players: MatchPlayerStatDto[] }) {
  // Mostrar primero los que jugaron, ordenados por puntos desc; luego los
  // que no jugaron pero igual figuran en planilla con faltas.
  const played = players
    .filter(p => p.played)
    .sort((a, b) => b.points - a.points || (a.player.jersey ?? 999) - (b.player.jersey ?? 999));
  const totalPoints = played.reduce((acc, p) => acc + p.points, 0);

  if (played.length === 0) {
    return null;
  }

  return (
    <div className="border border-ink-100 bg-paper-50">
      <header className="flex items-baseline justify-between px-4 py-3 border-b border-ink-100">
        <div className="font-display tracking-wide text-ink-900">{name}</div>
        <div className="text-sm tabular-nums text-ink-500">
          Total: <span className="font-bold text-ink-900">{totalPoints}</span>
        </div>
      </header>
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-500">
          <tr>
            <th className="text-left font-medium py-2 px-3 w-12">#</th>
            <th className="text-left font-medium py-2 px-3">Jugador</th>
            <th className="text-center font-medium py-2 px-3 w-16">Pts</th>
            <th className="text-center font-medium py-2 px-3 w-16">Faltas</th>
          </tr>
        </thead>
        <tbody>
          {played.map(p => (
            <tr key={p.player.id} className="border-t border-ink-100">
              <td className="py-1.5 px-3 tabular-nums text-ink-500">
                {p.player.jersey ?? '—'}
              </td>
              <td className="py-1.5 px-3">
                {p.player.name}
                {p.fouledOut && (
                  <span className="ml-2 text-[10px] font-bold uppercase text-rose-600">
                    5 faltas
                  </span>
                )}
              </td>
              <td className="text-center py-1.5 px-3 tabular-nums font-medium">
                {p.points}
              </td>
              <td className="text-center py-1.5 px-3 tabular-nums text-ink-600">
                {p.fouls}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
