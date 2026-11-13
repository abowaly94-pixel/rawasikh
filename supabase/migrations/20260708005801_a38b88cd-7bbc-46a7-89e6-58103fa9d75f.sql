
-- Null out any historically-invalid lesson_ids (belt & suspenders — none currently)
UPDATE public.zoom_links z
SET lesson_id = NULL
WHERE z.lesson_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.course_lessons cl WHERE cl.id = z.lesson_id);

-- Add FK so lesson_id must reference a real course_lessons row
ALTER TABLE public.zoom_links
  DROP CONSTRAINT IF EXISTS zoom_links_lesson_id_fkey;

ALTER TABLE public.zoom_links
  ADD CONSTRAINT zoom_links_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE SET NULL;

-- Same guarantee for course_id
ALTER TABLE public.zoom_links
  DROP CONSTRAINT IF EXISTS zoom_links_course_id_fkey;

ALTER TABLE public.zoom_links
  ADD CONSTRAINT zoom_links_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
