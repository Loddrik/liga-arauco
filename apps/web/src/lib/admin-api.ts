import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MatchDto, TeamDto, UpdateMatchInput, UpdateTeamInput } from '@liga/shared';
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
