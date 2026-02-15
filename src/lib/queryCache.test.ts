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
  });

  it('invalidates only requested keys', async () => {
    await invalidateTrackerQueries({
      scores: true,
      trainings: true,
      liveGames: true,
      opponents: true,
      friends: true,
    });

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(5);
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
