import { supabase } from '@/integrations/supabase/client';

export interface Score {
  id: string;
  user_id: string;
  game: 'Pool' | 'Ping Pong';
  opponent_name: string | null;
  opponent_user_id: string | null;
  score: string;
  date: string;
  created_at: string;
  updated_at: string;
}

class SupabaseDatabaseService {
  async createScore(
    game: string,
    opponent_name: string | null,
    score: string,
    date: string,
    opponent_user_id?: string
  ): Promise<Score> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scores')
      .insert({
        user_id: user.id,
        game,
        opponent_name: opponent_user_id ? null : opponent_name,
        opponent_user_id: opponent_user_id || null,
        score,
        date
      })
      .select()
      .single();

    if (error) throw error;
    return data as Score;
  }

  async getScoresByUserId(): Promise<(Score & { friend_name?: string })[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .or(`user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Get friend names for scores with opponent_user_id
    const enrichedScores = await Promise.all((data || []).map(async (score: any) => {
      let friend_name = null;
      
      if (score.opponent_user_id) {
        let friendUserId = null;
        
        // If current user created the score, get opponent's name
        if (score.user_id === user.id) {
          friendUserId = score.opponent_user_id;
        } 
        // If current user is the opponent, get creator's name
        else if (score.opponent_user_id === user.id) {
          friendUserId = score.user_id;
        }
        
        if (friendUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', friendUserId)
            .maybeSingle();
          
          friend_name = profile?.name || null;
        }
      }
      
      return {
        ...score,
        friend_name
      };
    }));
    
    return enrichedScores as (Score & { friend_name?: string })[];
  }

  async deleteScore(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async updateScore(id: string, updates: Partial<Score>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Remove fields that shouldn't be updated
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.created_at;
    delete allowedUpdates.updated_at;

    const { error } = await supabase
      .from('scores')
      .update(allowedUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getUniqueOpponents(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get both custom opponent names and friend names
    const { data: scores, error } = await supabase
      .from('scores')
      .select('opponent_name, opponent_user_id')
      .eq('user_id', user.id);

    if (error) throw error;

    const opponents = new Set<string>();
    
    // Process each score to get opponent names
    await Promise.all((scores || []).map(async (score) => {
      if (score.opponent_name) {
        opponents.add(score.opponent_name);
      } else if (score.opponent_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', score.opponent_user_id)
          .single();
        
        if (profile?.name) {
          opponents.add(profile.name);
        }
      }
    }));

    return Array.from(opponents).sort();
  }

  async updateProfile(name: string, email: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ name, email })
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getFriends(): Promise<{ id: string; name: string; email: string }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .rpc('get_user_friends');

    if (error) throw error;

    return data.map((friend: any) => ({
      id: friend.friend_id,
      name: friend.friend_name,
      email: friend.friend_email
    }));
  }

  async deleteAccount(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
  }
}

export const supabaseDb = new SupabaseDatabaseService();