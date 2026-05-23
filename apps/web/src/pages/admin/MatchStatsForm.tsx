import { useEffect, useMemo, useState } from 'react';
import type { MatchPlayerStatDto, UpsertMatchStatsInput } from '@liga/shared';
import { useMatchStats, useUpsertMatchStats } from '@/lib/admin-api';
import { cn } from '@/lib/cn';
import { InfoTooltip } from '@/components/ui/Tooltip';

interface Props {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
}

interface PeriodDraft {
  period: number;
  homePoints: string;
  awayPoints: string;
  homeTeamFouls: string;
  awayTeamFouls: string;
  homeTimeouts: string;
  awayTimeouts: string;
}

interface PlayerDraft {
  playerId: string;
  jersey: number | null;
  name: string;
  played: boolean;
  points: string;
  fouls: string;
}

const REGULAR_PERIODS = 4;

function emptyPeriod(period: number): PeriodDraft {
  return {
    period,
    homePoints: '',
    awayPoints: '',
    homeTeamFouls: '',
    awayTeamFouls: '',
    homeTimeouts: '',
    awayTimeouts: '',
  };
}

function draftFromPlayer(p: MatchPlayerStatDto): PlayerDraft {
  return {
    playerId: p.player.id,
    jersey: p.player.jersey,
    name: p.player.name,
    played: p.played,
    points: p.points ? String(p.points) : '',
    fouls: p.fouls ? String(p.fouls) : '',
  };
}

