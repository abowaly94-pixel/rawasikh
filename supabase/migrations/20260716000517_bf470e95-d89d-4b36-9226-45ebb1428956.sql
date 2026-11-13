
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS captions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS captions jsonb NOT NULL DEFAULT '[]'::jsonb;
