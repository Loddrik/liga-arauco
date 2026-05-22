import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MatchDto,
  TeamDto,
  UpdateMatchInput,
  UpdateTeamInput,
  PlayerAdminDto,
  CreatePlayerInput,
  UpdatePlayerInput,
} from '@liga/shared';
import { http } from './http';

async function get<T>(url: string): Promise<T> {
  const { data } = await http.get<T>(url);
  return data;
}

export function useAdminMatches() {
  return useQuery({
    queryKey: ['admin', 'matches'],
    queryFn: () => get<MatchDto[]>('/admin/matches'),
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateMatchInput }) => {
      const { data } = await http.patch<MatchDto>(`/admin/matches/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['standings'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTeamInput }) => {
      const { data } = await http.patch<TeamDto>(`/admin/teams/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['standings'] });
    },
  });
}

export function useAdminRoster(teamId: string) {
  return useQuery({
    queryKey: ['admin', 'teams', teamId, 'players'],
    queryFn: () => get<PlayerAdminDto[]>(`/admin/teams/${teamId}/players`),
    enabled: !!teamId,
  });
}

function invalidatePlayerQueries(qc: ReturnType<typeof useQueryClient>, teamId: string) {
  qc.invalidateQueries({ queryKey: ['admin', 'teams', teamId, 'players'] });
  qc.invalidateQueries({ queryKey: ['teams'] }); // pública: /teams/:slug/players
}

export function useCreatePlayer(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlayerInput) => {
      const { data } = await http.post<PlayerAdminDto>(
        `/admin/teams/${teamId}/players`,
        input,
      );
      return data;
    },
    onSuccess: () => invalidatePlayerQueries(qc, teamId),
  });
}

export function useUpdatePlayer(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePlayerInput }) => {
      const { data } = await http.patch<PlayerAdminDto>(`/admin/players/${id}`, input);
      return data;
    },
    onSuccess: () => invalidatePlayerQueries(qc, teamId),
  });
}

export function useDeletePlayer(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/admin/players/${id}`);
    },
    onSuccess: () => invalidatePlayerQueries(qc, teamId),
  });
}
