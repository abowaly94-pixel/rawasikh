-- Allow schools to view assessment attempts for their students (even if assessment has no school_id)
DROP POLICY IF EXISTS "Schools can view their students attempts" ON public.school_assessment_attempts;

CREATE POLICY "Schools can view their students attempts" 
ON public.school_assessment_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN schools sch ON sch.id = s.school_id
    WHERE s.id = school_assessment_attempts.student_id
    AND sch.user_id = auth.uid()
  )
);