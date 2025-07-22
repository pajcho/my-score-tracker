-- Allow opponent_name to be nullable for friend games
ALTER TABLE public.scores ALTER COLUMN opponent_name DROP NOT NULL;