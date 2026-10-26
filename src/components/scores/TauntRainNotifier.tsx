import { useCallback, useEffect, useState } from 'react';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/components/auth/authContext';
import { hapticTick } from '@/lib/haptics';
import { EmojiRain } from './EmojiRain';

type LiveGameTauntRow = Database['public']['Tables']['live_game_taunts']['Row'];

/**
 * Mounted app-wide so a streak taunt lands on the opponent's phone on any
 * page: the sender's emojis fall over the whole screen for a few seconds.
 */
export function TauntRainNotifier() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [rain, setRain] = useState<{ id: string; emojis: string[]; caption: string } | null>(null);

  const showTaunt = useCallback(async (taunt: LiveGameTauntRow) => {
    let senderName = 'Your opponent';
    try {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', taunt.sender_user_id)
        .maybeSingle();
      if (senderProfile?.name) senderName = senderProfile.name;
    } catch (error) {
      console.error('Failed to load taunt sender profile:', error);
    }

    hapticTick();
    setRain({
      id: taunt.id,
      emojis: taunt.emojis,
      caption: `${senderName} won ${taunt.streak} in a row ${taunt.emojis.join(' ')}`,
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const channel = supabase
      .channel(`live-game-taunts-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_game_taunts',
          filter: `recipient_user_id=eq.${currentUserId}`,
        },
        (payload) => {
          void showTaunt((payload as RealtimePostgresInsertPayload<LiveGameTauntRow>).new);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, showTaunt]);

  const clearRain = useCallback(() => setRain(null), []);

  if (!rain) return null;
  return <EmojiRain key={rain.id} emojis={rain.emojis} caption={rain.caption} onDone={clearRain} />;
}
