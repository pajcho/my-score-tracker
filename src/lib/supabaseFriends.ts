import { supabase } from '@/integrations/supabase/client';

export interface Friend {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friendship_created_at: string;
}

export interface FriendInvitation {
  id: string;
  sender_id: string;
  receiver_email: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  updated_at: string;
  sender_name?: string; // From joined profile data
}

class SupabaseFriendsService {
  private async resolveCurrentUserContext(
    userId?: string,
    userEmail?: string | null
  ): Promise<{ userId: string; userEmail: string | null }> {
    if (userId) {
      return { userId, userEmail: userEmail ?? null };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return {
      userId: user.id,
      userEmail: user.email ?? null,
    };
  }

  private async resolveProfileEmail(userId: string, userEmail?: string | null): Promise<string> {
    if (userEmail) {
      return userEmail;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single();

    if (!profile?.email) throw new Error('User profile not found');
    return profile.email;
  }

  /**
   * Send a friend invitation by email
   */
  async sendFriendInvitation(
    receiverEmail: string,
    message?: string,
    currentUserId?: string,
    currentUserEmail?: string | null
  ): Promise<FriendInvitation> {
    const { userId, userEmail } = await this.resolveCurrentUserContext(currentUserId, currentUserEmail);

    // Check if user is trying to invite themselves
    if (userEmail && receiverEmail === userEmail) {
      throw new Error('You cannot send a friend invitation to yourself');
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_email', receiverEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      throw new Error('A pending invitation already exists for this email');
    }

    // Check if receiver exists and if already friends
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', receiverEmail)
      .maybeSingle();

    if (receiverProfile) {
      // Check if already friends
      const areFriends = await this.areUsersFriends(userId, receiverProfile.user_id);
      if (areFriends) {
        throw new Error('You are already friends with this user');
      }
    }

    const { data, error } = await supabase
      .from('friend_invitations')
      .insert({
        sender_id: userId,
        receiver_email: receiverEmail,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as FriendInvitation;
  }

  /**
   * Get all friend invitations sent by the current user
   */
  async getSentInvitations(currentUserId?: string): Promise<FriendInvitation[]> {
    const { userId } = await this.resolveCurrentUserContext(currentUserId);

    const { data, error } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FriendInvitation[];
  }

  /**
   * Get all friend invitations received by the current user
   */
  async getReceivedInvitations(currentUserId?: string, currentUserEmail?: string | null): Promise<FriendInvitation[]> {
    const { userId, userEmail } = await this.resolveCurrentUserContext(currentUserId, currentUserEmail);
    const profileEmail = await this.resolveProfileEmail(userId, userEmail);

    // Get all invitations by email
    const { data, error } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('receiver_email', profileEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get sender names for each invitation
    const invitationsWithSenderNames = await Promise.all(
      (data || []).map(async (invitation) => {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', invitation.sender_id)
          .maybeSingle();

        return {
          ...invitation,
          sender_name: senderProfile?.name || 'Unknown User'
        };
      })
    );

    return invitationsWithSenderNames as FriendInvitation[];
  }

  /**
   * Accept a friend invitation
   */
  async acceptInvitation(invitationId: string, currentUserId?: string, currentUserEmail?: string | null): Promise<void> {
    const { userId, userEmail } = await this.resolveCurrentUserContext(currentUserId, currentUserEmail);
    const profileEmail = await this.resolveProfileEmail(userId, userEmail);

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('receiver_email', profileEmail)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      throw new Error('Invitation not found or already processed');
    }

    // Create friendship (always store with smaller user_id first for consistency)
    const user1Id = invitation.sender_id < userId ? invitation.sender_id : userId;
    const user2Id = invitation.sender_id < userId ? userId : invitation.sender_id;

    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id
      });

    if (friendshipError) throw friendshipError;

    // Update invitation status
    const { error: updateError } = await supabase
      .from('friend_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) throw updateError;
  }

  /**
   * Decline a friend invitation
   */
  async declineInvitation(invitationId: string, currentUserId?: string, currentUserEmail?: string | null): Promise<void> {
    const { userId, userEmail } = await this.resolveCurrentUserContext(currentUserId, currentUserEmail);
    const profileEmail = await this.resolveProfileEmail(userId, userEmail);

    const { error } = await supabase
      .from('friend_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)
      .eq('receiver_email', profileEmail);

    if (error) throw error;
  }

  /**
   * Get all friends of the current user
   */
  async getFriends(currentUserId?: string): Promise<Friend[]> {
    const { userId } = await this.resolveCurrentUserContext(currentUserId);

    const { data, error } = await supabase.rpc('get_user_friends', {
      target_user_id: userId
    });

    if (error) throw error;
    return (data || []) as Friend[];
  }

  /**
   * Remove a friend
   */
  async removeFriend(friendId: string, currentUserId?: string): Promise<void> {
    const { userId } = await this.resolveCurrentUserContext(currentUserId);

    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user1_id.eq.${userId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${userId})`);

    if (error) throw error;
  }

  /**
   * Check if two users are friends
   */
  async areUsersFriends(user1Id: string, user2Id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('are_friends', {
      user1_id: user1Id,
      user2_id: user2Id
    });

    if (error) throw error;
    return data || false;
  }

  /**
   * Search for users by email (for friend invitations)
   */
  async searchUserByEmail(
    email: string,
    currentUserId?: string,
    currentUserEmail?: string | null
  ): Promise<{ user_id: string; name: string; email: string } | null> {
    const { userEmail } = await this.resolveCurrentUserContext(currentUserId, currentUserEmail);

    // Don't allow searching for yourself
    if (userEmail && email === userEmail) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  }
}

export const supabaseFriends = new SupabaseFriendsService();
