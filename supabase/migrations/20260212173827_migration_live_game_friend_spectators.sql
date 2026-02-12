-- Fix are_friends() to avoid ambiguous parameter references in policy checks.
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.friendships friendship
    WHERE (friendship.user1_id = are_friends.user1_id AND friendship.user2_id = are_friends.user2_id)
      OR (friendship.user1_id = are_friends.user2_id AND friendship.user2_id = are_friends.user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Allow friends of game participants to watch live games in read-only mode.
DROP POLICY IF EXISTS "Users can view their live games" ON public.live_games;
DROP POLICY IF EXISTS "Users can view related live games" ON public.live_games;

CREATE POLICY "Users can view related live games"
ON public.live_games
FOR SELECT
USING (
  auth.uid() = created_by_user_id
  OR auth.uid() = opponent_user_id
  OR public.are_friends(auth.uid(), created_by_user_id)
  OR (
    opponent_user_id IS NOT NULL
    AND public.are_friends(auth.uid(), opponent_user_id)
  )
);
