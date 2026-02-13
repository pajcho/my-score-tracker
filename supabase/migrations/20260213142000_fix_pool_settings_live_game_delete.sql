-- Canceling a live game should remove its pool settings row as well.
-- Using ON DELETE SET NULL conflicts with the (live_game_id OR score_id) required check.
ALTER TABLE public.pool_game_settings
DROP CONSTRAINT IF EXISTS pool_game_settings_live_game_id_fkey;

ALTER TABLE public.pool_game_settings
ADD CONSTRAINT pool_game_settings_live_game_id_fkey
FOREIGN KEY (live_game_id)
REFERENCES public.live_games(id)
ON DELETE CASCADE;
