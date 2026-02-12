import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type LiveGameRow = Database['public']['Tables']['live_games']['Row'];

export function LiveGameInviteNotifier() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(supabaseAuth.getCurrentUser()?.id ?? null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = supabaseAuth.subscribe((authState) => {
      setCurrentUserId(authState.user?.id ?? null);
    });

    return unsubscribeAuth;
  }, []);

  const notifyLiveGameInvite = useCallback(async (payload: RealtimePostgresInsertPayload<LiveGameRow>) => {
    const liveGame = payload.new;

    if (!currentUserId || liveGame.created_by_user_id === currentUserId) {
      return;
    }

    let creatorName = 'A friend';

    try {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', liveGame.created_by_user_id)
        .maybeSingle();

      if (creatorProfile?.name) {
        creatorName = creatorProfile.name;
      }
    } catch (error) {
      console.error('Failed to load live game creator profile:', error);
    }

    toast({
      title: 'Live game invite',
      description: `${creatorName} has just started a live game with you.`,
      action: (
        <ToastAction altText="Join live game" onClick={() => navigate('/live')}>
          Join Live Game
        </ToastAction>
      ),
    });
  }, [currentUserId, navigate, toast]);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const channel = supabase
      .channel(`live-game-invites-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_games',
          filter: `opponent_user_id=eq.${currentUserId}`,
        },
        (payload) => {
          void notifyLiveGameInvite(payload as RealtimePostgresInsertPayload<LiveGameRow>);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, notifyLiveGameInvite]);

  return null;
}
