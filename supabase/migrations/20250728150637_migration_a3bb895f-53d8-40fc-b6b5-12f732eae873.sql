-- Fix infinite recursion by using auth.email() directly instead of querying profiles table

-- Drop the problematic policy and function
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_current_user_email();

-- Create a simple policy without recursion
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can view their own profile
  (auth.uid() = user_id) 
  OR 
  -- Users can view profiles of their friends
  (EXISTS (
    SELECT 1 FROM friendships 
    WHERE ((friendships.user1_id = auth.uid() AND friendships.user2_id = profiles.user_id) 
           OR (friendships.user2_id = auth.uid() AND friendships.user1_id = profiles.user_id))
  ))
  OR
  -- Users can view profiles of people who sent them invitations (using auth.email() directly)
  (EXISTS (
    SELECT 1 FROM friend_invitations 
    WHERE friend_invitations.sender_id = profiles.user_id 
    AND friend_invitations.receiver_email = auth.email()
  ))
);