import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { http } from '@/lib/http';

interface BackfillResult {
  created: number;
  existing: number;
  skipped: number;
  failed: number;
  errors: string[];
}

function useBackfill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await http.post<BackfillResult>(
        '/admin/matches/backfill-nm-events',
        {},
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
    },
  });
}

export default function NmSync() {
  const backfill = useBackfill();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to="/admin" className="text-sm text-brand hover:underline">
        ← Volver al listado
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-brand">Nuestro Momento — Sync</h1>
        <p className="text-sm text-slate-500 mt-1">
          Crea eventos en Nuestro Momento para todos los partidos que aún no
          están sincronizados. Es idempotente: si un partido ya existe en NM,
          se salta. Se procesa en lotes de 50.
        </p>
      </header>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <button
          type="button"
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending}
          className="w-full bg-brand text-white font-medium py-3 rounded-md hover:bg-brand-900 disabled:opacity-50"
        >
          {backfill.isPending
            ? 'Ejecutando backfill…'
            : 'Backfill todos los partidos'}
        </button>

        {backfill.isError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
            Error al ejecutar backfill. Revisa los logs del backend.
          </p>
        )}

        {backfill.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Creados" value={backfill.data.created} good />
              <Stat label="Existentes" value={backfill.data.existing} />
              <Stat label="Saltados" value={backfill.data.skipped} />
              <Stat
                label="Fallidos"
                value={backfill.data.failed}
                bad={backfill.data.failed > 0}
              />
            </div>

            {backfill.data.errors.length > 0 && (
              <details className="bg-rose-50 border border-rose-200 rounded p-3">
                <summary className="cursor-pointer text-sm font-medium text-rose-700">
                  {backfill.data.errors.length} error{backfill.data.errors.length === 1 ? '' : 'es'}
                </summary>
                <ul className="mt-2 text-xs text-rose-700 space-y-1 max-h-64 overflow-y-auto">
                  {backfill.data.errors.map((err, i) => (
                    <li key={i} className="font-mono">
                      {err}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-600 space-y-1">
        <div className="font-medium text-slate-700">Notas operacionales:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Requiere <code className="bg-slate-200 px-1 rounded">NM_API_KEY</code> en el env del backend.</li>
          <li>Si un partido nuevo se crea/edita, se sincroniza automáticamente en background — esto sólo se necesita para partidos antiguos.</li>
          <li>Los partidos ya sincronizados se reconocen por <code className="bg-slate-200 px-1 rounded">external_id = match.id</code>; NM no duplica.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  good,
  bad,
}: {
  label: string;
  value: number;
  good?: boolean;
  bad?: boolean;
}) {
  return (
    <div className="text-center bg-slate-50 rounded p-3">
      <div
        className={`text-2xl font-bold tabular-nums ${
          good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-slate-700'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
        {label}
      </div>
    </div>
  );
}
