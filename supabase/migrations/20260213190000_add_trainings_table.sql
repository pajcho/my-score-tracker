CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK (game IN ('Pool', 'Ping Pong')),
  title TEXT NOT NULL,
  training_date DATE NOT NULL,
  notes TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trainings"
ON public.trainings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trainings"
ON public.trainings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trainings"
ON public.trainings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trainings"
ON public.trainings
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
