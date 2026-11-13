
-- 1. Fix packages.bank_account_info exposure to anonymous users (column-level grant)
REVOKE SELECT ON public.packages FROM anon;
GRANT SELECT (id, name, description, duration_days, price, is_active, created_at, updated_at) ON public.packages TO anon;

-- 2. Fix teacher email/phone exposure to anonymous users
DROP POLICY IF EXISTS "Anyone can view teacher profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view teacher profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id AND user_roles.role = 'teacher'::app_role
  )
);

-- Public-safe teacher view (no email/phone) for anonymous and authenticated visitors
CREATE OR REPLACE VIEW public.public_teachers AS
SELECT p.id, p.full_name, p.avatar_url, p.bio
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'teacher'::app_role
);

GRANT SELECT ON public.public_teachers TO anon, authenticated;

-- 3. Remove unused tables from realtime publication (frontend doesn't subscribe to them)
ALTER PUBLICATION supabase_realtime DROP TABLE public.lesson_progress;
ALTER PUBLICATION supabase_realtime DROP TABLE public.online_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.session_enrollments;
