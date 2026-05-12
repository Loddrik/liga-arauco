import type { StandingRowDto } from '@liga/shared';
import { Link } from 'react-router-dom';
import { TeamBadge } from './TeamBadge';
import { cn } from '@/lib/cn';

interface Props {
  rows: StandingRowDto[];
  compact?: boolean;
}

export function StandingsTable({ rows, compact = false }: Props) {
  return (
    <div className="bg-paper-50 border border-ink-100 overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="eyebrow text-ink-500 border-b border-ink-100">
            <th className="px-3 py-3 text-left w-8 font-bold">#</th>
            <th className="px-3 py-3 text-left font-bold">Equipo</th>
            <Th>PJ</Th>
            <Th>G</Th>
            <Th>P</Th>
            {!compact && <Th>PF</Th>}
            {!compact && <Th>PC</Th>}
            <Th>DP</Th>
            <Th className="bg-paper-200">PTS</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isPlayoff = i < 4;
            const inPlayoffCutoff = i === 3;
            return (
              <tr
                key={row.team.id}
                className={cn(
                  'border-b border-ink-100 last:border-b-0 transition-colors hover:bg-paper-200',
                  inPlayoffCutoff && 'border-b-2 border-b-court',
                )}
              >
                <td className="px-3 py-3 tabular-nums font-display text-2xl leading-none">
                  <span className={cn(isPlayoff ? 'text-ink' : 'text-ink-300')}>{i + 1}</span>
                </td>
                <td className="px-3 py-3">
                  <Link
                    to={`/equipos/${row.team.slug}`}
                    className="flex items-center gap-3 group min-w-0"
                  >
                    <TeamBadge team={row.team} size="sm" />
                    <span className="font-display text-xl sm:text-2xl tracking-wide leading-none group-hover:text-court transition-colors truncate">
                      {compact ? row.team.shortName : row.team.name}
                    </span>
                  </Link>
                </td>
                <Td>{row.played}</Td>
                <Td className="text-ink">{row.wins}</Td>
                <Td className="text-ink-500">{row.losses}</Td>
                {!compact && <Td>{row.pointsFor}</Td>}
                {!compact && <Td>{row.pointsAgainst}</Td>}
                <Td className={row.pointDifferential > 0 ? 'text-ink' : row.pointDifferential < 0 ? 'text-court' : 'text-ink-500'}>
                  {row.pointDifferential > 0 ? '+' : ''}
                  {row.pointDifferential}
                </Td>
                <td className="px-3 py-3 text-center bg-paper-200">
                  <span className="font-display text-2xl text-ink tabular-nums leading-none">
                    {row.leaguePoints}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-3 text-center font-bold w-12', className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-3 py-3 text-center font-mono tabular-nums text-sm text-ink-700', className)}>
      {children}
    </td>
  );
}
