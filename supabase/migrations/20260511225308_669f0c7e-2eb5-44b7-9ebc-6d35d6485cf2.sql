-- 1) Add new question_type enum values (used by quiz_questions)
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'essay';

-- 2) Add match_text column to options tables (right-side text for matching)
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS match_text text;
ALTER TABLE public.exam_question_options ADD COLUMN IF NOT EXISTS match_text text;
ALTER TABLE public.school_assessment_options ADD COLUMN IF NOT EXISTS match_text text;

-- 3) Manual grading columns for essays on the answer tables
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS manual_score numeric;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS graded_by uuid;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS graded_at timestamptz;

ALTER TABLE public.exam_answers ADD COLUMN IF NOT EXISTS manual_score numeric;
ALTER TABLE public.exam_answers ADD COLUMN IF NOT EXISTS graded_by uuid;
ALTER TABLE public.exam_answers ADD COLUMN IF NOT EXISTS graded_at timestamptz;

ALTER TABLE public.school_assessment_answers ADD COLUMN IF NOT EXISTS manual_score numeric;
ALTER TABLE public.school_assessment_answers ADD COLUMN IF NOT EXISTS graded_by uuid;
ALTER TABLE public.school_assessment_answers ADD COLUMN IF NOT EXISTS graded_at timestamptz;