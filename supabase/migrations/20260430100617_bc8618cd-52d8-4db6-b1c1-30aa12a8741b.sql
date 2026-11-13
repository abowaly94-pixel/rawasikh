-- 1) Add level assessment requirement flag and link to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS has_levels boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_level_assessment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS level_assessment_id uuid;

-- 2) Course levels table
CREATE TABLE IF NOT EXISTS public.course_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  min_score numeric,
  max_score numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_levels_course ON public.course_levels(course_id);

ALTER TABLE public.course_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active course levels"
  ON public.course_levels FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage course levels"
  ON public.course_levels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage their course levels"
  ON public.course_levels FOR ALL
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_levels.course_id AND c.instructor_id = auth.uid())
  );

CREATE TRIGGER trg_course_levels_updated_at
  BEFORE UPDATE ON public.course_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Link course sections to a level (optional)
ALTER TABLE public.course_sections
  ADD COLUMN IF NOT EXISTS level_id uuid;

CREATE INDEX IF NOT EXISTS idx_course_sections_level ON public.course_sections(level_id);

-- 4) Purchases per level
CREATE TABLE IF NOT EXISTS public.course_level_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  level_id uuid NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_clp_user ON public.course_level_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_clp_course ON public.course_level_purchases(course_id);

ALTER TABLE public.course_level_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own level purchases"
  ON public.course_level_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own level purchases"
  ON public.course_level_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all level purchases"
  ON public.course_level_purchases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Update lesson visibility: allow access if user purchased the level the section belongs to
CREATE POLICY "Level purchasers can view lessons"
  ON public.course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_sections cs
      JOIN public.course_level_purchases clp
        ON clp.level_id = cs.level_id
      WHERE cs.id = course_lessons.section_id
        AND clp.user_id = auth.uid()
        AND clp.payment_status = 'completed'
    )
  );

-- 6) Track student's level assessment result per course (for auto-detected level)
CREATE TABLE IF NOT EXISTS public.course_level_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  recommended_level_id uuid,
  score numeric,
  taken_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.course_level_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own level assessments"
  ON public.course_level_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own level assessments"
  ON public.course_level_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own level assessments"
  ON public.course_level_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all level assessments"
  ON public.course_level_assessments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));