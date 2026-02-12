-- Persist active live games so users can continue after refresh and share updates in real time.
CREATE TABLE public.live_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_name TEXT,
  game TEXT NOT NULL CHECK (game IN ('Pool', 'Ping Pong')),
  score1 INTEGER NOT NULL DEFAULT 0 CHECK (score1 >= 0),
  score2 INTEGER NOT NULL DEFAULT 0 CHECK (score2 >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT live_games_opponent_check CHECK (
    (opponent_name IS NOT NULL AND opponent_user_id IS NULL)
    OR
    (opponent_name IS NULL AND opponent_user_id IS NOT NULL)
  )
);

ALTER TABLE public.live_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their live games"
ON public.live_games
FOR SELECT
USING (auth.uid() = created_by_user_id OR auth.uid() = opponent_user_id);

CREATE POLICY "Users can create live games"
ON public.live_games
FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their live games"
ON public.live_games
FOR UPDATE
USING (auth.uid() = created_by_user_id OR auth.uid() = opponent_user_id)
WITH CHECK (auth.uid() = created_by_user_id OR auth.uid() = opponent_user_id);

CREATE POLICY "Creators can delete live games"
ON public.live_games
FOR DELETE
USING (auth.uid() = created_by_user_id);

CREATE OR REPLACE FUNCTION public.protect_live_game_ownership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Both players can update scores, but only the creator can change game metadata or participants.
  IF (
    NEW.created_by_user_id <> OLD.created_by_user_id
    OR NEW.opponent_user_id IS DISTINCT FROM OLD.opponent_user_id
    OR NEW.opponent_name IS DISTINCT FROM OLD.opponent_name
    OR NEW.game <> OLD.game
    OR NEW.date <> OLD.date
    OR NEW.started_at <> OLD.started_at
  ) AND auth.uid() <> OLD.created_by_user_id THEN
    RAISE EXCEPTION 'Only the game creator can modify game details.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_live_game_ownership
  BEFORE UPDATE ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_live_game_ownership_changes();

CREATE TRIGGER update_live_games_updated_at
  BEFORE UPDATE ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX live_games_creator_idx ON public.live_games(created_by_user_id);
CREATE INDEX live_games_opponent_idx ON public.live_games(opponent_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_games;
  END IF;
END
$$;
