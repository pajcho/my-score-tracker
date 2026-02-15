import { useQuery } from '@tanstack/react-query';
import { supabaseDb, type LiveGameView, type Score, type Training } from '@/lib/supabaseDatabase';
import { trackerQueryKeys } from '@/lib/queryCache';

type ScoreWithFriend = Score & { friend_name?: string | null };

export function useScoresQuery(userId?: string | null) {
  return useQuery<ScoreWithFriend[]>({
    queryKey: trackerQueryKeys.scores,
    queryFn: async () => (await supabaseDb.getScoresByUserId(userId ?? undefined)) as ScoreWithFriend[],
    enabled: !!userId,
  });
}

export function useTrainingsQuery(userId?: string | null) {
  return useQuery<Training[]>({
    queryKey: trackerQueryKeys.trainings,
    queryFn: async () => await supabaseDb.getTrainingsByUserId(userId ?? undefined),
    enabled: !!userId,
  });
}

export function useLiveGamesQuery(userId?: string | null) {
  return useQuery<LiveGameView[]>({
    queryKey: trackerQueryKeys.liveGames,
    queryFn: async () => await supabaseDb.getLiveGames(userId ?? undefined),
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export function useOpponentsQuery(userId?: string | null) {
  return useQuery<string[]>({
    queryKey: trackerQueryKeys.opponents,
    queryFn: async () => await supabaseDb.getUniqueOpponents(userId ?? undefined),
    enabled: !!userId,
  });
}

export function useFriendsQuery(userId?: string | null) {
  return useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: trackerQueryKeys.friends,
    queryFn: async () => await supabaseDb.getFriends(userId ?? undefined),
    enabled: !!userId,
  });
}
