
ALTER TABLE public.zoom_links
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_zoom_links_course ON public.zoom_links(course_id);
CREATE INDEX IF NOT EXISTS idx_zoom_links_lesson ON public.zoom_links(lesson_id);
