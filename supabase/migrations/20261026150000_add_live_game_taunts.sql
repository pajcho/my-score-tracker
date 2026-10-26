-- Emoji taunts a player sends their opponent after a winning streak in a
-- live game. Rows only exist to be delivered over realtime to the recipient;
-- they are removed together with the live game.
CREATE TABLE public.live_game_taunts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_game_id UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emojis TEXT[] NOT NULL CHECK (
    cardinality(emojis) BETWEEN 1 AND 3
    AND emojis <@ ARRAY['💩', '🖕', '🍆']::TEXT[]
  ),
  streak INTEGER NOT NULL CHECK (streak >= 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.live_game_taunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders and recipients can view taunts"
ON public.live_game_taunts
FOR SELECT
USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);

-- Only one player of a live game can taunt the other one.
CREATE POLICY "Players can taunt their live game opponent"
ON public.live_game_taunts
FOR INSERT
WITH CHECK (
  auth.uid() = sender_user_id
  AND EXISTS (
    SELECT 1
    FROM public.live_games live_game
    WHERE live_game.id = live_game_taunts.live_game_id
      AND (
        (live_game.created_by_user_id = sender_user_id AND live_game.opponent_user_id = recipient_user_id)
        OR (live_game.opponent_user_id = sender_user_id AND live_game.created_by_user_id = recipient_user_id)
      )
  )
);

CREATE INDEX live_game_taunts_live_game_idx ON public.live_game_taunts(live_game_id);
CREATE INDEX live_game_taunts_recipient_idx ON public.live_game_taunts(recipient_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_game_taunts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_game_taunts;
  END IF;
END
$$;
