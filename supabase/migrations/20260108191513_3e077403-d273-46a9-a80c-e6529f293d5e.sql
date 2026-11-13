-- Add weakness feedback column to school_assessment_questions
ALTER TABLE public.school_assessment_questions
ADD COLUMN IF NOT EXISTS weakness_feedback TEXT;