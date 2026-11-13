-- Allow anyone to view teacher profiles (for the public teachers page)
CREATE POLICY "Anyone can view teacher profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'teacher'
  )
);