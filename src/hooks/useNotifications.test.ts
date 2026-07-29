import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A `PushSubscription` belongs to the browser, not to an account, and survives
 * sign-out. Deciding "notifications are on" from that alone told the newly
 * signed-in user they were subscribed while every push still went to the
 * previous one. These tests pin the two-sided rule: browser subscription AND a
 * `push_subscriptions` row that belongs to whoever is signed in now.
 */

const { rowsState, refreshMock, invokeMock, deleteEqMock, showNotificationMock } = vi.hoisted(
  () => ({
    rowsState: { subscriptions: [] as { endpoint: string }[], isLoading: false },
    refreshMock: vi.fn(() => Promise.resolve()),
    invokeMock: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
    deleteEqMock: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
    showNotificationMock: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock('@/hooks/usePushSubscriptions', () => ({
  usePushSubscriptionRows: () => ({
    subscriptions: rowsState.subscriptions,
    isLoading: rowsState.isLoading,
    refresh: refreshMock,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
    from: () => ({ delete: () => ({ eq: deleteEqMock }) }),
  },
}));

vi.mock('@/lib/pwaConfig', () => ({
  vapidPublicKeyToUint8Array: () => new Uint8Array([1, 2, 3]),
}));

import { useNotifications } from '@/hooks/useNotifications';

const MINE = 'https://push.test/mine';
const THEIRS = 'https://push.test/theirs';
const FRESH = 'https://push.test/fresh';

interface FakeSubscription {
  endpoint: string;
  toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } };
  unsubscribe: ReturnType<typeof vi.fn>;
}

function fakeSubscription(endpoint: string): FakeSubscription {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  };
}

let deviceSubscription: FakeSubscription | null = null;

const pushManager = {
  getSubscription: vi.fn(() => Promise.resolve(deviceSubscription)),
  subscribe: vi.fn(() => {
    deviceSubscription = fakeSubscription(FRESH);
    return Promise.resolve(deviceSubscription);
  }),
};

const requestPermissionMock = vi.fn(() => Promise.resolve('granted' as NotificationPermission));

function setServiceWorker(ready: unknown): void {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready } });
}

beforeEach(() => {
  vi.clearAllMocks();
  deviceSubscription = null;
  rowsState.subscriptions = [];
  rowsState.isLoading = false;
  invokeMock.mockResolvedValue({ error: null });
  requestPermissionMock.mockResolvedValue('granted');

  setServiceWorker(Promise.resolve({ pushManager, showNotification: showNotificationMock }));
  // jsdom ships none of these, and `isSupported()` gates the whole hook on them.
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, value: class {} });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: { permission: 'granted', requestPermission: requestPermissionMock },
  });
});

async function renderSettled() {
  const view = renderHook(() => useNotifications());
  await waitFor(() => expect(view.result.current.checking).toBe(false));
  return view;
}

