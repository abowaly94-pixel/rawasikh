
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS captions_url text;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS captions_url text;
