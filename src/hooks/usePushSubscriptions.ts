import { useCallback, useEffect } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/components/auth/authContext';
import { trackerQueryKeys } from '@/lib/queryCache';

/**
 * Lists every push subscription belonging to the current user — i.e.
 * every device on which they've enabled notifications — and lets them
 * revoke a row by id.
 *
 * Revoking a row removes it from `push_subscriptions`. That stops the
 * server from sending pushes to that endpoint, but it does NOT tear
 * down the SW subscription on the remote device — we can't reach across
 * devices. That device's `useNotifications` reports "not subscribed" the
 * next time the app opens there (this list is half of how it decides), so
 * the user just switches notifications back on to re-create the row.
 *
 * For the row representing THE CURRENT device (matched by endpoint),
 * the caller should route the revoke through `useNotifications.unsubscribe`
 * instead so the local SW subscription is torn down too.
 */

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
}

async function fetchSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  // `push_subscriptions` is not in the generated Database typings yet, so
  // type-assert through unknown.
  const { data, error } = await (supabase
    .from('push_subscriptions' as never)
    .select('*')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false }) as unknown as Promise<{
    data: PushSubscriptionRow[] | null;
    error: { message: string } | null;
  }>);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Just the list, without the revoke mutation.
 *
 * `useNotifications` needs these rows to tell "this browser has a push
 * subscription" (a device-level fact) from "…and it belongs to the account
 * signed in right now" (a server-side fact). Splitting the read out keeps it
 * free of the mutation + toast machinery below, and both hooks share one
 * cache entry.
 */
export function usePushSubscriptionRows() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: trackerQueryKeys.pushSubscriptionsForUser(userId),
    // `skipToken` rather than `enabled` so the signed-out case narrows `userId`
    // instead of needing a cast — and, like `enabled: false`, it leaves the
    // query idle rather than loading, which `checking` in useNotifications
    // depends on to not hang forever while signed out.
    queryFn: userId ? () => fetchSubscriptions(userId) : skipToken,
    staleTime: 30_000,
  });

  // Stable identity so callers can list it in a useCallback dependency array
  // without rebuilding their handlers on every render.
  const refresh = useCallback(async () => {
    const queryKey = trackerQueryKeys.pushSubscriptionsForUser(userId);
    // Cancel before invalidating. Every caller refreshes right after writing a
    // row, and a plain invalidation that lands while a fetch is already in
    // flight is deduped into it — that fetch started before the write, so it
    // returns the pre-write rows and then clears the invalidated flag on its
    // way out, losing the refresh entirely.
    await queryClient.cancelQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, userId]);

  return {
    subscriptions: query.data ?? [],
    isLoading: query.isLoading,
    refresh,
  };
}

export function usePushSubscriptions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rows = usePushSubscriptionRows();

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('push_subscriptions' as never)
        .delete()
        .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerQueryKeys.pushSubscriptionsForUser(userId),
      });
      toast({ title: 'Session ended', description: 'This device will no longer receive notifications.' });
    },
    onError: (e) => {
      toast({
        title: 'Failed to end session',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  return {
    ...rows,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
  };
}

/**
 * Bumps `last_used_at` on the row matching `endpoint` so the session
 * list reflects "this device was active just now" whenever the app is
 * opened with an existing push subscription. Fires at most once per
 * mount per endpoint — RLS scopes the UPDATE to the user's own rows.
 *
 * Refetches the list afterwards: without it the write lands in the database
 * but the rendered "last seen" keeps showing the previous value for as long
 * as the cached rows stay fresh.
 */
export function useTouchCurrentSubscription(endpoint: string | null | undefined): void {
  const { refresh } = usePushSubscriptionRows();

  useEffect(() => {
    if (!endpoint) return;
    void (async () => {
      await (supabase
        .from('push_subscriptions' as never)
        .update({ last_used_at: new Date().toISOString() })
        .eq('endpoint', endpoint) as unknown as Promise<unknown>);
      await refresh();
    })();
  }, [endpoint, refresh]);
}
