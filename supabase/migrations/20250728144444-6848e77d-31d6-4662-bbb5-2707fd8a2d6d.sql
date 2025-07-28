-- Remove receiver_id column from friend_invitations table since we only need email
ALTER TABLE public.friend_invitations DROP COLUMN receiver_id;

-- Update RLS policies to only check email-based access
DROP POLICY IF EXISTS "Users can update their invitations" ON public.friend_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.friend_invitations;

-- Create new RLS policies that work with email only
CREATE POLICY "Users can update their invitations" 
ON public.friend_invitations 
FOR UPDATE 
USING (
  (auth.uid() = sender_id) OR 
  (receiver_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can view their invitations" 
ON public.friend_invitations 
FOR SELECT 
USING (
  (auth.uid() = sender_id) OR 
  (receiver_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()))
);