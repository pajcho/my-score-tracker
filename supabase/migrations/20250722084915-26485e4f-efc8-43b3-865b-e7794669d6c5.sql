
-- Drop the player1 column since it will always be the current user
ALTER TABLE public.scores DROP COLUMN player1;

-- Rename player2 column to opponent_name for clarity
ALTER TABLE public.scores RENAME COLUMN player2 TO opponent_name;

-- Add opponent_user_id column to link to friend opponents
ALTER TABLE public.scores ADD COLUMN opponent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add constraint to ensure either opponent_name OR opponent_user_id is provided (not both)
ALTER TABLE public.scores ADD CONSTRAINT scores_opponent_check 
CHECK (
  (opponent_name IS NOT NULL AND opponent_user_id IS NULL) OR 
  (opponent_name IS NULL AND opponent_user_id IS NOT NULL)
);

-- Update RLS policies to allow users to see scores where they are either the creator or the opponent
DROP POLICY IF EXISTS "Users can view their own scores" ON public.scores;
CREATE POLICY "Users can view their scores" 
ON public.scores 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = opponent_user_id);

-- Keep existing policies for insert, update, delete (only score creator can modify)
-- Users can still only create, update, and delete scores they created (user_id = auth.uid())
