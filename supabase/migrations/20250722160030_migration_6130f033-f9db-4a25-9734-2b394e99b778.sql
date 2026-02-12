-- Create function to safely delete user account and all related data
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to delete their own account
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete friend invitations (sent and received)
  DELETE FROM public.friend_invitations 
  WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  
  -- Delete friendships
  DELETE FROM public.friendships 
  WHERE user1_id = target_user_id OR user2_id = target_user_id;
  
  -- Delete scores created by the user
  DELETE FROM public.scores 
  WHERE user_id = target_user_id;
  
  -- Update scores where user is opponent (set meaningful opponent name)
  UPDATE public.scores 
  SET opponent_user_id = NULL, opponent_name = 'Deleted User'
  WHERE opponent_user_id = target_user_id;
  
  -- Delete user profile
  DELETE FROM public.profiles 
  WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this will cascade to any other auth-related data)
  DELETE FROM auth.users 
  WHERE id = target_user_id;
END;
$$;