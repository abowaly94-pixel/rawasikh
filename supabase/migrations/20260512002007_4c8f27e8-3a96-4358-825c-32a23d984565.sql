
DELETE FROM public.course_level_purchases
WHERE course_id NOT IN (SELECT id FROM public.courses)
   OR level_id NOT IN (SELECT id FROM public.course_levels);

ALTER TABLE public.course_level_purchases
  ADD CONSTRAINT course_level_purchases_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.course_level_purchases
  ADD CONSTRAINT course_level_purchases_level_id_fkey
  FOREIGN KEY (level_id) REFERENCES public.course_levels(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
