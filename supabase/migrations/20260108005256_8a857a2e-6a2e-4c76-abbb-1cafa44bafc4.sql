-- 1) Add RLS Policy for students to view school_teachers
CREATE POLICY "Students can view their school teachers"
ON public.school_teachers
FOR SELECT
USING (school_id = public.get_student_school_id());

-- 2) Drop the old profiles policy and create a simpler one
DROP POLICY IF EXISTS "Students can view their school teachers profiles" ON public.profiles;

CREATE POLICY "Students can view their school teachers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.school_teachers st
    WHERE st.school_id = public.get_student_school_id()
      AND st.teacher_id = profiles.id
  )
);