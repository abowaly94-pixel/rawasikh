-- =============================================
-- 1. تحديث سياسات الاختبارات (exams) لعزل بيانات المدرسين والمدارس
-- =============================================

-- حذف السياسات القديمة المفتوحة
DROP POLICY IF EXISTS "Anyone authenticated can view exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view public exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can manage exams for their classes" ON public.exams;

-- سياسة جديدة: المدرسين يرون فقط اختباراتهم
CREATE POLICY "Teachers can view their own exams"
ON public.exams FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = exams.class_id 
    AND classes.teacher_id = auth.uid()
  )
);

-- سياسة جديدة: المدرسين يديرون اختباراتهم فقط
CREATE POLICY "Teachers can manage their own exams"
ON public.exams FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  created_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  created_by = auth.uid()
);

-- سياسة: الطلاب يرون الاختبارات العامة لفصولهم فقط
CREATE POLICY "Students can view public exams for their classes"
ON public.exams FOR SELECT
USING (
  is_public = true AND
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = auth.uid()
    AND s.class_id = exams.class_id
  )
);

-- سياسة: المدارس ترى اختبارات فصولها فقط
CREATE POLICY "Schools can view their classes exams"
ON public.exams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN schools s ON s.id = c.school_id
    WHERE c.id = exams.class_id
    AND s.user_id = auth.uid()
  )
);

-- =============================================
-- 2. تحديث سياسات الاختبارات القصيرة (course_quizzes)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view active quizzes" ON public.course_quizzes;

-- المدرسين يرون فقط اختباراتهم
CREATE POLICY "Teachers can view their quizzes only"
ON public.course_quizzes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid())
);

-- =============================================
-- 3. تحديث سياسات الفصول (classes) 
-- =============================================

DROP POLICY IF EXISTS "Anyone authenticated can view classes" ON public.classes;

-- المدرسين يرون فقط فصولهم
CREATE POLICY "Teachers can view their own classes"
ON public.classes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM schools s WHERE s.id = classes.school_id AND s.user_id = auth.uid()
  )
);

-- =============================================
-- 4. تحديث سياسات الحصص الأونلاين (online_sessions)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.online_sessions;

-- المدرسين يرون فقط حصصهم
CREATE POLICY "Teachers can view their own sessions"
ON public.online_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  teacher_id = auth.uid()
);

-- الطلاب يرون الحصص المفعلة فقط
CREATE POLICY "Students can view active sessions"
ON public.online_sessions FOR SELECT
USING (
  is_active = true AND has_role(auth.uid(), 'student'::app_role)
);

-- =============================================
-- 5. تحديث سياسات الطلاب (students)
-- =============================================

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;

-- المدرسين يرون طلاب فصولهم فقط
CREATE POLICY "Teachers can view students in their own classes"
ON public.students FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = students.class_id
    AND c.teacher_id = auth.uid()
  )
);

-- =============================================
-- 6. تحديث سياسات الملفات الشخصية (profiles)
-- =============================================

-- تأكد من أن المدرسين يظهرون للأدمن فقط (وليس لمدرسين آخرين)
DROP POLICY IF EXISTS "Anyone can view teacher profiles" ON public.profiles;

-- فقط الأدمن يرى ملفات المدرسين
CREATE POLICY "Only admins can view all teacher profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  id = auth.uid() OR
  -- المدارس ترى ملفات مدرسيها
  EXISTS (
    SELECT 1 FROM school_teachers st
    JOIN schools s ON s.id = st.school_id
    WHERE st.teacher_id = profiles.id
    AND s.user_id = auth.uid()
  ) OR
  -- الطلاب يرون مدرسيهم في المدرسة
  EXISTS (
    SELECT 1 FROM students stud
    JOIN school_teachers st ON st.school_id = stud.school_id
    WHERE stud.user_id = auth.uid()
    AND st.teacher_id = profiles.id
  )
);