import { useState, useEffect, type FormEvent } from 'react';
import { useTeams } from '@/lib/api';
import { useUpdateTeam } from '@/lib/admin-api';
import { TeamBadge } from '@/components/TeamBadge';
import type { TeamDto, UpdateTeamInput } from '@liga/shared';

function TeamForm({ team }: { team: TeamDto }) {
  const [primaryColor, setPrimaryColor] = useState(team.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(team.secondaryColor ?? '');
  const [instagramHandle, setInstagramHandle] = useState(team.instagramHandle ?? '');
  const updateTeam = useUpdateTeam();

  useEffect(() => {
    setPrimaryColor(team.primaryColor);
    setSecondaryColor(team.secondaryColor ?? '');
    setInstagramHandle(team.instagramHandle ?? '');
  }, [team]);

  const dirty =
    primaryColor !== team.primaryColor ||
    (secondaryColor || null) !== team.secondaryColor ||
    (instagramHandle || null) !== team.instagramHandle;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: UpdateTeamInput = {
      primaryColor,
      secondaryColor: secondaryColor || null,
      instagramHandle: instagramHandle || null,
    };
    await updateTeam.mutateAsync({ id: team.id, input });
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-4">
        <TeamBadge team={{ ...team, primaryColor }} size="lg" />
        <div>
          <div className="font-bold text-slate-900">{team.name}</div>
          <div className="text-xs text-slate-500 font-mono">{team.slug}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Color primario</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value.toUpperCase())}
              className="h-9 w-12 rounded border border-slate-300"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value.toUpperCase())}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Color secundario</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor || '#000000'}
              onChange={e => setSecondaryColor(e.target.value.toUpperCase())}
              className="h-9 w-12 rounded border border-slate-300"
            />
            <input
              type="text"
              value={secondaryColor}
              placeholder="Opcional"
              onChange={e => setSecondaryColor(e.target.value.toUpperCase())}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Instagram</span>
          <input
            type="text"
            value={instagramHandle}
            placeholder="sin @"
            onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ''))}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono h-9"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!dirty || updateTeam.isPending}
          className="rounded-md bg-brand text-white text-sm font-medium px-4 py-1.5 hover:bg-brand-900 disabled:opacity-50"
        >
          {updateTeam.isPending ? 'Guardando…' : dirty ? 'Guardar' : 'Sin cambios'}
        </button>
      </div>
    </form>
  );
}

export default function TeamsAdmin() {
  const { data, isLoading } = useTeams();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-brand">Equipos</h1>
        <p className="text-sm text-slate-500">Editar colores y handle de Instagram.</p>
      </header>

      {isLoading && <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}

      <div className="space-y-3">
        {data?.map(t => (
          <TeamForm key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}
