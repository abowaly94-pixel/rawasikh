-- Allow anyone to read active assessments (for invite links)
CREATE POLICY "Anyone can view active assessments" 
ON public.school_level_assessments 
FOR SELECT 
USING (is_active = true);

-- Allow anyone to read assessment questions for active assessments
CREATE POLICY "Anyone can view questions for active assessments"
ON public.school_assessment_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_level_assessments 
    WHERE id = assessment_id AND is_active = true
  )
);

-- Allow anyone to read options for active assessment questions
CREATE POLICY "Anyone can view options for active assessments"
ON public.school_assessment_options
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_assessment_questions saq
    JOIN public.school_level_assessments sla ON sla.id = saq.assessment_id
    WHERE saq.id = question_id AND sla.is_active = true
  )
);