ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_label text;
ALTER TABLE public.course_levels ADD COLUMN IF NOT EXISTS price_label text;