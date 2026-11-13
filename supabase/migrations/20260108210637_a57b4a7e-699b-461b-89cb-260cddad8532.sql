-- Allow anyone (including anonymous users) to view active schools for signup
CREATE POLICY "anyone_can_view_active_schools"
ON public.schools
FOR SELECT
USING (is_active = true);

-- Allow anyone to view global_stages for signup
CREATE POLICY "anyone_can_view_global_stages"
ON public.global_stages
FOR SELECT
USING (true);

-- Allow anyone to view grade_levels for signup
CREATE POLICY "anyone_can_view_grade_levels"
ON public.grade_levels
FOR SELECT
USING (true);

-- Allow anyone to view classes for signup (only basic info)
CREATE POLICY "anyone_can_view_classes_basic"
ON public.classes
FOR SELECT
USING (true);