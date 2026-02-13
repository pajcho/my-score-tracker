CREATE TABLE public.pool_game_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_game_id UUID REFERENCES public.live_games(id) ON DELETE SET NULL,
  score_id UUID REFERENCES public.scores(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  break_rule TEXT NOT NULL CHECK (break_rule IN ('alternate', 'winner_stays')),
  first_breaker_side TEXT NOT NULL CHECK (first_breaker_side IN ('player1', 'player2')),
  current_breaker_side TEXT NOT NULL CHECK (current_breaker_side IN ('player1', 'player2')),
  last_rack_winner_side TEXT CHECK (last_rack_winner_side IN ('player1', 'player2')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pool_game_settings_live_or_score_required CHECK (
    live_game_id IS NOT NULL OR score_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX pool_game_settings_live_game_unique_idx
  ON public.pool_game_settings(live_game_id)
  WHERE live_game_id IS NOT NULL;

CREATE UNIQUE INDEX pool_game_settings_score_unique_idx
  ON public.pool_game_settings(score_id)
  WHERE score_id IS NOT NULL;

CREATE INDEX pool_game_settings_created_by_idx ON public.pool_game_settings(created_by_user_id);

ALTER TABLE public.pool_game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related pool game settings"
ON public.pool_game_settings
FOR SELECT
USING (
  auth.uid() = created_by_user_id
  OR (
    live_game_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.live_games live_game
      WHERE live_game.id = pool_game_settings.live_game_id
        AND (
          auth.uid() = live_game.created_by_user_id
          OR auth.uid() = live_game.opponent_user_id
          OR public.are_friends(auth.uid(), live_game.created_by_user_id)
          OR (
            live_game.opponent_user_id IS NOT NULL
            AND public.are_friends(auth.uid(), live_game.opponent_user_id)
          )
        )
    )
  )
  OR (
    score_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.scores score
      WHERE score.id = pool_game_settings.score_id
        AND (auth.uid() = score.user_id OR auth.uid() = score.opponent_user_id)
    )
  )
);

CREATE POLICY "Creators can insert pool game settings"
ON public.pool_game_settings
FOR INSERT
WITH CHECK (
  auth.uid() = created_by_user_id
  AND (
    live_game_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.live_games live_game
      WHERE live_game.id = pool_game_settings.live_game_id
        AND auth.uid() = live_game.created_by_user_id
    )
  )
);

CREATE POLICY "Participants can update live pool settings"
ON public.pool_game_settings
FOR UPDATE
USING (
  auth.uid() = created_by_user_id
  OR (
    live_game_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.live_games live_game
      WHERE live_game.id = pool_game_settings.live_game_id
        AND (auth.uid() = live_game.created_by_user_id OR auth.uid() = live_game.opponent_user_id)
    )
  )
)
WITH CHECK (
  auth.uid() = created_by_user_id
  OR (
    live_game_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.live_games live_game
      WHERE live_game.id = pool_game_settings.live_game_id
        AND (auth.uid() = live_game.created_by_user_id OR auth.uid() = live_game.opponent_user_id)
    )
  )
);

CREATE POLICY "Creators can delete pool game settings"
ON public.pool_game_settings
FOR DELETE
USING (auth.uid() = created_by_user_id);

CREATE TRIGGER update_pool_game_settings_updated_at
  BEFORE UPDATE ON public.pool_game_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pool_game_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_game_settings;
  END IF;
END
$$;
