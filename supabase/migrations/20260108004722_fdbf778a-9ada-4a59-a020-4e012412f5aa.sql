-- Add RLS policy to allow students to view their school's teachers profiles
CREATE POLICY "Students can view their school teachers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.school_teachers st
    JOIN public.students s ON s.school_id = st.school_id
    WHERE st.teacher_id = profiles.id
      AND s.user_id = auth.uid()
  )
);