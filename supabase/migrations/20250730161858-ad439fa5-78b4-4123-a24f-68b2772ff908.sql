-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create a new policy that allows all authenticated users to view all profiles
CREATE POLICY "All users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);