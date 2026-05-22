import { useState, useEffect, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTeams } from '@/lib/api';
import {
  useAdminRoster,
  useCreatePlayer,
  useDeletePlayer,
  useUpdatePlayer,
} from '@/lib/admin-api';
import type { PlayerAdminDto, CreatePlayerInput, UpdatePlayerInput } from '@liga/shared';
import { TeamBadge } from '@/components/TeamBadge';
import { cn } from '@/lib/cn';

const RUT_REGEX = /^[\d.]+-[\dkK]$/;

function emptyDraft(): CreatePlayerInput {
  return { name: '', rut: '', jersey: null, position: null };
}

export default function RosterAdmin() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: teams } = useTeams();
  const team = teams?.find(t => t.slug === slug);
  const { data: roster, isLoading } = useAdminRoster(team?.id ?? '');
  const createMut = useCreatePlayer(team?.id ?? '');
  const [draft, setDraft] = useState<CreatePlayerInput>(emptyDraft());
  const [createError, setCreateError] = useState<string | null>(null);

  function validateDraft(): string | null {
    if (!draft.name.trim()) return 'El nombre es obligatorio.';
    if (!RUT_REGEX.test(draft.rut)) return 'Formato de RUT: 12.345.678-9';
    return null;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const err = validateDraft();
    if (err) {
      setCreateError(err);
      return;
    }
    try {
      await createMut.mutateAsync({
        name: draft.name.trim(),
        rut: draft.rut.trim(),
        jersey: draft.jersey ?? null,
        position: draft.position?.trim() || null,
      });
      setDraft(emptyDraft());
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setCreateError(message ?? 'Error al crear el jugador.');
    }
  }

  if (!team) {
    return (
      <div>
        <Link to="/admin/equipos" className="text-sm text-brand hover:underline">
          ← Volver a equipos
        </Link>
        <p className="mt-4 text-sm text-slate-500">Equipo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/admin/equipos" className="text-sm text-brand hover:underline">
          ← Equipos
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <TeamBadge team={team} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-brand">{team.name}</h1>
            <p className="text-sm text-slate-500">Nómina · {roster?.length ?? 0} jugadores</p>
          </div>
        </div>
      </header>

      {/* Formulario de creación */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Agregar jugador</h2>
        <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-[80px_1fr_180px_150px_auto] gap-2 items-start">
          <input
            type="number"
            placeholder="#"
            min={0}
            max={99}
            value={draft.jersey ?? ''}
            onChange={e =>
              setDraft(d => ({
                ...d,
                jersey: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
          />
          <input
            type="text"
            placeholder="Nombre completo"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
          />
          <input
            type="text"
            placeholder="RUT (12.345.678-9)"
            value={draft.rut}
            onChange={e => setDraft(d => ({ ...d, rut: e.target.value }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9 font-mono"
          />
          <input
            type="text"
            placeholder="Posición (opcional)"
            value={draft.position ?? ''}
            onChange={e => setDraft(d => ({ ...d, position: e.target.value || null }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-md bg-brand text-white text-sm font-medium px-4 h-9 hover:bg-brand-900 disabled:opacity-50"
          >
            {createMut.isPending ? 'Agregando…' : 'Agregar'}
          </button>
        </form>
        {createError && <p className="mt-2 text-xs text-red-600">{createError}</p>}
      </section>

      {/* Lista editable */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Jugadores</h2>
        {isLoading && <div className="h-32 rounded-lg bg-slate-100 animate-pulse" />}
        {!isLoading && roster?.length === 0 && (
          <p className="text-sm text-slate-500">Aún no hay jugadores. Agrega uno arriba.</p>
        )}
        {!isLoading && roster && roster.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
            {roster.map(p => (
              <PlayerRow key={p.id} player={p} teamId={team.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface PlayerRowProps {
  player: PlayerAdminDto;
  teamId: string;
}

function PlayerRow({ player, teamId }: PlayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdatePlayerInput>({
    name: player.name,
    rut: player.rut,
    jersey: player.jersey,
    position: player.position,
  });
  const [rowError, setRowError] = useState<string | null>(null);
  const updateMut = useUpdatePlayer(teamId);
  const deleteMut = useDeletePlayer(teamId);

  useEffect(() => {
    setForm({
      name: player.name,
      rut: player.rut,
      jersey: player.jersey,
      position: player.position,
    });
  }, [player]);

  async function onSave() {
    setRowError(null);
    if (form.rut && !RUT_REGEX.test(form.rut)) {
      setRowError('Formato de RUT inválido.');
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: player.id,
        input: {
          name: form.name?.trim(),
          rut: form.rut?.trim(),
          jersey: form.jersey ?? null,
          position: form.position?.trim() || null,
        },
      });
      setEditing(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setRowError(message ?? 'Error al guardar.');
    }
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar a ${player.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteMut.mutateAsync(player.id);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setRowError(message ?? 'Error al eliminar.');
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
        <span className="font-display text-lg tabular-nums w-10 text-center text-slate-700">
          {player.jersey ?? '–'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{player.name}</div>
          <div className="text-xs text-slate-500 font-mono">
            {player.rut}
            {player.position && ` · ${player.position}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-brand hover:underline px-2 py-1"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteMut.isPending}
          className="text-xs text-red-600 hover:underline px-2 py-1 disabled:opacity-50"
        >
          {deleteMut.isPending ? '…' : 'Eliminar'}
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 bg-slate-50">
      <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_180px_150px] gap-2">
        <input
          type="number"
          min={0}
          max={99}
          value={form.jersey ?? ''}
          onChange={e =>
            setForm(f => ({
              ...f,
              jersey: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
        />
        <input
          type="text"
          value={form.name ?? ''}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
        />
        <input
          type="text"
          value={form.rut ?? ''}
          onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9 font-mono"
        />
        <input
          type="text"
          value={form.position ?? ''}
          placeholder="Posición"
          onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm h-9"
        />
      </div>
      {rowError && <p className="mt-2 text-xs text-red-600">{rowError}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setRowError(null);
          }}
          className="text-xs text-slate-600 hover:underline px-3 py-1.5"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={updateMut.isPending}
          className={cn(
            'rounded-md bg-brand text-white text-xs font-medium px-3 py-1.5',
            'hover:bg-brand-900 disabled:opacity-50',
          )}
        >
          {updateMut.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
