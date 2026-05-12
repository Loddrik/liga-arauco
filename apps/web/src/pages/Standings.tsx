import { useStandings } from '@/lib/api';
import { StandingsTable } from '@/components/StandingsTable';
import { TeamBadge } from '@/components/TeamBadge';
import { Link } from 'react-router-dom';

export default function Standings() {
  const { data, isLoading } = useStandings();
  const leader = data?.[0];

  return (
    <div className="space-y-10 animate-fade-up">
      <header className="border-b border-ink-100 pb-6">
        <div className="eyebrow text-court mb-2">Clasificación</div>
        <div className="grid sm:grid-cols-[1fr_auto] sm:items-end gap-6">
          <h1 className="font-display text-6xl sm:text-8xl tracking-wide leading-[0.85]">
            Tabla<br />
            de posiciones
          </h1>
          {leader && (
            <Link
              to={`/equipos/${leader.team.slug}`}
              className="group flex items-center gap-3 self-start sm:self-end"
            >
              <div className="text-right leading-tight">
                <div className="eyebrow text-ink-500">Líder</div>
                <div className="font-display text-2xl tracking-wide group-hover:text-court transition-colors">
                  {leader.team.name}
                </div>
                <div className="eyebrow text-ink-500 mt-0.5">
                  {leader.leaguePoints} pts · {leader.wins}-{leader.losses}
                </div>
              </div>
              <TeamBadge team={leader.team} size="lg" />
            </Link>
          )}
        </div>
      </header>

      {isLoading && <div className="h-80 bg-ink-100 animate-pulse" />}
      {data && <StandingsTable rows={data} />}

      <aside className="grid sm:grid-cols-2 gap-6 text-sm">
        <div className="border-l-2 border-court pl-4">
          <div className="eyebrow text-ink-500 mb-1">Sistema de puntos</div>
          <p className="text-ink-700">
            Victoria <span className="font-display text-lg text-ink">2</span> · Derrota{' '}
            <span className="font-display text-lg text-ink">1</span> · No presentado{' '}
            <span className="font-display text-lg text-ink">0</span>
          </p>
        </div>
        <div className="border-l-2 border-ink-300 pl-4">
          <div className="eyebrow text-ink-500 mb-1">Clasificación</div>
          <p className="text-ink-700">
            Los <span className="font-display text-lg text-ink">4</span> primeros avanzan a
            semifinales el sábado <span className="font-display text-lg text-ink">12.07</span>
          </p>
        </div>
      </aside>

      <div className="eyebrow text-ink-500">
        PJ jugados · G ganados · P perdidos · PF puntos a favor · PC en contra · DP diferencia · PTS puntos
      </div>
    </div>
  );
}
