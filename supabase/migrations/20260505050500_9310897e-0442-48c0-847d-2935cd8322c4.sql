
-- 1) site_settings: writes admin-only
DROP POLICY IF EXISTS "Authenticated users can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can delete site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone authenticated can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone authenticated can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Users can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Users can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Users can delete site settings" ON public.site_settings;

CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site settings"
ON public.site_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) teacher_ratings: hide reviewer identity from public
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Public can view ratings" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Anyone can read ratings" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Anyone can view teacher ratings" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Public can read teacher ratings" ON public.teacher_ratings;

CREATE OR REPLACE VIEW public.teacher_ratings_public AS
SELECT id, teacher_id, rating, review, created_at
FROM public.teacher_ratings;

GRANT SELECT ON public.teacher_ratings_public TO anon, authenticated;

CREATE POLICY "Users can view their own ratings"
ON public.teacher_ratings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
ON public.teacher_ratings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
