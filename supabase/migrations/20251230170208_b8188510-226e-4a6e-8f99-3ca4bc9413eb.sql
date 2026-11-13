-- Add 'evaluation' to exam_type enum
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'evaluation';

-- Create a table to track student overall performance summary
CREATE TABLE public.student_performance_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  note text NOT NULL,
  recommendation text,
  shared_with_parent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_performance_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all performance notes"
ON public.student_performance_notes FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their performance notes"
ON public.student_performance_notes FOR ALL
USING (auth.uid() = teacher_id);

CREATE POLICY "Parents can view shared notes about their children"
ON public.student_performance_notes FOR SELECT
USING (
  shared_with_parent = true AND
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_performance_notes.student_id
    AND students.parent_id = auth.uid()
  )
);

CREATE POLICY "Students can view shared notes about themselves"
ON public.student_performance_notes FOR SELECT
USING (
  shared_with_parent = true AND
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_performance_notes.student_id
    AND students.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_student_performance_notes_updated_at
BEFORE UPDATE ON public.student_performance_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();