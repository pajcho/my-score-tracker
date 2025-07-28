-- Update the profiles RLS policy to allow viewing profiles of users who sent friend invitations
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

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
    AND friend_invitations.receiver_email = (
      SELECT email FROM profiles WHERE user_id = auth.uid()
    )
  ))
);