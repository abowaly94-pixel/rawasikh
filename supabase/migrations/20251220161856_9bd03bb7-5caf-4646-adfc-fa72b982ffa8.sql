-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank', 'short_answer');

-- Create quizzes table
CREATE TABLE public.course_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
  points INTEGER DEFAULT 1,
  correct_answer TEXT, -- For fill_blank and true_false
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question options table (for multiple choice)
CREATE TABLE public.question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Create table to link quizzes to courses/sections
CREATE TABLE public.course_quiz_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, quiz_id)
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_points INTEGER,
  passed BOOLEAN
);

-- Create quiz answers table
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN
);

-- Enable RLS
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_quizzes
CREATE POLICY "Admins can manage all quizzes"
ON public.course_quizzes FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their quizzes"
ON public.course_quizzes FOR ALL
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Anyone can view active quizzes"
ON public.course_quizzes FOR SELECT
USING (is_active = true);

-- RLS Policies for quiz_questions
CREATE POLICY "Admins can manage all questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage questions of their quizzes"
ON public.quiz_questions FOR ALL
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.course_quizzes WHERE id = quiz_id AND created_by = auth.uid())
);

CREATE POLICY "Anyone can view questions of active quizzes"
ON public.quiz_questions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.course_quizzes WHERE id = quiz_id AND is_active = true)
);

-- RLS Policies for question_options
CREATE POLICY "Admins can manage all options"
ON public.question_options FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage options of their questions"
ON public.question_options FOR ALL
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.quiz_questions q 
    JOIN public.course_quizzes cq ON cq.id = q.quiz_id 
    WHERE q.id = question_id AND cq.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view options"
ON public.question_options FOR SELECT
USING (true);

-- RLS Policies for course_quiz_assignments
CREATE POLICY "Admins can manage all assignments"
ON public.course_quiz_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage assignments for their courses"
ON public.course_quiz_assignments FOR ALL
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

CREATE POLICY "Anyone can view assignments"
ON public.course_quiz_assignments FOR SELECT
USING (true);

-- RLS Policies for quiz_attempts
CREATE POLICY "Admins can view all attempts"
ON public.quiz_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view attempts for their quizzes"
ON public.quiz_attempts FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.course_quizzes WHERE id = quiz_id AND created_by = auth.uid())
);

CREATE POLICY "Users can manage their own attempts"
ON public.quiz_attempts FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for quiz_answers
CREATE POLICY "Admins can view all answers"
ON public.quiz_answers FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view answers for their quizzes"
ON public.quiz_answers FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.quiz_attempts a 
    JOIN public.course_quizzes q ON q.id = a.quiz_id 
    WHERE a.id = attempt_id AND q.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage their own answers"
ON public.quiz_answers FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid())
);

-- Add triggers for updated_at
CREATE TRIGGER update_course_quizzes_updated_at
BEFORE UPDATE ON public.course_quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();