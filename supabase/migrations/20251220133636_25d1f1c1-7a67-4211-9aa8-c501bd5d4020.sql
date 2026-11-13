-- Allow teachers to create classes (with teacher_id = their own id)
CREATE POLICY "Teachers can create classes"
ON public.classes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id = auth.uid()
);