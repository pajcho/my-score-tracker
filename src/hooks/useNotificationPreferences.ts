import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/components/auth/authContext';

/**
 * Reads + writes the user's notification preferences row — currently
 * just one toggle (live-game invites), but kept as a row in
 * `notification_preferences` so the schema is ready when we add more.
 * A missing row is treated as "all defaults" rather than an error —
 * the row is lazily upserted on first save. RLS scopes everything to
 * `auth.uid()`.
 */

export interface NotificationPreferencesInput {
  notify_on_live_game_invite: boolean;
}

interface NotificationPreferencesRow {
  user_id: string;
  notify_on_live_game_invite: boolean;
  created_at: string;
  updated_at: string;
}

function defaultPrefs(): NotificationPreferencesInput {
  // Default to opted-in — turning on notifications at all is a strong
  // signal the user wants to know about live game invites from friends.
  return {
    notify_on_live_game_invite: true,
  };
}

async function fetchPreferences(userId: string): Promise<NotificationPreferencesRow | null> {
  const { data, error } = await (supabase
    .from('notification_preferences' as never)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() as unknown as Promise<{
    data: NotificationPreferencesRow | null;
    error: { message: string } | null;
  }>);
  if (error) return null;
  return data ?? null;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['notification_preferences', userId],
    queryFn: () => (userId ? fetchPreferences(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (input: NotificationPreferencesInput) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await (supabase
        .from('notification_preferences' as never)
        .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' }) as unknown as Promise<{
        error: { message: string } | null;
      }>);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification_preferences', userId] });
      toast({ title: 'Saved' });
    },
    onError: (e) => {
      toast({
        title: 'Failed to save',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const fetched = query.data;
  // Memoise so consumers can safely use `prefs` as a useEffect dependency.
  // Without this, every parent render produces a new object reference
  // and any effect keyed on `prefs` re-runs on every render.
  const prefs = useMemo<NotificationPreferencesInput>(
    () =>
      fetched
        ? {
            notify_on_live_game_invite: fetched.notify_on_live_game_invite,
          }
        : defaultPrefs(),
    [fetched],
  );

  return {
    prefs,
    isLoading: query.isLoading,
    save: mutation.mutate,
    saving: mutation.isPending,
  };
}
