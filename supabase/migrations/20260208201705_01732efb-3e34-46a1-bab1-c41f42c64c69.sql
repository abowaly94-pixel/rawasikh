-- Drop existing policies on courses table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.courses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.courses;
DROP POLICY IF EXISTS "Enable update for course owners" ON public.courses;
DROP POLICY IF EXISTS "Enable delete for course owners" ON public.courses;
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_policy" ON public.courses;
DROP POLICY IF EXISTS "courses_update_policy" ON public.courses;
DROP POLICY IF EXISTS "courses_delete_policy" ON public.courses;

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can see published courses, admins see all, teachers see their own
CREATE POLICY "courses_select_policy" ON public.courses
FOR SELECT USING (
  is_published = true 
  OR instructor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- INSERT: Admins and teachers can create courses
CREATE POLICY "courses_insert_policy" ON public.courses
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'teacher')
);

-- UPDATE: Only course creator (instructor) or admin can update
CREATE POLICY "courses_update_policy" ON public.courses
FOR UPDATE USING (
  instructor_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- DELETE: Only course creator (instructor) or admin can delete
CREATE POLICY "courses_delete_policy" ON public.courses
FOR DELETE USING (
  instructor_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);