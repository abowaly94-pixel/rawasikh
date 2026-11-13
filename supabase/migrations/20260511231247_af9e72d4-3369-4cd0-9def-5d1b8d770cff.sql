
-- 1. teacher_ratings: drop public read on base table
DROP POLICY IF EXISTS "Public can view ratings via view" ON public.teacher_ratings;

-- 2. site-assets storage: admin-only writes
DROP POLICY IF EXISTS "Authenticated users can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete site assets" ON storage.objects;

CREATE POLICY "Admins can upload site assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3. lesson-thumbnails storage: restrict writes to admin/teacher
DROP POLICY IF EXISTS "Authenticated users can upload lesson thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their lesson thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their lesson thumbnails" ON storage.objects;

CREATE POLICY "Admins and teachers can upload lesson thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-thumbnails' AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "Admins and teachers can update lesson thumbnails"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-thumbnails' AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "Admins and teachers can delete lesson thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-thumbnails' AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  );

-- 4. exams: remove broad read; add class-scoped read for students
DROP POLICY IF EXISTS "Anyone authenticated can view exams" ON public.exams;

CREATE POLICY "Students can view exams in their class"
  ON public.exams FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid()
        AND s.class_id = exams.class_id
    )
  );

-- 5. classes: remove broad read
DROP POLICY IF EXISTS "Anyone authenticated can view classes" ON public.classes;

CREATE POLICY "Teachers can view their classes"
  ON public.classes FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

-- 6. lessons: remove broad read
DROP POLICY IF EXISTS "Anyone authenticated can view lessons" ON public.lessons;

-- 7. profiles: scope teacher reads to their own students
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

CREATE POLICY "Teachers can view their own students profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.classes c ON c.id = s.class_id
      WHERE s.user_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );

-- 8. students: prevent self-reassignment via trigger
CREATE OR REPLACE FUNCTION public.prevent_student_self_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow privileged actors (admins, school owners of this student) to change anything.
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schools sch
    WHERE sch.id = OLD.school_id AND sch.user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  -- For self-updates (auth.uid() = user_id), block changes to sensitive columns.
  IF auth.uid() = OLD.user_id THEN
    IF NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.class_id IS DISTINCT FROM OLD.class_id
       OR NEW.stage_id IS DISTINCT FROM OLD.stage_id
       OR NEW.grade_level_id IS DISTINCT FROM OLD.grade_level_id
       OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Students cannot change their own school, class, stage, grade level, parent, or user_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_student_self_reassignment_trg ON public.students;
CREATE TRIGGER prevent_student_self_reassignment_trg
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_self_reassignment();

-- 9. site_settings: drop permissive write policies
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.site_settings;
