ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prices jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.course_levels ADD COLUMN IF NOT EXISTS prices jsonb NOT NULL DEFAULT '{}'::jsonb;