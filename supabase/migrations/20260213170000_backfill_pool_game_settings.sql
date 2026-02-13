-- Backfill missing pool settings for existing Pool scores and live games.
-- Defaults:
-- - break_rule: alternate
-- - first_breaker_side/current_breaker_side: player1
-- - last_rack_winner_side: NULL

INSERT INTO public.pool_game_settings (
  live_game_id,
  score_id,
  created_by_user_id,
  break_rule,
  first_breaker_side,
  current_breaker_side,
  last_rack_winner_side
)
SELECT
  NULL AS live_game_id,
  score.id AS score_id,
  score.user_id AS created_by_user_id,
  'alternate' AS break_rule,
  'player1' AS first_breaker_side,
  'player1' AS current_breaker_side,
  NULL AS last_rack_winner_side
FROM public.scores AS score
LEFT JOIN public.pool_game_settings AS settings
  ON settings.score_id = score.id
WHERE score.game = 'Pool'
  AND settings.id IS NULL;

INSERT INTO public.pool_game_settings (
  live_game_id,
  score_id,
  created_by_user_id,
  break_rule,
  first_breaker_side,
  current_breaker_side,
  last_rack_winner_side
)
SELECT
  live_game.id AS live_game_id,
  NULL AS score_id,
  live_game.created_by_user_id AS created_by_user_id,
  'alternate' AS break_rule,
  'player1' AS first_breaker_side,
  'player1' AS current_breaker_side,
  NULL AS last_rack_winner_side
FROM public.live_games AS live_game
LEFT JOIN public.pool_game_settings AS settings
  ON settings.live_game_id = live_game.id
WHERE live_game.game = 'Pool'
  AND settings.id IS NULL;
