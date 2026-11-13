-- ============================================
-- إصلاح سياسات RLS لضمان عزل البيانات الكامل
-- ============================================

-- 1. إصلاح سياسة profiles - منع المعلمين من رؤية كل الملفات
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

-- المعلمون يرون فقط طلاب فصولهم
CREATE POLICY "Teachers can view their students profiles" 
ON public.profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND (
    -- طلاب الفصول التي يدرسها المعلم
    EXISTS (
      SELECT 1 FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.user_id = profiles.id AND c.teacher_id = auth.uid()
    )
    -- أو طلاب المدارس التي يعمل بها
    OR EXISTS (
      SELECT 1 FROM students s
      JOIN school_teachers st ON st.school_id = s.school_id
      WHERE s.user_id = profiles.id AND st.teacher_id = auth.uid()
    )
  )
);

-- 2. تقييد stages للمستخدمين المعنيين فقط
DROP POLICY IF EXISTS "Stages are viewable by everyone" ON public.stages;

CREATE POLICY "Stages viewable by related users" 
ON public.stages FOR SELECT 
USING (
  -- المسؤولين
  has_role(auth.uid(), 'admin'::app_role)
  -- أو المدرسة صاحبة المرحلة
  OR (school_id IN (SELECT id FROM schools WHERE user_id = auth.uid()))
  -- أو الطلاب المنتمين للمدرسة
  OR (school_id = get_student_school_id())
  -- أو المعلمين المنتمين للمدرسة
  OR teacher_can_view_school(school_id)
);

-- 3. تقييد question_options لمن لديه الحق
DROP POLICY IF EXISTS "Anyone can view options" ON public.question_options;

CREATE POLICY "Options viewable by related users" 
ON public.question_options FOR SELECT 
USING (
  -- المسؤولين
  has_role(auth.uid(), 'admin'::app_role)
  -- أو المعلم صاحب الاختبار
  OR EXISTS (
    SELECT 1 FROM quiz_questions q
    JOIN course_quizzes cq ON cq.id = q.quiz_id
    WHERE q.id = question_options.question_id AND cq.created_by = auth.uid()
  )
  -- أو الطلاب الذين لديهم وصول للاختبار
  OR EXISTS (
    SELECT 1 FROM quiz_questions q
    JOIN course_quizzes cq ON cq.id = q.quiz_id
    WHERE q.id = question_options.question_id AND cq.is_active = true
  )
);

-- 4. تقييد subject_quiz_options
DROP POLICY IF EXISTS "Anyone can view options" ON public.subject_quiz_options;

CREATE POLICY "Subject quiz options viewable by related users" 
ON public.subject_quiz_options FOR SELECT 
USING (
  -- المسؤولين
  has_role(auth.uid(), 'admin'::app_role)
  -- أو صاحب المدرسة
  OR EXISTS (
    SELECT 1 FROM subject_quiz_questions qq
    JOIN subject_quizzes sq ON sq.id = qq.quiz_id
    JOIN subjects s ON s.id = sq.subject_id
    JOIN schools sch ON sch.id = s.school_id
    WHERE qq.id = subject_quiz_options.question_id AND sch.user_id = auth.uid()
  )
  -- أو الطلاب المنتمين للمدرسة
  OR EXISTS (
    SELECT 1 FROM subject_quiz_questions qq
    JOIN subject_quizzes sq ON sq.id = qq.quiz_id
    JOIN subjects s ON s.id = sq.subject_id
    WHERE qq.id = subject_quiz_options.question_id AND s.school_id = get_student_school_id()
  )
  -- أو المعلمين المنتمين للمدرسة
  OR EXISTS (
    SELECT 1 FROM subject_quiz_questions qq
    JOIN subject_quizzes sq ON sq.id = qq.quiz_id
    JOIN subjects s ON s.id = sq.subject_id
    WHERE qq.id = subject_quiz_options.question_id AND teacher_can_view_school(s.school_id)
  )
);

-- 5. إصلاح سياسة global_stages لتكون للمستخدمين المسجلين فقط
DROP POLICY IF EXISTS "Everyone can view global stages" ON public.global_stages;
DROP POLICY IF EXISTS "anyone_can_view_global_stages" ON public.global_stages;

CREATE POLICY "Authenticated users can view global stages" 
ON public.global_stages FOR SELECT TO authenticated
USING (true);

-- 6. إصلاح grade_levels لتكون للمستخدمين المسجلين فقط
DROP POLICY IF EXISTS "Everyone can view grade levels" ON public.grade_levels;
DROP POLICY IF EXISTS "Grade levels are viewable by everyone" ON public.grade_levels;
DROP POLICY IF EXISTS "anyone_can_view_grade_levels" ON public.grade_levels;

CREATE POLICY "Authenticated users can view grade levels" 
ON public.grade_levels FOR SELECT TO authenticated
USING (true);

-- 7. تقييد من يمكنه رؤية بيانات المدارس الحساسة (البريد والهاتف)
-- إنشاء view للبيانات العامة فقط
CREATE OR REPLACE VIEW public.schools_public
WITH (security_invoker = true) AS
SELECT id, name, logo_url, is_active, created_at
FROM public.schools;

-- 8. إضافة دالة للتحقق من صاحب الاختبار
CREATE OR REPLACE FUNCTION public.is_exam_owner(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exams e
    JOIN classes c ON c.id = e.class_id
    WHERE e.id = _exam_id 
    AND (e.created_by = auth.uid() OR c.teacher_id = auth.uid())
  )
$$;

-- 9. إضافة دالة للتحقق من ملكية المحتوى
CREATE OR REPLACE FUNCTION public.is_content_owner(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM schools WHERE id = _school_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM school_teachers WHERE school_id = _school_id AND teacher_id = auth.uid()
  )
$$;