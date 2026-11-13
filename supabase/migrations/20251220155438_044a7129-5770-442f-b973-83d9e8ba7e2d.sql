-- Allow students to record their own attendance for scheduled lessons (when joining)
-- First drop if exists, then create
DROP POLICY IF EXISTS "Students can insert their own lesson attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students can update their own lesson attendance" ON public.attendance;

CREATE POLICY "Students can insert their own lesson attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  lesson_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = auth.uid()
      AND s.class_id = attendance.class_id
  )
);

CREATE POLICY "Students can update their own lesson attendance"
ON public.attendance
FOR UPDATE
USING (
  lesson_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = auth.uid()
      AND s.class_id = attendance.class_id
  )
)
WITH CHECK (
  lesson_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = auth.uid()
      AND s.class_id = attendance.class_id
  )
);