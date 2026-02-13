import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/components/auth/auth-context';

type LiveGameRow = Database['public']['Tables']['live_games']['Row'];

export function LiveGameInviteNotifier() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { toast } = useToast();
  const navigate = useNavigate();

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
