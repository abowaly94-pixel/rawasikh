-- Allow schools to view profiles of their students
CREATE POLICY "Schools can view their students profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN schools sch ON sch.id = s.school_id
    WHERE s.user_id = profiles.id
    AND sch.user_id = auth.uid()
  )
);

-- Allow schools to view profiles of their teachers
CREATE POLICY "Schools can view their teachers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM school_teachers st
    JOIN schools sch ON sch.id = st.school_id
    WHERE st.teacher_id = profiles.id
    AND sch.user_id = auth.uid()
  )
);