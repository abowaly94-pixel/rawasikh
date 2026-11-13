-- Create exam categories table
CREATE TABLE public.exam_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to exams table
ALTER TABLE public.exams 
ADD COLUMN category_id UUID REFERENCES public.exam_categories(id) ON DELETE SET NULL;

-- Add is_public column to exams to make them available for students
ALTER TABLE public.exams 
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Enable RLS on exam_categories
ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active exam categories"
ON public.exam_categories
FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage exam categories"
ON public.exam_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view all categories
CREATE POLICY "Teachers can view exam categories"
ON public.exam_categories
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Create exam_attempts table to track student attempts on evaluation exams
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  passed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on exam_attempts
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "Students can view their own exam attempts"
ON public.exam_attempts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students 
  WHERE students.id = exam_attempts.student_id 
  AND students.user_id = auth.uid()
));

-- Students can insert their own attempts
CREATE POLICY "Students can insert their own exam attempts"
ON public.exam_attempts
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM students 
  WHERE students.id = exam_attempts.student_id 
  AND students.user_id = auth.uid()
));

-- Students can update their own attempts
CREATE POLICY "Students can update their own exam attempts"
ON public.exam_attempts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM students 
  WHERE students.id = exam_attempts.student_id 
  AND students.user_id = auth.uid()
));

-- Admins can manage all attempts
CREATE POLICY "Admins can manage all exam attempts"
ON public.exam_attempts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view attempts for their class exams
CREATE POLICY "Teachers can view exam attempts for their classes"
ON public.exam_attempts
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM exams e
  JOIN classes c ON c.id = e.class_id
  WHERE e.id = exam_attempts.exam_id
  AND c.teacher_id = auth.uid()
));

-- Parents can view their children attempts
CREATE POLICY "Parents can view children exam attempts"
ON public.exam_attempts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students 
  WHERE students.id = exam_attempts.student_id 
  AND students.parent_id = auth.uid()
));

-- Create exam_questions table for evaluation exam questions
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on exam_questions
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view questions of public exams
CREATE POLICY "Anyone can view public exam questions"
ON public.exam_questions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM exams 
  WHERE exams.id = exam_questions.exam_id 
  AND exams.is_public = true
));

-- Admins can manage all questions
CREATE POLICY "Admins can manage exam questions"
ON public.exam_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage questions for their class exams
CREATE POLICY "Teachers can manage their exam questions"
ON public.exam_questions
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM exams e
  JOIN classes c ON c.id = e.class_id
  WHERE e.id = exam_questions.exam_id
  AND c.teacher_id = auth.uid()
));

-- Create exam_question_options table
CREATE TABLE public.exam_question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Enable RLS on exam_question_options
ALTER TABLE public.exam_question_options ENABLE ROW LEVEL SECURITY;

-- Anyone can view options for public exam questions
CREATE POLICY "Anyone can view public exam question options"
ON public.exam_question_options
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM exam_questions eq
  JOIN exams e ON e.id = eq.exam_id
  WHERE eq.id = exam_question_options.question_id 
  AND e.is_public = true
));

-- Admins can manage all options
CREATE POLICY "Admins can manage exam question options"
ON public.exam_question_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage options for their exam questions
CREATE POLICY "Teachers can manage their exam question options"
ON public.exam_question_options
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM exam_questions eq
  JOIN exams e ON e.id = eq.exam_id
  JOIN classes c ON c.id = e.class_id
  WHERE eq.id = exam_question_options.question_id
  AND c.teacher_id = auth.uid()
));

-- Create exam_answers table
CREATE TABLE public.exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.exam_question_options(id),
  answer_text TEXT,
  is_correct BOOLEAN
);

-- Enable RLS on exam_answers
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- Students can manage their own answers
CREATE POLICY "Students can manage their own exam answers"
ON public.exam_answers
FOR ALL
USING (EXISTS (
  SELECT 1 FROM exam_attempts ea
  JOIN students s ON s.id = ea.student_id
  WHERE ea.id = exam_answers.attempt_id 
  AND s.user_id = auth.uid()
));

-- Admins can view all answers
CREATE POLICY "Admins can view all exam answers"
ON public.exam_answers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view answers for their class exams
CREATE POLICY "Teachers can view exam answers for their classes"
ON public.exam_answers
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM exam_attempts ea
  JOIN exams e ON e.id = ea.exam_id
  JOIN classes c ON c.id = e.class_id
  WHERE ea.id = exam_answers.attempt_id
  AND c.teacher_id = auth.uid()
));

-- Update trigger for exam_categories
CREATE TRIGGER update_exam_categories_updated_at
BEFORE UPDATE ON public.exam_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policy for exams to allow students to view public exams
CREATE POLICY "Students can view public exams"
ON public.exams
FOR SELECT
USING (is_public = true);