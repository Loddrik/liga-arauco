import type { PlayerPublicDto } from '@liga/shared';
import { cn } from '@/lib/cn';

interface Props {
  players: PlayerPublicDto[];
  isLoading?: boolean;
  primaryColor: string;
}

export function RosterSection({ players, isLoading, primaryColor }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-ink-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (players.length === 0) {
    return (
      <p className="text-ink-500 text-sm">
        Aún no hay nómina cargada para este equipo.
      </p>
    );
  }
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {players.map(p => (
        <li
          key={p.id}
          className="flex items-center gap-3 px-3 py-2.5 bg-paper-50 border border-ink-100"
        >
          <span
            className={cn(
              'font-display text-xl tabular-nums leading-none w-9 text-center shrink-0',
              p.jersey === null && 'text-ink-300',
            )}
            style={p.jersey !== null ? { color: primaryColor } : undefined}
          >
            {p.jersey ?? '–'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">{p.name}</div>
            {p.position && (
              <div className="eyebrow text-ink-500">{p.position}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
