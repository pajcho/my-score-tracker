ALTER TABLE public.pool_game_settings
ADD COLUMN pool_type TEXT NOT NULL DEFAULT '9-ball'
CHECK (pool_type IN ('8-ball', '9-ball', '10-ball'));

UPDATE public.pool_game_settings
SET pool_type = '9-ball'
WHERE pool_type IS NULL;