describe('useNotifications — whose subscription is it', () => {
  it('does not report a subscription left behind by another account', async () => {
    deviceSubscription = fakeSubscription(THEIRS);
    rowsState.subscriptions = []; // signed-in user owns no rows

    const { result } = await renderSettled();

    expect(result.current.isSubscribed).toBe(false);
    // The device is still identified, so the sessions list can match rows on it.
    expect(result.current.subscription?.endpoint).toBe(THEIRS);
  });

  it('reports a subscription whose server row belongs to the signed-in user', async () => {
    deviceSubscription = fakeSubscription(MINE);
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();

    expect(result.current.isSubscribed).toBe(true);
  });

  it('drops back to not-subscribed when the row was revoked from another device', async () => {
    deviceSubscription = fakeSubscription(MINE);
    rowsState.subscriptions = []; // row deleted elsewhere in the session list

    const { result } = await renderSettled();

    expect(result.current.isSubscribed).toBe(false);
  });

  it('reports not-subscribed when the browser has no subscription at all', async () => {
    deviceSubscription = null;
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.subscription).toBeNull();
  });

  it('stays in checking until both the browser and the row list have answered', async () => {
    deviceSubscription = fakeSubscription(MINE);
    rowsState.subscriptions = [];
    rowsState.isLoading = true;

    const { result } = renderHook(() => useNotifications());
    expect(result.current.checking).toBe(true);
    // Still checking once the browser half lands, because the rows are pending.
    await waitFor(() => expect(result.current.subscription?.endpoint).toBe(MINE));
    expect(result.current.checking).toBe(true);
  });

  it('is never checking on a browser without push support', () => {
    Object.defineProperty(globalThis, 'PushManager', { configurable: true, value: undefined });
    // `delete` is the only way to make the `in` operator report false.
    delete (globalThis as { PushManager?: unknown }).PushManager;

    const { result } = renderHook(() => useNotifications());

    expect(result.current.supported).toBe(false);
    expect(result.current.checking).toBe(false);
    expect(result.current.permission).toBe('denied');
  });

  it('surfaces a failure to read the browser subscription and stops checking', async () => {
    setServiceWorker(Promise.reject(new Error('SW unavailable')));

    const { result } = await renderSettled();

    expect(result.current.error).toBe('SW unavailable');
    expect(result.current.isSubscribed).toBe(false);
  });

  it('surfaces a thrown string as-is', async () => {
    // Rejecting with a non-Error is the entire point of this case.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    setServiceWorker(Promise.reject('SW blew up'));

    const { result } = await renderSettled();

    expect(result.current.error).toBe('SW blew up');
  });

  it('falls back to a generic message for a thrown non-Error object', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    setServiceWorker(Promise.reject({ code: 500 }));

    const { result } = await renderSettled();

    expect(result.current.error).toBe('Unknown error');
  });

  it('falls back to the subscription`s own fields when toJSON is sparse', async () => {
    deviceSubscription = {
      endpoint: MINE,
      // Safari has shipped a toJSON() that omits keys — read through to the
      // subscription itself rather than rendering a half-empty payload.
      toJSON: () => ({}) as ReturnType<FakeSubscription['toJSON']>,
      unsubscribe: vi.fn(() => Promise.resolve(true)),
    };
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();

    expect(result.current.subscription).toEqual({
      endpoint: MINE,
      keys: { p256dh: '', auth: '' },
    });
  });

  it('does not set state after unmounting mid-read', async () => {
    let resolveReady: (value: unknown) => void = () => {};
    setServiceWorker(
      new Promise((resolve) => {
        resolveReady = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useNotifications());
    unmount();
    await act(async () => {
      resolveReady({ pushManager });
      await Promise.resolve();
    });

    expect(result.current.subscription).toBeNull();
  });

  it('does not set an error after unmounting mid-read', async () => {
    let rejectReady: (reason: unknown) => void = () => {};
    setServiceWorker(
      new Promise((_resolve, reject) => {
        rejectReady = reject;
      }),
    );

    const { result, unmount } = renderHook(() => useNotifications());
    unmount();
    await act(async () => {
      rejectReady(new Error('too late'));
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('useNotifications — subscribe', () => {
  it('recycles another account`s endpoint into a fresh one', async () => {
    const theirs = fakeSubscription(THEIRS);
    deviceSubscription = theirs;
    rowsState.subscriptions = [];

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    // Re-pointing the existing endpoint is impossible: subscribe-push upserts
    // on `endpoint` and RLS rejects the UPDATE arm against another user's row.
    expect(theirs.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith(
      'subscribe-push',
      expect.objectContaining({ body: expect.objectContaining({ endpoint: FRESH }) }),
    );
    expect(result.current.error).toBeNull();
  });

  it('keeps our own endpoint instead of churning it', async () => {
    const mine = fakeSubscription(MINE);
    deviceSubscription = mine;
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    expect(mine.unsubscribe).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith(
      'subscribe-push',
      expect.objectContaining({ body: expect.objectContaining({ endpoint: MINE }) }),
    );
  });

  it('keeps the browser subscription alive when the server rejects the call', async () => {
    const mine = fakeSubscription(MINE);
    deviceSubscription = mine;
    rowsState.subscriptions = [{ endpoint: MINE }];
    invokeMock.mockResolvedValue({ error: { message: 'boom' } });

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    // Tearing this down on a server error is what killed the other account's
    // endpoint too — one failed call used to take out BOTH users' pushes.
    expect(mine.unsubscribe).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Server error: boom');
  });

  it('refetches the session list so the new device shows up right away', async () => {
    deviceSubscription = null;
    rowsState.subscriptions = [];

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    // The row is written server-side by the Edge Function, so no client-side
    // mutation invalidates the query for us — without this the list stays stale.
    expect(refreshMock).toHaveBeenCalled();
  });

  it('does not refetch when the server call failed', async () => {
    deviceSubscription = null;
    rowsState.subscriptions = [];
    invokeMock.mockResolvedValue({ error: { message: 'boom' } });

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('stops at a denied permission prompt without touching the PushManager', async () => {
    requestPermissionMock.mockResolvedValue('denied');

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toBe('Notifications permission was denied.');
  });

  it('reports unsupported browsers instead of throwing', async () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe('This device does not support push notifications.');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('surfaces an unexpected failure from the PushManager', async () => {
    pushManager.subscribe.mockRejectedValueOnce(new Error('VAPID rejected'));

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe('VAPID rejected');
    expect(result.current.pending).toBe(false);
  });
});

describe('useNotifications — unsubscribe', () => {
  it('deletes the server row, tears down the browser subscription and refetches', async () => {
    const mine = fakeSubscription(MINE);
    deviceSubscription = mine;
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(deleteEqMock).toHaveBeenCalledWith('endpoint', MINE);
    expect(mine.unsubscribe).toHaveBeenCalled();
    expect(result.current.subscription).toBeNull();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('still refetches when the browser had nothing to tear down', async () => {
    deviceSubscription = null;

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(deleteEqMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('surfaces an error and clears pending', async () => {
    deviceSubscription = fakeSubscription(MINE);
    deviceSubscription.unsubscribe.mockRejectedValueOnce(new Error('teardown failed'));
    rowsState.subscriptions = [{ endpoint: MINE }];

    const { result } = await renderSettled();
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.error).toBe('teardown failed');
    expect(result.current.pending).toBe(false);
  });

  it('is a no-op on a browser without push support', async () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(deleteEqMock).not.toHaveBeenCalled();
  });
});

describe('useNotifications — sendLocalTest', () => {
  it('shows a notification through the service worker registration', async () => {
    const { result } = await renderSettled();
    await act(async () => {
      await result.current.sendLocalTest();
    });

    expect(showNotificationMock).toHaveBeenCalledWith(
      'Test notification',
      expect.objectContaining({ tag: 'local-test' }),
    );
  });

  it('is a no-op on a browser without push support', async () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.sendLocalTest();
    });

    expect(showNotificationMock).not.toHaveBeenCalled();
  });
});
