-- Update profiles RLS policy to allow viewing friends' profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows viewing own profile and friends' profiles
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user1_id = auth.uid() AND user2_id = profiles.user_id)
       OR (user2_id = auth.uid() AND user1_id = profiles.user_id)
  )
);