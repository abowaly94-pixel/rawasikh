-- Allow students to update their own class_id
CREATE POLICY "Students can update their own class"
ON public.students
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);