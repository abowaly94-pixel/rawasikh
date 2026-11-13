-- Fix RLS recursion between schools <-> school_teachers by using a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.teacher_can_view_school(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_teachers st
    WHERE st.school_id = _school_id
      AND st.teacher_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Teachers can view their assigned schools" ON public.schools;

CREATE POLICY "Teachers can view their assigned schools"
ON public.schools
FOR SELECT
USING (public.teacher_can_view_school(id));
