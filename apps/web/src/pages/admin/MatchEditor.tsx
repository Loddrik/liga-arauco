import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAdminMatches, useUpdateMatch } from '@/lib/admin-api';
import type { MatchStatus, UpdateMatchInput } from '@liga/shared';
import { TeamBadge } from '@/components/TeamBadge';
import { isTimeTbd } from '@/lib/match-time';
import MatchStatsForm from './MatchStatsForm';

function formatScheduledForAdmin(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'long' });
  if (isTimeTbd(d)) return `${date} · hora por definir`;
  const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

export default function MatchEditor() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: matches } = useAdminMatches();
  const match = matches?.find(m => m.id === id);
  const updateMatch = useUpdateMatch();

  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [status, setStatus] = useState<MatchStatus>('SCHEDULED');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (match) {
      setHomeScore(match.homeScore?.toString() ?? '');
      setAwayScore(match.awayScore?.toString() ?? '');
      setStatus(match.status);
      // notes no viene en MatchDto, lo dejamos vacío como UX (admin lo re-escribe si quiere)
    }
  }, [match]);

  // Si el admin carga ambos scores, auto-promover a PLAYED (a menos que ya esté seteado a PLAYED).
  useEffect(() => {
    if (homeScore !== '' && awayScore !== '' && status !== 'PLAYED') {
      setStatus('PLAYED');
    }
  }, [homeScore, awayScore]);

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-2">Cargando partido…</p>
        <Link to="/admin" className="text-brand hover:underline text-sm">← Volver</Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: UpdateMatchInput = {
      homeScore: homeScore === '' ? null : Number(homeScore),
      awayScore: awayScore === '' ? null : Number(awayScore),
      status,
      ...(notes ? { notes } : {}),
    };
    await updateMatch.mutateAsync({ id, input });
    navigate('/admin');
  }

  const home = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD';
  const away = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD';

  const canEditStats = !!match.homeTeam && !!match.awayTeam;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/admin" className="text-sm text-brand hover:underline">← Volver al listado</Link>
      <header>
        <h1 className="text-2xl font-bold text-brand">Editar partido #{match.number}</h1>
        <p className="text-sm text-slate-500">Fecha {match.roundNumber} · {formatScheduledForAdmin(match.scheduledAt)}</p>
      </header>

      <form onSubmit={onSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-5 max-w-xl mx-auto">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} size="lg" />
            <span className="text-sm font-medium text-center">{home}</span>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="—"
              className="w-20 rounded-md border border-slate-300 px-3 py-2 text-2xl text-center tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="text-slate-300 font-bold text-2xl mt-12">-</div>
          <div className="flex flex-col items-center gap-2">
            <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} size="lg" />
            <span className="text-sm font-medium text-center">{away}</span>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="—"
              className="w-20 rounded-md border border-slate-300 px-3 py-2 text-2xl text-center tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Estado</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as MatchStatus)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="SCHEDULED">Programado</option>
            <option value="PLAYED">Jugado</option>
            <option value="POSTPONED">Postergado</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Ej: partido suspendido por lluvia"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {updateMatch.isError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
            Error al guardar. Reintenta.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={updateMatch.isPending}
            className="flex-1 rounded-md bg-brand text-white font-medium py-2 hover:bg-brand-900 disabled:opacity-50"
          >
            {updateMatch.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <Link
            to="/admin"
            className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {canEditStats ? (
        <MatchStatsForm
          matchId={id}
          homeTeamName={match.homeTeam!.shortName || match.homeTeam!.name}
          awayTeamName={match.awayTeam!.shortName || match.awayTeam!.name}
        />
      ) : (
        <p className="text-sm text-slate-500 italic max-w-xl mx-auto">
          Las estadísticas se habilitan cuando ambos equipos están asignados
          (no disponible para llaves de playoff sin definir).
        </p>
      )}
    </div>
  );
}
