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
    opponent_name: string,
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

  async getScoresByUserId(): Promise<Score[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .or(`user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Score[];
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

    const { data, error } = await supabase
      .from('scores')
      .select('opponent_name')
      .eq('user_id', user.id)
      .not('opponent_name', 'is', null)
      .order('opponent_name');

    if (error) throw error;

    // Get unique opponents
    const unique = Array.from(new Set(data?.map(row => row.opponent_name).filter(Boolean) || []));
    return unique.sort();
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
}

export const supabaseDb = new SupabaseDatabaseService();