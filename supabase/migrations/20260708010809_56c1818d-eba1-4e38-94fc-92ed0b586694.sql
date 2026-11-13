
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_courses_display_order ON public.courses(display_order);

INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('courses_per_row', '3')
ON CONFLICT (setting_key) DO NOTHING;
