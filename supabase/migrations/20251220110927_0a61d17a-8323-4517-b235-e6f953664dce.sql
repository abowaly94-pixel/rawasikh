-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id, class_id, date, lesson_id)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all attendance"
ON public.attendance FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage attendance for their classes"
ON public.attendance FOR ALL
USING (
  public.has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own attendance"
ON public.attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = attendance.student_id
    AND students.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view their children attendance"
ON public.attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = attendance.student_id
    AND students.parent_id = auth.uid()
  )
);

-- Update trigger
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_attendance_class ON public.attendance(class_id);