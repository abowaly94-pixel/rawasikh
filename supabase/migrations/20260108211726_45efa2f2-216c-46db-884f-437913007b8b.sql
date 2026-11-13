-- SECURITY: revert overly-permissive public read on PII tables and replace with safe RPCs

-- 1) Drop overly broad public policies (created earlier)
DROP POLICY IF EXISTS "anyone_can_view_active_schools" ON public.schools;
DROP POLICY IF EXISTS "anyone_can_view_classes_basic" ON public.classes;

-- (Stages/grade levels are non-PII; keep them readable for signup, but ensure RLS is enabled)
ALTER TABLE public.global_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;

-- Ensure safe read for signup (non-PII tables)
DROP POLICY IF EXISTS "anyone_can_view_global_stages" ON public.global_stages;
CREATE POLICY "anyone_can_view_global_stages"
ON public.global_stages
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anyone_can_view_grade_levels" ON public.grade_levels;
CREATE POLICY "anyone_can_view_grade_levels"
ON public.grade_levels
FOR SELECT
TO anon, authenticated
USING (true);

-- 2) Provide safe, minimal school/class lists via SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.list_active_schools_for_signup()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.schools
  WHERE is_active IS TRUE
  ORDER BY name;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_schools_for_signup() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_classes_for_signup(_school_id uuid, _stage_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.classes
  WHERE school_id = _school_id
    AND (_stage_id IS NULL OR stage_id = _stage_id)
  ORDER BY name;
$$;

GRANT EXECUTE ON FUNCTION public.list_classes_for_signup(uuid, uuid) TO anon, authenticated;

-- 3) Fix: students created by self-signup were not being inserted due to missing INSERT policy
DROP POLICY IF EXISTS "Students can insert their own record" ON public.students;
CREATE POLICY "Students can insert their own record"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
