
CREATE OR REPLACE FUNCTION public.user_has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_purchases
    WHERE user_id = _user_id AND course_id = _course_id AND payment_status = 'completed'
  ) OR EXISTS (
    SELECT 1 FROM public.course_level_purchases
    WHERE user_id = _user_id AND course_id = _course_id AND payment_status = 'completed'
  );
$$;

DROP POLICY IF EXISTS "Anyone can view active zoom links" ON public.zoom_links;

CREATE POLICY "Zoom links visibility by role and enrollment"
ON public.zoom_links FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_active = true
    AND auth.uid() IS NOT NULL
    AND (
      (
        lesson_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.course_lessons cl
          JOIN public.course_sections cs ON cs.id = cl.section_id
          WHERE cl.id = zoom_links.lesson_id
            AND public.user_has_course_access(auth.uid(), cs.course_id)
        )
      )
      OR (
        lesson_id IS NULL
        AND course_id IS NOT NULL
        AND public.user_has_course_access(auth.uid(), zoom_links.course_id)
      )
    )
  )
);
