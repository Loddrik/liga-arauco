import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminMatches } from '@/lib/admin-api';
import { http } from '@/lib/http';
import { TeamBadge } from '@/components/TeamBadge';
import { cn } from '@/lib/cn';
import type { MatchDto } from '@liga/shared';

// Admin extiende MatchDto con campos NM (no están en MatchDto público).
type AdminMatch = MatchDto & {
  nmEventId: string | null;
  nmEventSlug: string | null;
  nmSyncedAt: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const STATUS_LABEL = {
  SCHEDULED: { text: 'Programado', color: 'text-slate-600 bg-slate-100' },
  PLAYED: { text: 'Jugado', color: 'text-emerald-700 bg-emerald-50' },
  POSTPONED: { text: 'Postergado', color: 'text-amber-700 bg-amber-50' },
} as const;

function useSyncMatchNm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await http.post<{
        ok: boolean;
        nmEventId: string | null;
      }>(`/admin/matches/${id}/nm-sync`, {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
    },
  });
}

function Row({ m }: { m: AdminMatch }) {
  const status = STATUS_LABEL[m.status];
  const home = m.homeTeam?.name ?? m.homePlaceholder ?? 'TBD';
  const away = m.awayTeam?.name ?? m.awayPlaceholder ?? 'TBD';
  const syncMutation = useSyncMatchNm();
  const synced = !!m.nmEventId;

  function handleSync(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    syncMutation.mutate(m.id);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
      <Link
        to={`/admin/partidos/${m.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="text-xs text-slate-500 w-28 shrink-0">
          <div>#{m.number} · F{m.roundNumber}</div>
          <div>{formatDate(m.scheduledAt)}</div>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamBadge team={m.homeTeam} placeholder={m.homePlaceholder} size="xs" />
          <span className="text-sm truncate">{home}</span>
        </div>
        <div className="text-sm font-bold tabular-nums w-20 text-center">
          {m.status === 'PLAYED' ? `${m.homeScore} - ${m.awayScore}` : 'vs'}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm truncate text-right">{away}</span>
          <TeamBadge team={m.awayTeam} placeholder={m.awayPlaceholder} size="xs" />
        </div>
        <span className={cn('text-[10px] uppercase font-medium rounded px-2 py-0.5 w-20 text-center shrink-0', status.color)}>
          {status.text}
        </span>
      </Link>

      {/* Columna NM: badge + botón sync */}
      <div className="flex items-center gap-2 w-32 shrink-0 justify-end">
        <span
          className={cn(
            'text-[11px] rounded-full px-2 py-0.5 font-medium',
            synced
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500',
          )}
          title={
            synced
              ? `NM event: ${m.nmEventId}`
              : 'Aún no se sincronizó con Nuestro Momento'
          }
        >
          {synced ? '✓ NM' : '⏳ NM'}
        </span>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncMutation.isPending || synced}
          className={cn(
            'text-[10px] uppercase font-medium px-2 py-1 rounded',
            synced
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-brand text-white hover:bg-brand-900 disabled:opacity-50',
          )}
          title="Re-sincronizar este partido con NM"
        >
          {syncMutation.isPending ? '…' : 'Sync'}
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useAdminMatches();

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">Partidos</h1>
          <p className="text-sm text-slate-500">
            Click en un partido para editar score / status. Botón <strong>Sync</strong> reintenta la sincronización con Nuestro Momento.
          </p>
        </div>
        <Link
          to="/admin/nm-sync"
          className="text-sm text-brand hover:underline"
        >
          NM Sync →
        </Link>
      </header>

      {isLoading && <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}
      {data && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
          {(data as unknown as AdminMatch[]).map(m => (
            <Row key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
