-- Add admin policies for subject_content_progress
CREATE POLICY "Admins can view all content progress"
ON public.subject_content_progress
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for teacher_ratings
CREATE POLICY "Admins can manage all ratings"
ON public.teacher_ratings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy for school_assessment_attempts (currently only SELECT)
CREATE POLICY "Admins can manage all assessment attempts"
ON public.school_assessment_attempts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));