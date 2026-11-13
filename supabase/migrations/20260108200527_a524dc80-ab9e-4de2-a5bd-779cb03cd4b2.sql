-- Ensure RLS is enabled
ALTER TABLE public.school_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_level_assessments ENABLE ROW LEVEL SECURITY;

-- المدرسة/المعلم/الطالب/الادمن يمكنهم مشاهدة إجابات محاولات طلاب مدرستهم
CREATE POLICY "school_answers_select_school_teacher_student_admin"
ON public.school_assessment_answers
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.school_assessment_attempts a
    JOIN public.students s ON s.id = a.student_id
    JOIN public.schools sc ON sc.id = s.school_id
    WHERE a.id = public.school_assessment_answers.attempt_id
      AND (
        sc.user_id = auth.uid()
        OR public.teacher_can_view_school(sc.id)
        OR s.user_id = auth.uid()
      )
  )
);

-- السماح بعرض اختبارات التقييم التابعة للمدرسة (للادمن/المدرسة/المعلم/الطالب)
CREATE POLICY "school_level_assessments_select_school_teacher_student_admin"
ON public.school_level_assessments
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR (
    school_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.schools sc WHERE sc.id = public.school_level_assessments.school_id AND sc.user_id = auth.uid())
      OR public.teacher_can_view_school(public.school_level_assessments.school_id)
      OR public.student_can_view_school(public.school_level_assessments.school_id)
    )
  )
);

-- السماح بعرض الأسئلة التابعة لاختبارات المدرسة (للادمن/المدرسة/المعلم/الطالب)
CREATE POLICY "school_assessment_questions_select_school_teacher_student_admin"
ON public.school_assessment_questions
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.school_level_assessments a
    JOIN public.schools sc ON sc.id = a.school_id
    WHERE a.id = public.school_assessment_questions.assessment_id
      AND (
        sc.user_id = auth.uid()
        OR public.teacher_can_view_school(sc.id)
        OR public.student_can_view_school(sc.id)
      )
  )
);

-- السماح بعرض خيارات الأسئلة التابعة لاختبارات المدرسة (للادمن/المدرسة/المعلم/الطالب)
CREATE POLICY "school_assessment_options_select_school_teacher_student_admin"
ON public.school_assessment_options
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.school_assessment_questions q
    JOIN public.school_level_assessments a ON a.id = q.assessment_id
    JOIN public.schools sc ON sc.id = a.school_id
    WHERE q.id = public.school_assessment_options.question_id
      AND (
        sc.user_id = auth.uid()
        OR public.teacher_can_view_school(sc.id)
        OR public.student_can_view_school(sc.id)
      )
  )
);
