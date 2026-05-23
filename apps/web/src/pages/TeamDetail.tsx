import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { MatchDto, PlayerPublicDto, TeamDto } from '@liga/shared';
import { useTeam, useStandings, useTeamRoster } from '@/lib/api';
import { TeamBadge } from '@/components/TeamBadge';
import { cn } from '@/lib/cn';
import { matchTimeOrTbd, isTimeTbd } from '@/lib/match-time';

type MatchView = MatchDto & { isHome: boolean; opponent: TeamDto | null; opponentPlaceholder: string | null };
type Outcome = 'W' | 'L' | null;

// Override del focal point por equipo cuando object-position center recorta mal.
// Y < 50% = mantiene más del top de la foto (caras altas); Y > 50% = mantiene más del bottom.
const COVER_FOCAL: Record<string, string> = {
  navidad: 'center 30%',
};

export default function TeamDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useTeam(slug);
  const { data: standings } = useStandings();
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(slug);

  const views: MatchView[] = useMemo(() => {
    if (!data) return [];
    return [...data.matches]
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .map(m => {
        const isHome = m.homeTeam?.id === data.team.id;
        return {
          ...m,
          isHome,
          opponent: isHome ? m.awayTeam : m.homeTeam,
          opponentPlaceholder: isHome ? m.awayPlaceholder : m.homePlaceholder,
        };
      });
  }, [data]);

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

  const { team } = data;
  const standing = standings?.find(s => s.team.id === team.id);
  const rank = standings?.findIndex(s => s.team.id === team.id) ?? -1;

  const played = views.filter(m => m.status === 'PLAYED');
  const upcoming = views.filter(m => m.status !== 'PLAYED');
  const nextMatch = upcoming[0];

  const form: Outcome[] = played.slice(-5).map(outcome);
  const streak = computeStreak(played);
  const pf = played.reduce((acc, m) => acc + (myScore(m) ?? 0), 0);
  const pa = played.reduce((acc, m) => acc + (oppScore(m) ?? 0), 0);
  const ppg = played.length ? (pf / played.length).toFixed(1) : '—';
  const oppPpg = played.length ? (pa / played.length).toFixed(1) : '—';
  const diff = played.length ? pf - pa : 0;

  return (
    <div className="animate-fade-up">
      <Link
        to="/tabla"
        className="eyebrow text-ink-500 hover:text-ink-900 transition-colors inline-flex items-center gap-2"
      >
        ← Tabla
      </Link>

      {/* === BANDA FOTOGRÁFICA === Cinematográfica, contenida, sin overlay === */}
      {team.coverPhotoUrl && (
        <figure className="mt-6 -mx-4 sm:mx-0">
          <div className="relative aspect-[3/1] sm:aspect-[4/1] overflow-hidden bg-ink-100">
            <img
              src={team.coverPhotoUrl}
              alt={`${team.name} — equipo`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: COVER_FOCAL[team.slug] ?? 'center' }}
              loading="eager"
            />
          </div>
          <div
            className="h-px"
            style={{ background: `linear-gradient(to right, ${team.primaryColor} 0%, ${team.primaryColor}66 50%, transparent 100%)` }}
          />
        </figure>
      )}

      {/* === IDENTIDAD === Header tipográfico === */}
      <header className={cn(
        'grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-end pb-8 border-b border-ink-100',
        team.coverPhotoUrl ? 'mt-8' : 'mt-6',
      )}>
        <TeamBadge team={team} size="xl" />
        <div className="min-w-0">
          <div className="eyebrow text-ink-500 mb-2 flex items-center gap-3">
            <span>Equipo</span>
            {rank >= 0 && (
              <>
                <span className="text-ink-300">·</span>
                <span className="text-ink-700 tabular-nums">
                  #{rank + 1} de {standings?.length ?? 8}
                </span>
              </>
            )}
            {team.instagramHandle && (
              <>
                <span className="text-ink-300">·</span>
                <a
                  href={`https://www.instagram.com/${team.instagramHandle}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-500 hover:text-court transition-colors"
                >
                  @{team.instagramHandle}
                </a>
              </>
            )}
          </div>
          <h1 className="font-display text-6xl sm:text-8xl tracking-wide leading-[0.85] break-words">
            {team.name}
          </h1>
        </div>
      </header>

      {/* === STAT LINE === Una sola fila tipográfica, color solo en los wins === */}
      <section className="py-8 border-b border-ink-100">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-10 items-baseline">
          <Stat label="Récord">
            <span className="tabular-nums" style={{ color: team.primaryColor }}>
              {standing?.wins ?? 0}
            </span>
            <span className="text-ink-300 mx-1">–</span>
            <span className="tabular-nums text-ink-500">{standing?.losses ?? 0}</span>
          </Stat>
          <Stat label="Puntos liga">
            <span className="tabular-nums">{standing?.leaguePoints ?? 0}</span>
          </Stat>
          <Stat label="PPG">
            <span className="tabular-nums">{ppg}</span>
          </Stat>
          <Stat label="PPG en contra">
            <span className="tabular-nums text-ink-500">{oppPpg}</span>
          </Stat>
          <Stat label="Diferencia">
            <span className="tabular-nums" style={{ color: diff >= 0 ? team.primaryColor : undefined }}>
              {diff > 0 ? `+${diff}` : diff}
            </span>
          </Stat>
        </div>

        {/* Forma + racha en una línea sutil */}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="eyebrow text-ink-500">Forma</span>
            <div className="flex gap-1">
              {form.length === 0 && <span className="text-ink-300">—</span>}
              {form.map((o, i) => (
                <span
                  key={i}
                  className="font-display text-base w-5 text-center leading-none"
                  style={{ color: o === 'W' ? team.primaryColor : '#B5B5B5' }}
                  title={o === 'W' ? 'Victoria' : o === 'L' ? 'Derrota' : ''}
                >
                  {o ?? '·'}
                </span>
              ))}
            </div>
          </div>
          {streak && (
            <div className="flex items-center gap-3">
              <span className="eyebrow text-ink-500">Racha</span>
              <span className="font-display text-base tabular-nums tracking-wide">
                <span style={{ color: streak.type === 'W' ? team.primaryColor : '#B5B5B5' }}>
                  {streak.type}
                </span>
                {streak.count}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* === PRÓXIMO PARTIDO === card sutil, color solo en hairline === */}
      {nextMatch && <NextMatch match={nextMatch} team={team} />}

      {/* === TEMPORADA === lista densa cronológica === */}
      <Timeline views={views} teamColor={team.primaryColor} />

      {/* === PLANTEL === */}
      <Roster
        players={roster ?? []}
        isLoading={rosterLoading}
        primaryColor={team.primaryColor}
      />

      <div className="h-12" />
    </div>
  );
}

// ---------- COMPONENTES ----------

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-ink-500 mb-1">{label}</div>
      <div className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
        {children}
      </div>
    </div>
  );
}

function NextMatch({ match, team }: { match: MatchView; team: TeamDto }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  const target = new Date(match.scheduledAt).getTime();
  const delta = Math.max(0, target - now);
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const isPast = target - now <= 0;

  const dt = new Date(match.scheduledAt);
  const dateLong = dt
    .toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })
    .replace(/^./, c => c.toUpperCase());
  const time = matchTimeOrTbd(dt);
  const tbd = isTimeTbd(dt);

  return (
    <section className="py-10 border-b border-ink-100">
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="eyebrow text-ink-500">Próximo partido · Fecha {match.roundNumber}</h2>
        <span className="eyebrow text-ink-500">{match.isHome ? 'De local' : 'De visita'}</span>
      </header>

      <Link
        to={`/partidos/${match.id}`}
        className="group block"
      >
        <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-end">
          <div className="flex items-center gap-5 min-w-0">
            <TeamBadge team={match.opponent} placeholder={match.opponentPlaceholder} size="lg" />
            <div className="min-w-0">
              <div className="eyebrow text-ink-500 mb-1">vs.</div>
              <div className="font-display text-4xl sm:text-6xl tracking-wide leading-[0.9] truncate group-hover:text-court transition-colors">
                {match.opponent?.name ?? match.opponentPlaceholder ?? 'Por definir'}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            {!tbd && !isPast ? (
              <>
                <div className="eyebrow text-ink-500 mb-1">En</div>
                <div className="font-display text-3xl sm:text-4xl tabular-nums tracking-tight leading-none">
                  {days > 0 && <span>{days}d </span>}
                  <span>{String(hours).padStart(2, '0')}h </span>
                  <span>{String(minutes).padStart(2, '0')}m</span>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow text-ink-500 mb-1">{tbd ? 'Hora' : 'Cuándo'}</div>
                <div className="font-display text-3xl sm:text-4xl tracking-tight leading-none">
                  {tbd ? 'Por confirmar' : `${time} hrs`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* hairline en color del equipo */}
        <div
          className="mt-6 h-px"
          style={{ background: `linear-gradient(to right, ${team.primaryColor} 0%, ${team.primaryColor}33 60%, transparent 100%)` }}
        />

        <div className="mt-3 flex justify-between text-sm text-ink-500">
          <span>{dateLong}</span>
          {!tbd && <span className="tabular-nums">{time} hrs</span>}
        </div>
      </Link>
    </section>
  );
}

function Timeline({ views, teamColor }: { views: MatchView[]; teamColor: string }) {
  const [filter, setFilter] = useState<'all' | 'played' | 'upcoming'>('all');

  const filtered = views.filter(m => {
    if (filter === 'played') return m.status === 'PLAYED';
    if (filter === 'upcoming') return m.status !== 'PLAYED';
    return true;
  });

  return (
    <section className="py-10 border-b border-ink-100">
      <header className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <h2 className="font-display text-3xl tracking-wide leading-none">Temporada</h2>
        <div className="flex gap-4 text-sm">
          <FilterLink active={filter === 'all'} onClick={() => setFilter('all')}>
            Todos
          </FilterLink>
          <FilterLink active={filter === 'played'} onClick={() => setFilter('played')}>
            Jugados
          </FilterLink>
          <FilterLink active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
            Por jugar
          </FilterLink>
        </div>
      </header>

      <ul className="divide-y divide-ink-100">
        {filtered.map(m => (
          <FixtureRow key={m.id} m={m} teamColor={teamColor} />
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-ink-500 text-sm">Nada por aquí.</li>
        )}
      </ul>
    </section>
  );
}

function FilterLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'eyebrow transition-colors',
        active ? 'text-ink-900 underline underline-offset-[6px] decoration-2' : 'text-ink-500 hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}

function FixtureRow({ m, teamColor }: { m: MatchView; teamColor: string }) {
  const dt = new Date(m.scheduledAt);
  const dateShort = dt
    .toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    .replace(/\./g, '');
  const time = matchTimeOrTbd(dt);
  const played = m.status === 'PLAYED';
  const postponed = m.status === 'POSTPONED';
  const my = myScore(m);
  const opp = oppScore(m);
  const won = played && my != null && opp != null && my > opp;

  return (
    <li>
      <Link
        to={`/partidos/${m.id}`}
        className={cn(
          'group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_5rem_1fr_auto] items-center gap-3 sm:gap-5 py-4 transition-colors',
          postponed && 'opacity-50',
        )}
      >
        <span className="font-display text-2xl tabular-nums text-ink-300 leading-none">
          {String(m.roundNumber).padStart(2, '0')}
        </span>

        <span className="hidden sm:block text-sm text-ink-500 tabular-nums">
          {dateShort}
        </span>

        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'eyebrow shrink-0 w-5 text-ink-500',
              !m.isHome && 'text-court',
            )}
            title={m.isHome ? 'Local' : 'Visita'}
          >
            {m.isHome ? 'vs' : '@'}
          </span>
          <TeamBadge team={m.opponent} placeholder={m.opponentPlaceholder} size="sm" />
          <span className="text-base sm:text-lg truncate group-hover:text-court transition-colors">
            {m.opponent?.name ?? m.opponentPlaceholder ?? 'Por definir'}
          </span>
        </div>

        <div className="text-right tabular-nums shrink-0">
          {played && my != null && opp != null ? (
            <span className="font-display text-2xl sm:text-3xl tracking-tight leading-none">
              <span style={won ? { color: teamColor } : { color: '#6B6B6B' }}>{my}</span>
              <span className="text-ink-300 mx-1.5">–</span>
              <span className="text-ink-500">{opp}</span>
            </span>
          ) : postponed ? (
            <span className="eyebrow text-ink-500">Postergado</span>
          ) : (
            <span className="text-sm text-ink-500 tabular-nums">{isTimeTbd(dt) ? 'TBD' : `${time}`}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function Roster({
  players,
  isLoading,
  primaryColor,
}: {
  players: PlayerPublicDto[];
  isLoading?: boolean;
  primaryColor: string;
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, PlayerPublicDto[]>();
    for (const p of players) {
      const key = p.position?.trim() || 'Sin posición';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));
    }
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => {
      if (a === 'Sin posición') return 1;
      if (b === 'Sin posición') return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [players]);

  return (
    <section className="py-10">
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl tracking-wide leading-none">Plantel</h2>
        <span className="eyebrow text-ink-500">
          {isLoading ? '—' : `${players.length} jugadores`}
        </span>
      </header>

      {isLoading && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-ink-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && players.length === 0 && (
        <p className="text-ink-500 text-sm">Aún no hay nómina cargada para este equipo.</p>
      )}

      {!isLoading && players.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([position, list]) => (
            <div key={position}>
              {grouped.length > 1 || position !== 'Sin posición' ? (
                <div className="eyebrow text-ink-500 mb-3">{position}</div>
              ) : null}
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {list.map(p => (
                  <li
                    key={p.id}
                    className="grid grid-cols-[3rem_1fr] items-center gap-4 py-2.5"
                  >
                    <span
                      className={cn(
                        'font-display text-2xl tabular-nums leading-none text-right tracking-tight',
                        p.jersey === null && 'text-ink-300',
                      )}
                      style={p.jersey !== null ? { color: primaryColor } : undefined}
                    >
                      {p.jersey ?? '–'}
                    </span>
                    <span className="text-sm text-ink-900 truncate">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- HELPERS ----------

function myScore(m: MatchView): number | null {
  return m.isHome ? m.homeScore : m.awayScore;
}
function oppScore(m: MatchView): number | null {
  return m.isHome ? m.awayScore : m.homeScore;
}
function outcome(m: MatchView): Outcome {
  if (m.status !== 'PLAYED') return null;
  const a = myScore(m);
  const b = oppScore(m);
  if (a == null || b == null) return null;
  return a > b ? 'W' : 'L';
}
function computeStreak(played: MatchView[]): { type: 'W' | 'L'; count: number } | null {
  if (played.length === 0) return null;
  const last = outcome(played[played.length - 1]);
  if (!last) return null;
  let count = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if (outcome(played[i]) === last) count++;
    else break;
  }
  return { type: last, count };
}
