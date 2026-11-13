
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.school_assessment_questions ADD COLUMN IF NOT EXISTS image_url text;
