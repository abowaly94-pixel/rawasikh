-- Allow teachers to view schools they are assigned to
CREATE POLICY "Teachers can view their assigned schools"
ON public.schools
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM school_teachers st
    WHERE st.school_id = schools.id
    AND st.teacher_id = auth.uid()
  )
);