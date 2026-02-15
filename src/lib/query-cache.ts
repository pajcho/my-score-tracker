import { queryClient } from '@/lib/query-client';

export const trackerQueryKeys = {
  scores: ['tracker', 'scores'] as const,
  trainings: ['tracker', 'trainings'] as const,
  liveGames: ['tracker', 'liveGames'] as const,
  opponents: ['tracker', 'opponents'] as const,
  friends: ['tracker', 'friends'] as const,
};

interface InvalidateTrackerOptions {
  scores?: boolean;
  trainings?: boolean;
  liveGames?: boolean;
  opponents?: boolean;
  friends?: boolean;
}

export async function invalidateTrackerQueries(options: InvalidateTrackerOptions): Promise<void> {
  const invalidationTasks: Promise<unknown>[] = [];

  if (options.scores) {
    invalidationTasks.push(queryClient.invalidateQueries({ queryKey: trackerQueryKeys.scores }));
  }

  if (options.trainings) {
    invalidationTasks.push(queryClient.invalidateQueries({ queryKey: trackerQueryKeys.trainings }));
  }

  if (options.liveGames) {
    invalidationTasks.push(queryClient.invalidateQueries({ queryKey: trackerQueryKeys.liveGames }));
  }

  if (options.opponents) {
    invalidationTasks.push(queryClient.invalidateQueries({ queryKey: trackerQueryKeys.opponents }));
  }

  if (options.friends) {
    invalidationTasks.push(queryClient.invalidateQueries({ queryKey: trackerQueryKeys.friends }));
  }

  await Promise.all(invalidationTasks);
}
