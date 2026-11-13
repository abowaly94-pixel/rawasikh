-- Create security definer function to get student's school_id
CREATE OR REPLACE FUNCTION public.get_student_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id 
  FROM public.students 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Create security definer function to check if user is student of a school
CREATE OR REPLACE FUNCTION public.is_student_of_school(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students
    WHERE school_id = _school_id
      AND user_id = auth.uid()
  );
$$;

-- Drop and recreate policies using the new functions to avoid recursion

-- Classes policy
DROP POLICY IF EXISTS "Students can view classes in their school" ON public.classes;
CREATE POLICY "Students can view classes in their school"
ON public.classes
FOR SELECT
USING (school_id = public.get_student_school_id());

-- Lessons policy
DROP POLICY IF EXISTS "Students can view lessons in their school" ON public.lessons;
CREATE POLICY "Students can view lessons in their school"
ON public.lessons
FOR SELECT
USING (school_id = public.get_student_school_id());

-- Subjects policy
DROP POLICY IF EXISTS "Students can view subjects in their school" ON public.subjects;
CREATE POLICY "Students can view subjects in their school"
ON public.subjects
FOR SELECT
USING (school_id = public.get_student_school_id());

-- Stages policy
DROP POLICY IF EXISTS "Students can view stages in their school" ON public.stages;
CREATE POLICY "Students can view stages in their school"
ON public.stages
FOR SELECT
USING (school_id = public.get_student_school_id());