-- Allow students to view classes in their school
CREATE POLICY "Students can view classes in their school"
ON public.classes
FOR SELECT
USING (
  school_id IN (
    SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
  )
);

-- Allow students to view lessons in their school
CREATE POLICY "Students can view lessons in their school"
ON public.lessons
FOR SELECT
USING (
  school_id IN (
    SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
  )
);

-- Allow students to view subjects in their school
CREATE POLICY "Students can view subjects in their school"
ON public.subjects
FOR SELECT
USING (
  school_id IN (
    SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
  )
);

-- Allow students to view stages in their school
CREATE POLICY "Students can view stages in their school"
ON public.stages
FOR SELECT
USING (
  school_id IN (
    SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
  )
);