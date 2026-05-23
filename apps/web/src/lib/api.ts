import { useQuery } from '@tanstack/react-query';
import type {
  TeamDto,
  MatchDto,
  MatchStatsDto,
  RoundDto,
  StandingRowDto,
  PlayerPublicDto,
} from '@liga/shared';
import { http } from './http';

async function get<T>(url: string): Promise<T> {
  const { data } = await http.get<T>(url);
  return data;
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: () => get<TeamDto[]>('/teams') });
}

export function useTeam(slug: string) {
  return useQuery({
    queryKey: ['teams', slug],
    queryFn: () => get<{ team: TeamDto; matches: MatchDto[] }>(`/teams/${slug}`),
    enabled: !!slug,
  });
}

export function useRounds() {
  return useQuery({ queryKey: ['rounds'], queryFn: () => get<RoundDto[]>('/rounds') });
}

export function useUpcoming(limit = 3) {
  return useQuery({
    queryKey: ['matches', 'upcoming', limit],
    queryFn: () => get<MatchDto[]>(`/matches/upcoming?limit=${limit}`),
  });
}

export function useRecent(limit = 6) {
  return useQuery({
    queryKey: ['matches', 'recent', limit],
    queryFn: () => get<MatchDto[]>(`/matches/recent?limit=${limit}`),
  });
}

export function useStandings() {
  return useQuery({ queryKey: ['standings'], queryFn: () => get<StandingRowDto[]>('/standings') });
}

export function useTeamRoster(slug: string) {
  return useQuery({
    queryKey: ['teams', slug, 'players'],
    queryFn: () => get<PlayerPublicDto[]>(`/teams/${slug}/players`),
    enabled: !!slug,
  });
}

export function useMatchStats(matchId: string, enabled = true) {
  return useQuery({
    queryKey: ['matches', matchId, 'stats'],
    queryFn: () => get<MatchStatsDto>(`/matches/${matchId}/stats`),
    enabled: !!matchId && enabled,
  });
}
