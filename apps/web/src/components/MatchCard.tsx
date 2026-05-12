import type { MatchDto } from '@liga/shared';
import { Link } from 'react-router-dom';
import { TeamBadge } from './TeamBadge';
import { cn } from '@/lib/cn';

interface Props {
  match: MatchDto;
  showRound?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const fecha = d
    .toLocaleDateString('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .replace('.', '');
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return { fecha, hora };
}

const STATUS_META = {
  SCHEDULED: { label: null, dot: null },
  PLAYED: { label: 'FINAL', dot: 'bg-ink-300' },
  POSTPONED: { label: 'POST.', dot: 'bg-gold' },
} as const;

export function MatchCard({ match, showRound = false, variant = 'default', className }: Props) {
  const { fecha, hora } = formatDateTime(match.scheduledAt);
  const played = match.status === 'PLAYED';
  const homeWon = played && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore;
  const awayWon = played && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore;
  const status = STATUS_META[match.status];

  const home = match.homeTeam;
  const away = match.awayTeam;
  const isCompact = variant === 'compact';

  return (
    <article
      className={cn(
        'group bg-paper-50 border border-ink-100 transition hover:border-ink-300',
        match.status === 'POSTPONED' && 'opacity-70',
        className,
      )}
    >
      {/* Top meta strip */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-ink-100">
        <div className="flex items-center gap-2 eyebrow text-ink-500">
          {showRound && <span>Fecha {match.roundNumber}</span>}
          {showRound && <span className="text-ink-300">·</span>}
          <span>
            {fecha} · {hora}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {status.dot && <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />}
          <span
            className={cn(
              'eyebrow',
              match.status === 'PLAYED' && 'text-ink-700',
              match.status === 'POSTPONED' && 'text-gold',
              match.status === 'SCHEDULED' && 'text-ink-300',
            )}
          >
            {status.label ?? `${hora}`}
          </span>
        </div>
      </header>

      {/* Teams + score */}
      <div className="px-4 py-3 space-y-2">
        <TeamRow
          team={home}
          placeholder={match.homePlaceholder}
          score={match.homeScore}
          played={played}
          winner={homeWon}
          loser={played && !homeWon}
          compact={isCompact}
        />
        <TeamRow
          team={away}
          placeholder={match.awayPlaceholder}
          score={match.awayScore}
          played={played}
          winner={awayWon}
          loser={played && !awayWon}
          compact={isCompact}
        />
      </div>
    </article>
  );
}

interface TeamRowProps {
  team: MatchDto['homeTeam'];
  placeholder: string | null;
  score: number | null;
  played: boolean;
  winner: boolean;
  loser: boolean;
  compact: boolean;
}

function TeamRow({ team, placeholder, score, played, winner, loser, compact }: TeamRowProps) {
  const inner = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <TeamBadge team={team} placeholder={placeholder} size={compact ? 'sm' : 'md'} />
      <span
        className={cn(
          'font-display text-xl sm:text-2xl tracking-wide leading-none truncate transition-colors',
          loser ? 'text-ink-500' : 'text-ink',
        )}
      >
        {team?.name ?? placeholder ?? 'TBD'}
      </span>
      {winner && <span className="ml-1 text-court font-display text-lg leading-none">▸</span>}
    </div>
  );

  const scoreNode = played ? (
    <span
      className={cn(
        'font-display text-3xl sm:text-4xl tabular-nums leading-none',
        winner ? 'text-ink' : 'text-ink-500',
      )}
    >
      {score}
    </span>
  ) : null;

  if (team) {
    return (
      <Link
        to={`/equipos/${(team as any).slug}`}
        className="flex items-center justify-between gap-3 -mx-2 px-2 py-1 rounded hover:bg-paper-200 transition-colors"
      >
        {inner}
        {scoreNode}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-0 py-1">
      {inner}
      {scoreNode}
    </div>
  );
}
