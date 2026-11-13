-- Create a security definer function for students to check their school
CREATE OR REPLACE FUNCTION public.student_can_view_school(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.school_id = _school_id
      AND s.user_id = auth.uid()
  );
$$;

-- Allow students to view their assigned school
CREATE POLICY "Students can view their assigned school"
ON public.schools
FOR SELECT
USING (public.student_can_view_school(id));