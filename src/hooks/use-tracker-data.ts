import { useQuery } from '@tanstack/react-query';
import { supabaseDb, type LiveGameView, type Score, type Training } from '@/lib/supabase-database';
import { trackerQueryKeys } from '@/lib/query-cache';

type ScoreWithFriend = Score & { friend_name?: string | null };

export function useScoresQuery(isEnabled: boolean) {
  return useQuery<ScoreWithFriend[]>({
    queryKey: trackerQueryKeys.scores,
    queryFn: async () => (await supabaseDb.getScoresByUserId()) as ScoreWithFriend[],
    enabled: isEnabled,
  });
}

export function useTrainingsQuery(isEnabled: boolean) {
  return useQuery<Training[]>({
    queryKey: trackerQueryKeys.trainings,
    queryFn: async () => await supabaseDb.getTrainingsByUserId(),
    enabled: isEnabled,
  });
}

export function useLiveGamesQuery(isEnabled: boolean) {
  return useQuery<LiveGameView[]>({
    queryKey: trackerQueryKeys.liveGames,
    queryFn: async () => await supabaseDb.getLiveGames(),
    enabled: isEnabled,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export function useOpponentsQuery(isEnabled: boolean) {
  return useQuery<string[]>({
    queryKey: trackerQueryKeys.opponents,
    queryFn: async () => await supabaseDb.getUniqueOpponents(),
    enabled: isEnabled,
  });
}

export function useFriendsQuery(isEnabled: boolean) {
  return useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: trackerQueryKeys.friends,
    queryFn: async () => await supabaseDb.getFriends(),
    enabled: isEnabled,
  });
}
