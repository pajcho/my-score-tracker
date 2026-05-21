import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/components/auth/authContext';

/**
 * Lists every push subscription belonging to the current user — i.e.
 * every device on which they've enabled notifications — and lets them
 * revoke a row by id.
 *
 * Revoking a row removes it from `push_subscriptions`. That stops the
 * server from sending pushes to that endpoint, but it does NOT tear
 * down the SW subscription on the remote device — that device's
 * `useNotifications` will still report `isSubscribed = true` until the
 * user re-opens the app there (at which point the server row is missing
 * and re-subscribing will re-create it).
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

export function usePushSubscriptions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['push_subscriptions', userId],
    queryFn: () => (userId ? fetchSubscriptions(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('push_subscriptions' as never)
        .delete()
        .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['push_subscriptions', userId] });
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
    subscriptions: query.data ?? [],
    isLoading: query.isLoading,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['push_subscriptions', userId] }),
  };
}

/**
 * Bumps `last_used_at` on the row matching `endpoint` so the session
 * list reflects "this device was active just now" whenever the app is
 * opened with an existing push subscription. Fires at most once per
 * mount per endpoint — RLS scopes the UPDATE to the user's own rows.
 */
export function useTouchCurrentSubscription(endpoint: string | null | undefined): void {
  useEffect(() => {
    if (!endpoint) return;
    void (supabase
      .from('push_subscriptions' as never)
      .update({ last_used_at: new Date().toISOString() })
      .eq('endpoint', endpoint) as unknown as Promise<unknown>);
  }, [endpoint]);
}
