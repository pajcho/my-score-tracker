import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These rows are the server half of "is this device subscribed for THIS
 * account" (see `useNotifications`), so the tests run against a real
 * QueryClient: the point is that the cache is keyed per account and that
 * writes actually invalidate it, neither of which a mocked useQuery shows.
 */

const { useAuthMock, toastMock, fromMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  toastMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/components/auth/authContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));

import {
  usePushSubscriptionRows,
  usePushSubscriptions,
  useTouchCurrentSubscription,
} from '@/hooks/usePushSubscriptions';
import { trackerQueryKeys } from '@/lib/queryCache';

const ROW = {
  id: 'row-1',
  user_id: 'user-1',
  endpoint: 'https://push.test/mine',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  user_agent: 'Firefox',
  created_at: '2026-07-01T00:00:00.000Z',
  last_used_at: '2026-07-02T00:00:00.000Z',
};

type BuilderKind = 'select' | 'delete' | 'update';

const results = {
  select: { data: [ROW], error: null } as { data: unknown; error: { message: string } | null },
  delete: { error: null } as { error: { message: string } | null },
  update: { error: null } as { error: { message: string } | null },
};

const calls = {
  from: [] as unknown[][],
  select: [] as unknown[][],
  delete: [] as unknown[][],
  update: [] as unknown[][],
  eq: [] as unknown[][],
  order: [] as unknown[][],
};

/**
 * Postgrest builders are chainable and awaited at the end, so the fake is a
 * thenable that remembers which terminal operation started the chain.
 */
function createBuilder() {
  let kind: BuilderKind = 'select';
  const builder = {
    select: (...args: unknown[]) => {
      kind = 'select';
      calls.select.push(args);
      return builder;
    },
    delete: (...args: unknown[]) => {
      kind = 'delete';
      calls.delete.push(args);
      return builder;
    },
    update: (...args: unknown[]) => {
      kind = 'update';
      calls.update.push(args);
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.eq.push(args);
      return builder;
    },
    order: (...args: unknown[]) => {
      calls.order.push(args);
      return builder;
    },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(results[kind]).then(resolve, reject),
  };
  return builder;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(calls) as (keyof typeof calls)[]) calls[key] = [];
  results.select = { data: [ROW], error: null };
  results.delete = { error: null };
  results.update = { error: null };
  useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
  fromMock.mockImplementation((...args: unknown[]) => {
    calls.from.push(args);
    return createBuilder();
  });
});

describe('usePushSubscriptionRows', () => {
  it('fetches the signed-in user`s rows, newest use first', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscriptions).toEqual([ROW]);
    expect(calls.from[0]).toEqual(['push_subscriptions']);
    expect(calls.eq).toContainEqual(['user_id', 'user-1']);
    expect(calls.order).toContainEqual(['last_used_at', { ascending: false }]);
  });

  it('keys the cache per account so the next user never sees the last one`s devices', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(queryClient.getQueryData(trackerQueryKeys.pushSubscriptionsForUser('user-1'))).toEqual([
      ROW,
    ]);
    expect(
      queryClient.getQueryData(trackerQueryKeys.pushSubscriptionsForUser('user-2')),
    ).toBeUndefined();
  });

  it('does not query while signed out, and does not sit in a loading state', () => {
    useAuthMock.mockReturnValue({ user: null });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });

    expect(fromMock).not.toHaveBeenCalled();
    // `checking` in useNotifications hangs on this, so a disabled query must
    // never report itself as loading.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.subscriptions).toEqual([]);
  });

  it('surfaces a fetch error instead of pretending there are no devices', async () => {
    results.select = { data: null, error: { message: 'permission denied' } };
    const { queryClient, wrapper } = createWrapper();

    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(trackerQueryKeys.pushSubscriptionsForUser('user-1'))?.status,
      ).toBe('error'),
    );
    expect(result.current.subscriptions).toEqual([]);
  });

  it('treats a null payload as an empty device list', async () => {
    results.select = { data: null, error: null };
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.subscriptions).toEqual([]);
  });

  it('refetches on refresh()', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptionRows(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = calls.select.length;

    await result.current.refresh();

    await waitFor(() => expect(calls.select.length).toBeGreaterThan(before));
  });
});

describe('usePushSubscriptions', () => {
  it('exposes the rows alongside the revoke mutation', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscriptions).toEqual([ROW]);
    expect(result.current.isRemoving).toBe(false);
  });

  it('deletes the row by id, toasts, and refetches the list', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = calls.select.length;

    await result.current.remove('row-1');

    expect(calls.delete).toHaveLength(1);
    expect(calls.eq).toContainEqual(['id', 'row-1']);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Session ended' }));
    await waitFor(() => expect(calls.select.length).toBeGreaterThan(before));
  });

  it('reports a failed revoke as a destructive toast', async () => {
    results.delete = { error: { message: 'nope' } };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePushSubscriptions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.remove('row-1')).rejects.toThrow('nope');

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'nope', variant: 'destructive' }),
    );
  });

  it('falls back to a generic message when the revoke throws a non-Error', async () => {
    const { wrapper } = createWrapper();
    fromMock.mockImplementation(() => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve(results.select) }) }),
      delete: () => ({
        // Rejecting with a non-Error is the entire point of this case.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        eq: () => Promise.reject('a string, not an Error'),
      }),
    }));
    const { result } = renderHook(() => usePushSubscriptions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.remove('row-1')).rejects.toBeTruthy();

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Unknown error', variant: 'destructive' }),
    );
  });

  it('stays idle while signed out', () => {
    useAuthMock.mockReturnValue({ user: null });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePushSubscriptions(), { wrapper });

    expect(fromMock).not.toHaveBeenCalled();
    expect(result.current.subscriptions).toEqual([]);
    expect(result.current.isRemoving).toBe(false);
  });
});

describe('useTouchCurrentSubscription', () => {
  it('bumps last_used_at and refetches so "last seen" is not stale', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useTouchCurrentSubscription(ROW.endpoint), { wrapper });

    await waitFor(() => expect(calls.update).toHaveLength(1));

    expect(calls.update[0][0]).toEqual(
      expect.objectContaining({ last_used_at: expect.any(String) }),
    );
    expect(calls.eq).toContainEqual(['endpoint', ROW.endpoint]);
    // Without the refetch the write lands but the rendered timestamp keeps
    // showing the previous value for as long as the rows stay fresh.
    await waitFor(() => expect(calls.select.length).toBeGreaterThan(1));
  });

  it('writes nothing when there is no endpoint to touch', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useTouchCurrentSubscription(null), { wrapper });

    await waitFor(() => expect(calls.select.length).toBeGreaterThan(0));
    expect(calls.update).toHaveLength(0);
  });
});
