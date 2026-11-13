-- Allow anyone to view teacher roles (for the public teachers page)
CREATE POLICY "Anyone can view teacher roles" 
ON public.user_roles 
FOR SELECT 
USING (role = 'teacher');