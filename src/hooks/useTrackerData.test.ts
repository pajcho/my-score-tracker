import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useQueryMock,
  getScoresByUserIdMock,
  getTrainingsByUserIdMock,
  getLiveGamesMock,
  getUniqueOpponentsMock,
  getFriendsMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  getScoresByUserIdMock: vi.fn(),
  getTrainingsByUserIdMock: vi.fn(),
  getLiveGamesMock: vi.fn(),
  getUniqueOpponentsMock: vi.fn(),
  getFriendsMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: useQueryMock,
  };
});

vi.mock('@/lib/supabaseDatabase', () => ({
  supabaseDb: {
    getScoresByUserId: getScoresByUserIdMock,
    getTrainingsByUserId: getTrainingsByUserIdMock,
    getLiveGames: getLiveGamesMock,
    getUniqueOpponents: getUniqueOpponentsMock,
    getFriends: getFriendsMock,
  },
}));

import {
  useFriendsQuery,
  useLiveGamesQuery,
  useOpponentsQuery,
  useScoresQuery,
  useTrainingsQuery,
} from '@/hooks/useTrackerData';
import { trackerQueryKeys } from '@/lib/queryCache';

describe('useTrackerData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('configures scores query and forwards user id', async () => {
    useScoresQuery('user-1');
    const options = useQueryMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(trackerQueryKeys.scores);
    expect(options.enabled).toBe(true);

    getScoresByUserIdMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getScoresByUserIdMock).toHaveBeenCalledWith('user-1');
  });

  it('disables scores query and passes undefined when no user id', async () => {
    useScoresQuery(null);
    const options = useQueryMock.mock.calls[0][0];

    expect(options.enabled).toBe(false);

    getScoresByUserIdMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getScoresByUserIdMock).toHaveBeenCalledWith(undefined);
  });

  it('configures trainings query', async () => {
    useTrainingsQuery('user-2');
    const options = useQueryMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(trackerQueryKeys.trainings);
    expect(options.enabled).toBe(true);

    getTrainingsByUserIdMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getTrainingsByUserIdMock).toHaveBeenCalledWith('user-2');
  });

  it('configures live games query with aggressive refetching', async () => {
    useLiveGamesQuery('user-3');
    const options = useQueryMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(trackerQueryKeys.liveGames);
    expect(options.enabled).toBe(true);
    expect(options.refetchOnWindowFocus).toBe(true);
    expect(options.refetchOnReconnect).toBe(true);
    expect(options.refetchOnMount).toBe('always');
    expect(options.staleTime).toBe(0);

    getLiveGamesMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getLiveGamesMock).toHaveBeenCalledWith('user-3');
  });

  it('configures opponents and friends queries', async () => {
    useOpponentsQuery('user-4');
    let options = useQueryMock.mock.calls[0][0];
    expect(options.queryKey).toEqual(trackerQueryKeys.opponents);
    getUniqueOpponentsMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getUniqueOpponentsMock).toHaveBeenCalledWith('user-4');

    useFriendsQuery('user-5');
    options = useQueryMock.mock.calls[1][0];
    expect(options.queryKey).toEqual(trackerQueryKeys.friends);
    getFriendsMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getFriendsMock).toHaveBeenCalledWith('user-5');
  });

  it('disables remaining queries and forwards undefined when user is absent', async () => {
    useTrainingsQuery(null);
    let options = useQueryMock.mock.calls[0][0];
    expect(options.enabled).toBe(false);
    getTrainingsByUserIdMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getTrainingsByUserIdMock).toHaveBeenCalledWith(undefined);

    useLiveGamesQuery(null);
    options = useQueryMock.mock.calls[1][0];
    expect(options.enabled).toBe(false);
    getLiveGamesMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getLiveGamesMock).toHaveBeenCalledWith(undefined);

    useOpponentsQuery(null);
    options = useQueryMock.mock.calls[2][0];
    expect(options.enabled).toBe(false);
    getUniqueOpponentsMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getUniqueOpponentsMock).toHaveBeenCalledWith(undefined);

    useFriendsQuery(null);
    options = useQueryMock.mock.calls[3][0];
    expect(options.enabled).toBe(false);
    getFriendsMock.mockResolvedValueOnce([]);
    await options.queryFn();
    expect(getFriendsMock).toHaveBeenCalledWith(undefined);
  });
});
