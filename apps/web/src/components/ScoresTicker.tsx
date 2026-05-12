import { Link } from 'react-router-dom';
import type { MatchDto } from '@liga/shared';
import { useRecent, useUpcoming } from '@/lib/api';
import { TeamBadge } from './TeamBadge';
import { cn } from '@/lib/cn';

function formatMini(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace('.', '')
    .toUpperCase();
}

function MiniGame({ m, kind }: { m: MatchDto; kind: 'past' | 'upcoming' }) {
  const home = m.homeTeam;
  const away = m.awayTeam;
  const played = m.status === 'PLAYED';
  const homeWon = played && m.homeScore! > m.awayScore!;
  const awayWon = played && m.awayScore! > m.homeScore!;
  const time = new Date(m.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <Link
      to="/fixture"
      className="group inline-flex items-stretch border-r border-ink-800 px-4 py-2.5 hover:bg-ink-800 transition-colors shrink-0"
    >
      <div className="flex flex-col justify-between mr-3 text-paper-300 eyebrow leading-tight">
        <span className="block">{formatMini(m.scheduledAt)}</span>
        <span className="block text-paper-300/60">
          {kind === 'past' ? 'FINAL' : time}
        </span>
      </div>
      <div className="flex flex-col gap-1 justify-center min-w-[140px]">
        <Side team={home} placeholder={m.homePlaceholder} score={m.homeScore} winner={homeWon} played={played} />
        <Side team={away} placeholder={m.awayPlaceholder} score={m.awayScore} winner={awayWon} played={played} />
      </div>
    </Link>
  );
}

function Side({
  team,
  placeholder,
  score,
  winner,
  played,
}: {
  team: MatchDto['homeTeam'];
  placeholder: string | null;
  score: number | null;
  winner: boolean;
  played: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamBadge team={team} placeholder={placeholder} size="xs" />
      <span
        className={cn(
          'font-display text-[15px] leading-none tracking-wide',
          winner ? 'text-paper-50' : played ? 'text-paper-300/60' : 'text-paper-50',
        )}
      >
        {team?.shortName ?? 'TBD'}
      </span>
      {played && (
        <span
          className={cn(
            'ml-auto font-display text-base leading-none tabular-nums',
            winner ? 'text-paper-50' : 'text-paper-300/60',
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function ScoresTicker() {
  const recent = useRecent(6);
  const upcoming = useUpcoming(6);
  const items = [
    ...(recent.data ?? []).slice(0, 4).reverse().map(m => ({ m, kind: 'past' as const })),
    ...(upcoming.data ?? []).map(m => ({ m, kind: 'upcoming' as const })),
  ];

  if (items.length === 0) {
    return (
      <div className="bg-ink text-paper-300 eyebrow px-4 py-3 border-b border-ink-800">
        Próximamente
      </div>
    );
  }

  return (
    <div className="bg-ink text-paper-50 border-b border-ink-800 overflow-x-auto">
      <div className="flex divide-x divide-ink-800">
        <div className="flex items-center px-4 py-2.5 bg-court text-paper-50 eyebrow shrink-0">
          <span>LBA 2026</span>
        </div>
        {items.map(({ m, kind }) => (
          <MiniGame key={m.id + kind} m={m} kind={kind} />
        ))}
      </div>
    </div>
  );
}