function parseInt0(v: string): number {
  if (v === '') return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sum(arr: { homePoints: string; awayPoints: string }[]) {
  return arr.reduce(
    (acc, p) => ({
      home: acc.home + parseInt0(p.homePoints),
      away: acc.away + parseInt0(p.awayPoints),
    }),
    { home: 0, away: 0 },
  );
}

function sumPlayers(players: PlayerDraft[]) {
  return players.reduce((acc, p) => acc + parseInt0(p.points), 0);
}

export default function MatchStatsForm({
  matchId,
  homeTeamName,
  awayTeamName,
}: Props) {
  const { data, isLoading, error } = useMatchStats(matchId);
  const upsert = useUpsertMatchStats(matchId);

  const [periods, setPeriods] = useState<PeriodDraft[]>(() =>
    Array.from({ length: REGULAR_PERIODS }, (_, i) => emptyPeriod(i + 1)),
  );
  const [homePlayers, setHomePlayers] = useState<PlayerDraft[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerDraft[]>([]);
  const [saved, setSaved] = useState(false);

  // Hidratar estado desde la respuesta del server (incluye OT si los hay).
  useEffect(() => {
    if (!data) return;
    const serverPeriods = [...data.periods].sort((a, b) => a.period - b.period);
    const maxPeriod = Math.max(REGULAR_PERIODS, ...serverPeriods.map(p => p.period));
    const next: PeriodDraft[] = [];
    for (let i = 1; i <= maxPeriod; i++) {
      const p = serverPeriods.find(sp => sp.period === i);
      if (p) {
        next.push({
          period: i,
          homePoints: String(p.homePoints),
          awayPoints: String(p.awayPoints),
          homeTeamFouls: p.homeTeamFouls ? String(p.homeTeamFouls) : '',
          awayTeamFouls: p.awayTeamFouls ? String(p.awayTeamFouls) : '',
          homeTimeouts: p.homeTimeouts ? String(p.homeTimeouts) : '',
          awayTimeouts: p.awayTimeouts ? String(p.awayTimeouts) : '',
        });
      } else {
        next.push(emptyPeriod(i));
      }
    }
    setPeriods(next);
    setHomePlayers(data.homePlayers.map(draftFromPlayer));
    setAwayPlayers(data.awayPlayers.map(draftFromPlayer));
  }, [data]);

  const totals = useMemo(() => sum(periods), [periods]);
  const homePlayerTotal = useMemo(() => sumPlayers(homePlayers), [homePlayers]);
  const awayPlayerTotal = useMemo(() => sumPlayers(awayPlayers), [awayPlayers]);
  const homeMismatch =
    totals.home > 0 && homePlayerTotal > 0 && totals.home !== homePlayerTotal;
  const awayMismatch =
    totals.away > 0 && awayPlayerTotal > 0 && totals.away !== awayPlayerTotal;

  function updatePeriod(idx: number, patch: Partial<PeriodDraft>) {
    setPeriods(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    setSaved(false);
  }

  function addOvertime() {
    setPeriods(prev => [...prev, emptyPeriod(prev.length + 1)]);
    setSaved(false);
  }

  function removeLastPeriod() {
    setPeriods(prev => (prev.length > REGULAR_PERIODS ? prev.slice(0, -1) : prev));
    setSaved(false);
  }

  function updatePlayer(
    setList: typeof setHomePlayers,
    idx: number,
    patch: Partial<PlayerDraft>,
  ) {
    setList(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const merged = { ...p, ...patch };
        // Auto-marcar played si hay datos numéricos > 0.
        const numericPoints = parseInt0(merged.points);
        const numericFouls = parseInt0(merged.fouls);
        if (
          (numericPoints > 0 || numericFouls > 0) &&
          !merged.played &&
          patch.played === undefined
        ) {
          merged.played = true;
        }
        return merged;
      }),
    );
    setSaved(false);
  }

  async function onSave() {
    const input: UpsertMatchStatsInput = {
      periods: periods
        .filter(p =>
          // Solo incluir períodos con al menos un valor cargado.
          [p.homePoints, p.awayPoints].some(v => v !== ''),
        )
        .map(p => ({
          period: p.period,
          homePoints: parseInt0(p.homePoints),
          awayPoints: parseInt0(p.awayPoints),
          homeTeamFouls: parseInt0(p.homeTeamFouls),
          awayTeamFouls: parseInt0(p.awayTeamFouls),
          homeTimeouts: parseInt0(p.homeTimeouts),
          awayTimeouts: parseInt0(p.awayTimeouts),
        })),
      playerStats: [...homePlayers, ...awayPlayers]
        .filter(p => p.played || parseInt0(p.points) > 0 || parseInt0(p.fouls) > 0)
        .map(p => ({
          playerId: p.playerId,
          played: p.played || parseInt0(p.points) > 0 || parseInt0(p.fouls) > 0,
          points: parseInt0(p.points),
          fouls: parseInt0(p.fouls),
        })),
    };
    await upsert.mutateAsync(input);
    setSaved(true);
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-5 text-sm text-slate-500">
        Cargando estadísticas…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-5 text-sm text-rose-600">
        No se pudieron cargar las estadísticas.
      </div>
    );
  }

  const overtimes = periods.length - REGULAR_PERIODS;

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand">Estadísticas del partido</h2>
        <p className="text-xs text-slate-500">
          Datos opcionales — completa lo que el anotador escribió en la planilla.
        </p>
      </header>

      {/* Parciales */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Parciales por período</h3>
          <div className="flex gap-2">
            {overtimes > 0 && (
              <button
                type="button"
                onClick={removeLastPeriod}
                className="text-xs text-slate-500 hover:text-rose-600"
              >
                − Quitar OT{overtimes}
              </button>
            )}
            <button
              type="button"
              onClick={addOvertime}
              className="text-xs text-brand hover:underline"
            >
              + Tiempo extra
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left font-medium pb-2">Equipo</th>
                {periods.map(p => (
                  <th key={p.period} className="text-center font-medium pb-2 px-1">
                    {p.period <= REGULAR_PERIODS ? `P${p.period}` : `OT${p.period - REGULAR_PERIODS}`}
                  </th>
                ))}
                <th className="text-center font-medium pb-2 pl-3 border-l">Total</th>
              </tr>
            </thead>
            <tbody>
              <PeriodRow
                label={homeTeamName}
                tooltip={`Puntos anotados por ${homeTeamName} en cada período (parcial del cuarto, no acumulado).`}
                periods={periods}
                side="home"
                onChange={updatePeriod}
                total={totals.home}
              />
              <PeriodRow
                label={awayTeamName}
                tooltip={`Puntos anotados por ${awayTeamName} en cada período (parcial del cuarto, no acumulado).`}
                periods={periods}
                side="away"
                onChange={updatePeriod}
                total={totals.away}
              />
              <FoulsRow
                periods={periods}
                side="home"
                onChange={updatePeriod}
                teamLabel={homeTeamName}
              />
              <FoulsRow
                periods={periods}
                side="away"
                onChange={updatePeriod}
                teamLabel={awayTeamName}
              />
              <TimeoutsRow
                periods={periods}
                side="home"
                onChange={updatePeriod}
                teamLabel={homeTeamName}
              />
              <TimeoutsRow
                periods={periods}
                side="away"
                onChange={updatePeriod}
                teamLabel={awayTeamName}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Jugadores */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PlayerTable
          title={homeTeamName}
          players={homePlayers}
          total={homePlayerTotal}
          periodsTotal={totals.home}
          mismatch={homeMismatch}
          onChange={(idx, patch) => updatePlayer(setHomePlayers, idx, patch)}
        />
        <PlayerTable
          title={awayTeamName}
          players={awayPlayers}
          total={awayPlayerTotal}
          periodsTotal={totals.away}
          mismatch={awayMismatch}
          onChange={(idx, patch) => updatePlayer(setAwayPlayers, idx, patch)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={upsert.isPending}
          className="rounded-md bg-brand text-white font-medium px-5 py-2 hover:bg-brand-900 disabled:opacity-50"
        >
          {upsert.isPending ? 'Guardando…' : 'Guardar estadísticas'}
        </button>
        {upsert.isError && (
          <span className="text-sm text-rose-600">Error al guardar. Reintenta.</span>
        )}
        {saved && !upsert.isPending && (
          <span className="text-sm text-emerald-700">Guardado ✓</span>
        )}
      </div>
    </section>
  );
}

interface PeriodRowProps {
  label: string;
  tooltip: string;
  periods: PeriodDraft[];
  side: 'home' | 'away';
  onChange: (idx: number, patch: Partial<PeriodDraft>) => void;
  total: number;
}

function PeriodRow({ label, tooltip, periods, side, onChange, total }: PeriodRowProps) {
  const field = side === 'home' ? 'homePoints' : 'awayPoints';
  return (
    <tr className="border-t border-slate-100">
      <th scope="row" className="text-left font-medium py-1 pr-3 text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          {label}
          <InfoTooltip content={tooltip} ariaLabel={`Info: ${label}`} />
        </span>
      </th>
      {periods.map((p, idx) => (
        <td key={p.period} className="py-1 px-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={p[field]}
            onChange={e => onChange(idx, { [field]: e.target.value } as Partial<PeriodDraft>)}
            className="w-14 rounded border border-slate-300 px-2 py-1 text-center tabular-nums text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </td>
      ))}
      <td className="text-center pl-3 border-l font-bold tabular-nums">{total}</td>
    </tr>
  );
}

interface FoulsRowProps {
  periods: PeriodDraft[];
  side: 'home' | 'away';
  onChange: (idx: number, patch: Partial<PeriodDraft>) => void;
  teamLabel: string;
}

function FoulsRow({ periods, side, onChange, teamLabel }: FoulsRowProps) {
  const field = side === 'home' ? 'homeTeamFouls' : 'awayTeamFouls';
  const tooltip = `Faltas colectivas de ${teamLabel} en el período. Al llegar a 5, el rival entra en bonus de tiros libres.`;
  return (
    <tr className="border-t border-slate-100 text-xs text-slate-500">
      <th scope="row" className="text-left py-1 pr-3 italic">
        <span className="inline-flex items-center gap-1.5">
          F. col. {teamLabel.slice(0, 3)}
          <InfoTooltip content={tooltip} ariaLabel={`Info: faltas colectivas ${teamLabel}`} />
        </span>
      </th>
      {periods.map((p, idx) => (
        <td key={p.period} className="py-1 px-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={p[field]}
            onChange={e => onChange(idx, { [field]: e.target.value } as Partial<PeriodDraft>)}
            className="w-14 rounded border border-slate-200 px-2 py-1 text-center tabular-nums text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="0"
          />
        </td>
      ))}
      <td className="pl-3 border-l"></td>
    </tr>
  );
}

interface TimeoutsRowProps {
  periods: PeriodDraft[];
  side: 'home' | 'away';
  onChange: (idx: number, patch: Partial<PeriodDraft>) => void;
  teamLabel: string;
}

function TimeoutsRow({ periods, side, onChange, teamLabel }: TimeoutsRowProps) {
  const field = side === 'home' ? 'homeTimeouts' : 'awayTimeouts';
  const tooltip = `Tiempos muertos pedidos por ${teamLabel} en el período.`;
  return (
    <tr className="text-xs text-slate-500">
      <th scope="row" className="text-left py-1 pr-3 italic">
        <span className="inline-flex items-center gap-1.5">
          T.O. {teamLabel.slice(0, 3)}
          <InfoTooltip content={tooltip} ariaLabel={`Info: tiempos muertos ${teamLabel}`} />
        </span>
      </th>
      {periods.map((p, idx) => (
        <td key={p.period} className="py-1 px-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={p[field]}
            onChange={e => onChange(idx, { [field]: e.target.value } as Partial<PeriodDraft>)}
            className="w-14 rounded border border-slate-200 px-2 py-1 text-center tabular-nums text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="0"
          />
        </td>
      ))}
      <td className="pl-3 border-l"></td>
    </tr>
  );
}

interface PlayerTableProps {
  title: string;
  players: PlayerDraft[];
  total: number;
  periodsTotal: number;
  mismatch: boolean;
  onChange: (idx: number, patch: Partial<PlayerDraft>) => void;
}

function PlayerTable({
  title,
  players,
  total,
  periodsTotal,
  mismatch,
  onChange,
}: PlayerTableProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <div className="text-xs tabular-nums">
          <span className="text-slate-500">Total: </span>
          <span className="font-bold">{total}</span>
          {periodsTotal > 0 && (
            <span className="text-slate-400"> / parciales: {periodsTotal}</span>
          )}
        </div>
      </header>
      {mismatch && (
        <div className="mb-3 px-3 py-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          La suma de puntos por jugador no coincide con los parciales. Revisá la planilla.
        </div>
      )}
      {players.length === 0 ? (
        <p className="text-sm text-slate-500 italic">
          Sin nómina cargada. Ve a la sección de equipos para agregar jugadores.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="text-left font-medium pb-2 w-10">
                <span className="inline-flex items-center gap-1">
                  #
                  <InfoTooltip content="Número de camiseta del jugador." ariaLabel="Info: número de camiseta" />
                </span>
              </th>
              <th className="text-left font-medium pb-2">Nombre</th>
              <th className="text-center font-medium pb-2 w-14">
                <span className="inline-flex items-center gap-1">
                  Jugó
                  <InfoTooltip
                    content="Marca si el jugador entró a la cancha. Se activa automáticamente cuando ingresas puntos o faltas."
                    ariaLabel="Info: jugó"
                  />
                </span>
              </th>
              <th className="text-center font-medium pb-2 w-16">
                <span className="inline-flex items-center gap-1">
                  Pts
                  <InfoTooltip
                    content="Puntos totales que anotó el jugador (suma de 2pt, 3pt y tiros libres)."
                    ariaLabel="Info: puntos"
                  />
                </span>
              </th>
              <th className="text-center font-medium pb-2 w-16">
                <span className="inline-flex items-center gap-1">
                  Faltas
                  <InfoTooltip
                    content="Faltas personales (0 a 5). Con 5 el jugador queda descalificado por faltas."
                    ariaLabel="Info: faltas"
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p.playerId} className="border-t border-slate-100">
                <td className="py-1.5 tabular-nums text-slate-500">
                  {p.jersey ?? '—'}
                </td>
                <td className="py-1.5">
                  <span className={cn(parseInt0(p.fouls) >= 5 && 'line-through text-rose-600')}>
                    {p.name}
                  </span>
                  {parseInt0(p.fouls) >= 5 && (
                    <span className="ml-2 text-[10px] font-bold uppercase text-rose-600">
                      5F
                    </span>
                  )}
                </td>
                <td className="text-center py-1.5">
                  <input
                    type="checkbox"
                    checked={p.played}
                    onChange={e => onChange(idx, { played: e.target.checked })}
                    className="accent-brand"
                  />
                </td>
                <td className="text-center py-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={p.points}
                    onChange={e => onChange(idx, { points: e.target.value })}
                    className="w-14 rounded border border-slate-300 px-2 py-1 text-center tabular-nums text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </td>
                <td className="text-center py-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={5}
                    value={p.fouls}
                    onChange={e => onChange(idx, { fouls: e.target.value })}
                    className={cn(
                      'w-14 rounded border px-2 py-1 text-center tabular-nums text-sm focus:outline-none focus:ring-1',
                      parseInt0(p.fouls) >= 5
                        ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-400'
                        : 'border-slate-300 focus:border-brand focus:ring-brand',
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
