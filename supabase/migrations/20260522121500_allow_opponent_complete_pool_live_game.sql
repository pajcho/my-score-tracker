-- When an opponent (not the live-game creator) completes a Pool live game,
-- completeLiveGame() transitions the pool_game_settings row from
-- (live_game_id=X, score_id=NULL) to (live_game_id=NULL, score_id=Y) where Y is
-- the score row the opponent just inserted. The previous WITH CHECK policy
-- rejected this because:
--   * created_by_user_id is the live-game creator, not the opponent
--   * the new row has live_game_id IS NULL, so the live-game branch evaluates FALSE
-- Result: opponents could not save the final score for Pool games.
--
-- Add a third WITH CHECK branch that allows a participant to repoint the
-- settings at a score row they own (scores INSERT policy guarantees
-- score.user_id = auth.uid()).
DROP POLICY IF EXISTS "Participants can update live pool settings" ON public.pool_game_settings;

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
  OR (
    score_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.scores score
      WHERE score.id = pool_game_settings.score_id
        AND score.user_id = auth.uid()
    )
  )
);
