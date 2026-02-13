-- Deleting a completed score should remove linked pool settings.
-- ON DELETE SET NULL conflicts with the (live_game_id OR score_id) required check.
ALTER TABLE public.pool_game_settings
DROP CONSTRAINT IF EXISTS pool_game_settings_score_id_fkey;

ALTER TABLE public.pool_game_settings
ADD CONSTRAINT pool_game_settings_score_id_fkey
FOREIGN KEY (score_id)
REFERENCES public.scores(id)
ON DELETE CASCADE;
