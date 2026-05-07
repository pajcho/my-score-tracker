-- Allow opponents (game participants) to cancel/save live games, not just creators.
DROP POLICY IF EXISTS "Creators can delete live games" ON public.live_games;

CREATE POLICY "Participants can delete live games"
ON public.live_games
FOR DELETE
USING (auth.uid() = created_by_user_id OR auth.uid() = opponent_user_id);

-- Mirror the change on pool_game_settings so opponents can also clean up the
-- associated row (the FK CASCADE handles cancel, but completeLiveGame leaves a
-- nulled live_game_id row owned by the creator, and the opponent must be able
-- to update that row's score_id reference). Update is already permitted for
-- participants; align delete for symmetry in case settings are explicitly
-- removed before the parent row.
DROP POLICY IF EXISTS "Creators can delete pool game settings" ON public.pool_game_settings;

CREATE POLICY "Participants can delete pool game settings"
ON public.pool_game_settings
FOR DELETE
USING (
  auth.uid() = created_by_user_id
  OR (
    live_game_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.live_games live_game
      WHERE live_game.id = pool_game_settings.live_game_id
        AND auth.uid() = live_game.opponent_user_id
    )
  )
);
