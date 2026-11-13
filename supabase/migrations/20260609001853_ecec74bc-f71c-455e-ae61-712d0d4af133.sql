
DROP VIEW IF EXISTS public.public_teachers;

CREATE VIEW public.public_teachers
WITH (security_invoker = true) AS
SELECT p.id, p.full_name, p.avatar_url, p.bio
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'teacher'::app_role
);

-- Allow anon to read teacher rows (column-restricted by the view definition + grants)
CREATE POLICY "Anon can view teacher safe profile fields"
ON public.profiles FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id AND user_roles.role = 'teacher'::app_role
  )
);

-- Restrict column access for anon so even if they hit profiles table directly, email/phone are hidden
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, bio) ON public.profiles TO anon;

GRANT SELECT ON public.public_teachers TO anon, authenticated;
