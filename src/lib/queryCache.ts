import { queryClient } from '@/lib/queryClient';

export const trackerQueryKeys = {
  scores: ['tracker', 'scores'] as const,
  trainings: ['tracker', 'trainings'] as const,
  liveGames: ['tracker', 'liveGames'] as const,
  opponents: ['tracker', 'opponents'] as const,
  friends: ['tracker', 'friends'] as const,
  // Push subscription rows are user-scoped, so the account id is part of the
  // key and every account gets its own cache entry — never one user's device
  // list served to the next one signing in on the same browser. Living under
  // the `tracker` prefix also means AuthProvider's `removeQueries(['tracker'])`
  // clears it on account switch for free.
  pushSubscriptions: ['tracker', 'pushSubscriptions'] as const,
  pushSubscriptionsForUser: (userId: string | null) =>
    ['tracker', 'pushSubscriptions', userId] as const,
};

interface InvalidateTrackerOptions {
  scores?: boolean;
  trainings?: boolean;
  liveGames?: boolean;
  opponents?: boolean;
  friends?: boolean;
  /** Matches on the prefix, so every account's entry is invalidated. */
  pushSubscriptions?: boolean;
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

  if (options.pushSubscriptions) {
    invalidationTasks.push(
      queryClient.invalidateQueries({ queryKey: trackerQueryKeys.pushSubscriptions }),
    );
  }

  await Promise.all(invalidationTasks);
}
