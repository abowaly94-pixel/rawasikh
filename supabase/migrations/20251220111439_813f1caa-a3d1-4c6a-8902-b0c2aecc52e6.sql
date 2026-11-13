-- Create exam types enum
CREATE TYPE public.exam_type AS ENUM ('quiz', 'midterm', 'final', 'assignment', 'project');

-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  exam_type public.exam_type NOT NULL DEFAULT 'quiz',
  max_score NUMERIC NOT NULL DEFAULT 100,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grades table
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  notes TEXT,
  graded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Exams RLS policies
CREATE POLICY "Admins can manage all exams"
ON public.exams FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage exams for their classes"
ON public.exams FOR ALL
USING (
  public.has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = exams.class_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Anyone authenticated can view exams"
ON public.exams FOR SELECT
USING (true);

-- Grades RLS policies
CREATE POLICY "Admins can manage all grades"
ON public.grades FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage grades for their class exams"
ON public.grades FOR ALL
USING (
  public.has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.exams
    JOIN public.classes ON classes.id = exams.class_id
    WHERE exams.id = grades.exam_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own grades"
ON public.grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = grades.student_id
    AND students.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view their children grades"
ON public.grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = grades.student_id
    AND students.parent_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
BEFORE UPDATE ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();