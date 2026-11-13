
-- Create school_level_assessments table for level assessment exams created by schools
CREATE TABLE public.school_level_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.global_stages(id) ON DELETE SET NULL,
  grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_assessment_questions table
CREATE TABLE public.school_assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.school_level_assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER,
  correct_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_assessment_options table
CREATE TABLE public.school_assessment_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.school_assessment_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER
);

-- Create school_assessment_attempts table for student attempts
CREATE TABLE public.school_assessment_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.school_level_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score INTEGER,
  max_score INTEGER,
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_assessment_answers table
CREATE TABLE public.school_assessment_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.school_assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.school_assessment_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.school_assessment_options(id),
  answer_text TEXT,
  is_correct BOOLEAN
);

-- Enable RLS
ALTER TABLE public.school_level_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assessment_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_level_assessments
CREATE POLICY "Admins can manage all assessments"
ON public.school_level_assessments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Schools can manage their assessments"
ON public.school_level_assessments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE schools.id = school_level_assessments.school_id 
    AND schools.user_id = auth.uid()
  )
);

CREATE POLICY "Active assessments are viewable by authenticated users"
ON public.school_level_assessments FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for school_assessment_questions
CREATE POLICY "Anyone can view assessment questions"
ON public.school_assessment_questions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and schools can manage questions"
ON public.school_assessment_questions FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.school_level_assessments sa
    JOIN public.schools s ON s.id = sa.school_id
    WHERE sa.id = school_assessment_questions.assessment_id
    AND s.user_id = auth.uid()
  )
);

-- RLS Policies for school_assessment_options
CREATE POLICY "Anyone can view assessment options"
ON public.school_assessment_options FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and schools can manage options"
ON public.school_assessment_options FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.school_assessment_questions q
    JOIN public.school_level_assessments sa ON sa.id = q.assessment_id
    JOIN public.schools s ON s.id = sa.school_id
    WHERE q.id = school_assessment_options.question_id
    AND s.user_id = auth.uid()
  )
);

-- RLS Policies for school_assessment_attempts
CREATE POLICY "Students can create and view their own attempts"
ON public.school_assessment_attempts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = school_assessment_attempts.student_id 
    AND students.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all attempts"
ON public.school_assessment_attempts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Schools can view their students attempts"
ON public.school_assessment_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_level_assessments sa
    JOIN public.schools s ON s.id = sa.school_id
    WHERE sa.id = school_assessment_attempts.assessment_id
    AND s.user_id = auth.uid()
  )
);

-- RLS Policies for school_assessment_answers
CREATE POLICY "Students can manage their own answers"
ON public.school_assessment_answers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.school_assessment_attempts att
    JOIN public.students st ON st.id = att.student_id
    WHERE att.id = school_assessment_answers.attempt_id
    AND st.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and schools can view answers"
ON public.school_assessment_answers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.school_assessment_attempts att
    JOIN public.school_level_assessments sa ON sa.id = att.assessment_id
    JOIN public.schools s ON s.id = sa.school_id
    WHERE att.id = school_assessment_answers.attempt_id
    AND s.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_school_level_assessments_updated_at
BEFORE UPDATE ON public.school_level_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
