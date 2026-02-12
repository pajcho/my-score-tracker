-- Fix the infinite recursion by creating a security definer function
-- and updating the RLS policy

-- First, create a function to get current user's email safely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create a new policy without the recursive query
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM friendships 
    WHERE ((friendships.user1_id = auth.uid() AND friendships.user2_id = profiles.user_id) 
           OR (friendships.user2_id = auth.uid() AND friendships.user1_id = profiles.user_id))
  ))
  OR
  (EXISTS (
    SELECT 1 FROM friend_invitations 
    WHERE friend_invitations.sender_id = profiles.user_id 
    AND friend_invitations.receiver_email = public.get_current_user_email()
  ))
);