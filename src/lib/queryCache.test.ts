import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invalidateQueriesMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: invalidateQueriesMock,
  },
}));

import { invalidateTrackerQueries, trackerQueryKeys } from '@/lib/queryCache';

describe('queryCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesMock.mockResolvedValue(undefined);
  });

  it('exposes stable tracker query keys', () => {
    expect(trackerQueryKeys.scores).toEqual(['tracker', 'scores']);
    expect(trackerQueryKeys.trainings).toEqual(['tracker', 'trainings']);
    expect(trackerQueryKeys.liveGames).toEqual(['tracker', 'liveGames']);
    expect(trackerQueryKeys.opponents).toEqual(['tracker', 'opponents']);
    expect(trackerQueryKeys.friends).toEqual(['tracker', 'friends']);
    expect(trackerQueryKeys.pushSubscriptions).toEqual(['tracker', 'pushSubscriptions']);
  });

  it('scopes push subscription keys per account, under the tracker prefix', () => {
    // The prefix matters twice: React Query invalidates every account's entry
    // by it, and AuthProvider drops the whole `tracker` namespace on sign-in.
    expect(trackerQueryKeys.pushSubscriptionsForUser('user-1')).toEqual([
      'tracker',
      'pushSubscriptions',
      'user-1',
    ]);
    expect(trackerQueryKeys.pushSubscriptionsForUser('user-2')).not.toEqual(
      trackerQueryKeys.pushSubscriptionsForUser('user-1'),
    );
    expect(trackerQueryKeys.pushSubscriptionsForUser(null)).toEqual([
      'tracker',
      'pushSubscriptions',
      null,
    ]);
  });

  it('invalidates only requested keys', async () => {
    await invalidateTrackerQueries({
      scores: true,
      trainings: true,
      liveGames: true,
      opponents: true,
      friends: true,
      pushSubscriptions: true,
    });

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(6);
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(6, {
      queryKey: trackerQueryKeys.pushSubscriptions,
    });
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, { queryKey: trackerQueryKeys.scores });
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, { queryKey: trackerQueryKeys.trainings });
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(3, { queryKey: trackerQueryKeys.liveGames });
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(4, { queryKey: trackerQueryKeys.opponents });
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(5, { queryKey: trackerQueryKeys.friends });
  });

  it('does nothing when no keys are requested', async () => {
    await invalidateTrackerQueries({});
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });
});
