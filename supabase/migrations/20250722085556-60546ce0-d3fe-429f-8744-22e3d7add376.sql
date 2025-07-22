-- Create friendships table for accepted friend relationships
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Create friend_invitations table for pending invitations
CREATE TABLE public.friend_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_email),
  CHECK (sender_id != receiver_id)
);

-- Enable Row Level Security
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for friendships
CREATE POLICY "Users can view their friendships" 
ON public.friendships 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships" 
ON public.friendships 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their friendships" 
ON public.friendships 
FOR DELETE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create policies for friend invitations
CREATE POLICY "Users can view their invitations" 
ON public.friend_invitations 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create invitations" 
ON public.friend_invitations 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their invitations" 
ON public.friend_invitations 
FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friend_invitations_updated_at
  BEFORE UPDATE ON public.friend_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user1_id = $1 AND user2_id = $2) 
       OR (user1_id = $2 AND user2_id = $1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to get user's friends with their profile info
CREATE OR REPLACE FUNCTION public.get_user_friends(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  friend_email TEXT,
  friendship_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user1_id = target_user_id THEN f.user2_id
      ELSE f.user1_id
    END as friend_id,
    p.name as friend_name,
    p.email as friend_email,
    f.created_at as friendship_created_at
  FROM public.friendships f
  JOIN public.profiles p ON (
    CASE 
      WHEN f.user1_id = target_user_id THEN f.user2_id
      ELSE f.user1_id
    END = p.user_id
  )
  WHERE f.user1_id = target_user_id OR f.user2_id = target_user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;