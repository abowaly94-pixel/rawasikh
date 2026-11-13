-- Allow students to view subject content in their school
CREATE POLICY "Students can view subject content in their school"
ON public.subject_content
FOR SELECT
USING (
  subject_id IN (
    SELECT sub.id FROM public.subjects sub
    WHERE sub.school_id IN (
      SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
    )
  )
);

-- Allow students to track their content progress
CREATE POLICY "Students can view their content progress"
ON public.subject_content_progress
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can insert their content progress"
ON public.subject_content_progress
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow students to view subject quizzes
CREATE POLICY "Students can view subject quizzes in their school"
ON public.subject_quizzes
FOR SELECT
USING (
  subject_id IN (
    SELECT sub.id FROM public.subjects sub
    WHERE sub.school_id IN (
      SELECT s.school_id FROM public.students s WHERE s.user_id = auth.uid()
    )
  )
);