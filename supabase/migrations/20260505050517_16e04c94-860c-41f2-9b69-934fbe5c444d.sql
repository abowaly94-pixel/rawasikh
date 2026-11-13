
ALTER VIEW public.teacher_ratings_public SET (security_invoker = true);

-- Allow anon/authenticated to SELECT base rows for the view to work without exposing user_id
CREATE POLICY "Public can view ratings via view"
ON public.teacher_ratings FOR SELECT
TO anon, authenticated
USING (true);
