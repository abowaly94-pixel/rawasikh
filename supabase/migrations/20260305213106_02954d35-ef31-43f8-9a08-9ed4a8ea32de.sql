-- Schools can view attendance for their students
CREATE POLICY "Schools can view their students attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.id = attendance.student_id AND sch.user_id = auth.uid()
));

-- Schools can view grades for their students
CREATE POLICY "Schools can view their students grades"
ON public.grades
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.id = grades.student_id AND sch.user_id = auth.uid()
));

-- Schools can view exam attempts for their students
CREATE POLICY "Schools can view their students exam attempts"
ON public.exam_attempts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.id = exam_attempts.student_id AND sch.user_id = auth.uid()
));

-- Schools can manage lessons in their school
CREATE POLICY "Schools can manage their lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM schools
  WHERE schools.id = lessons.school_id AND schools.user_id = auth.uid()
));

-- Schools can view quiz attempts by their students
CREATE POLICY "Schools can view their students quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.user_id = quiz_attempts.user_id AND sch.user_id = auth.uid()
));

-- Schools can view lesson progress of their students
CREATE POLICY "Schools can view their students lesson progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.user_id = lesson_progress.user_id AND sch.user_id = auth.uid()
));

-- Schools can view performance notes about their students
CREATE POLICY "Schools can view their students performance notes"
ON public.student_performance_notes
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN schools sch ON sch.id = s.school_id
  WHERE s.id = student_performance_notes.student_id AND sch.user_id = auth.uid()
));