import { useParams, Link } from 'react-router-dom';
import { useTeam, useStandings, useTeamRoster } from '@/lib/api';
import { MatchCard } from '@/components/MatchCard';
import { TeamBadge } from '@/components/TeamBadge';
import { RosterSection } from '@/components/RosterSection';

export default function TeamDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useTeam(slug);
  const { data: standings } = useStandings();
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(slug);

  if (isError) {
    return (
      <div className="text-center py-24">
        <div className="font-display text-7xl text-ink-300 tracking-wide">404</div>
        <p className="text-ink-700 mt-2">No encontramos ese equipo.</p>
        <Link to="/" className="eyebrow text-court mt-4 inline-block hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="h-96 bg-ink-100 animate-pulse animate-fade-up" />;
  }

  const { team, matches } = data;
  const played = matches.filter(m => m.status === 'PLAYED');
  const upcoming = matches.filter(m => m.status !== 'PLAYED');
  const standing = standings?.find(s => s.team.id === team.id);
  const rank = standings?.findIndex(s => s.team.id === team.id) ?? -1;

  return (
    <div className="animate-fade-up space-y-12 -mt-8 sm:-mt-10">
      {/* Hero con foto de portada (si existe) + tinte del color del equipo */}
      <header className="relative text-paper-50 overflow-hidden -mx-4 px-4 sm:-mx-0 sm:px-0">
        {team.coverPhotoUrl ? (
          <>
            <img
              src={team.coverPhotoUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(120deg, ${team.primaryColor}F2 0%, ${team.primaryColor}99 45%, rgba(10,10,10,0.55) 100%)`,
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(120deg, ${team.primaryColor} 0%, ${team.primaryColor}DD 60%, #0A0A0A 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(250,250,247,0.04)_1px,transparent_1px)] bg-[length:6px_6px]" />

        <div className="relative px-2 sm:px-12 py-12 sm:py-16">
          <Link
            to="/tabla"
            className="eyebrow text-paper-300/80 hover:text-paper-50 transition-colors inline-flex items-center gap-2 mb-6"
          >
            ← Tabla
          </Link>
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-end">
            <TeamBadge team={team} size="2xl" />
            <div>
              <div className="eyebrow text-paper-300/70 mb-2">Equipo</div>
              <h1 className="font-display text-6xl sm:text-9xl tracking-wide leading-[0.85] break-words">
                {team.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-baseline gap-6">
                {standing && (
                  <>
                    <Stat label="Posición" value={`#${rank + 1}`} />
                    <Stat label="Victorias" value={String(standing.wins)} />
                    <Stat label="Derrotas" value={String(standing.losses)} />
                    <Stat label="Puntos" value={String(standing.leaguePoints)} />
                  </>
                )}
                {team.instagramHandle && (
                  <a
                    href={`https://www.instagram.com/${team.instagramHandle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow text-paper-300/80 hover:text-paper-50 transition-colors"
                  >
                    @{team.instagramHandle} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Resultados */}
      <section>
        <header className="flex items-end justify-between mb-4 border-b border-ink-100 pb-2">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide leading-none">
            Resultados
          </h2>
          <span className="eyebrow text-ink-500">{played.length} jugados</span>
        </header>
        {played.length === 0 ? (
          <p className="text-ink-500 text-sm">Aún no juega ningún partido.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {played.map(m => (
              <MatchCard key={m.id} match={m} showRound />
            ))}
          </div>
        )}
      </section>

      {/* Próximos */}
      <section>
        <header className="flex items-end justify-between mb-4 border-b border-ink-100 pb-2">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide leading-none">
            Calendario
          </h2>
          <span className="eyebrow text-ink-500">{upcoming.length} por jugar</span>
        </header>
        {upcoming.length === 0 ? (
          <p className="text-ink-500 text-sm">No hay partidos programados.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map(m => (
              <MatchCard key={m.id} match={m} showRound />
            ))}
          </div>
        )}
      </section>

      {/* Plantel */}
      <section>
        <header className="flex items-end justify-between mb-4 border-b border-ink-100 pb-2">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide leading-none">
            Plantel
          </h2>
          <span className="eyebrow text-ink-500">
            {roster ? `${roster.length} jugadores` : '—'}
          </span>
        </header>
        <RosterSection
          players={roster ?? []}
          isLoading={rosterLoading}
          primaryColor={team.primaryColor}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="eyebrow text-paper-300/60 mb-0.5">{label}</div>
      <div className="font-display text-3xl tracking-wide tabular-nums">{value}</div>
    </div>
  );
}
