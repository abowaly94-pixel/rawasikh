-- Add 'school' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school';

-- Create schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create educational stages table (المراحل الدراسية)
CREATE TABLE public.educational_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- ابتدائي، إعدادي
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subjects table (المواد)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  stage_id UUID REFERENCES public.educational_stages(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subject content table (محتوى المادة - فيديوهات)
CREATE TABLE public.subject_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  pdf_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subject quizzes table (اختبارات المادة)
CREATE TABLE public.subject_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 60,
  time_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subject quiz questions
CREATE TABLE public.subject_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.subject_quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' NOT NULL,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subject quiz question options
CREATE TABLE public.subject_quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.subject_quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Add school_id to existing tables
ALTER TABLE public.students ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Create school_teachers junction table (to link teachers to schools)
CREATE TABLE public.school_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(school_id, teacher_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;

-- Schools policies
CREATE POLICY "Admins can manage all schools" ON public.schools FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can view their own data" ON public.schools FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Schools can update their own data" ON public.schools FOR UPDATE USING (user_id = auth.uid());

-- Educational stages policies
CREATE POLICY "Admins can manage all stages" ON public.educational_stages FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their stages" ON public.educational_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = educational_stages.school_id AND schools.user_id = auth.uid())
);

-- Subjects policies
CREATE POLICY "Admins can manage all subjects" ON public.subjects FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their subjects" ON public.subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = subjects.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Anyone can view active subjects" ON public.subjects FOR SELECT USING (is_active = true);

-- Subject content policies
CREATE POLICY "Admins can manage all content" ON public.subject_content FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their content" ON public.subject_content FOR ALL USING (
  EXISTS (SELECT 1 FROM subjects s JOIN schools sch ON sch.id = s.school_id WHERE s.id = subject_content.subject_id AND sch.user_id = auth.uid())
);
CREATE POLICY "Anyone can view free content" ON public.subject_content FOR SELECT USING (is_free = true);

-- Subject quizzes policies
CREATE POLICY "Admins can manage all quizzes" ON public.subject_quizzes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their quizzes" ON public.subject_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM subjects s JOIN schools sch ON sch.id = s.school_id WHERE s.id = subject_quizzes.subject_id AND sch.user_id = auth.uid())
);
CREATE POLICY "Anyone can view active quizzes" ON public.subject_quizzes FOR SELECT USING (is_active = true);

-- Subject quiz questions policies
CREATE POLICY "Admins can manage all questions" ON public.subject_quiz_questions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their questions" ON public.subject_quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM subject_quizzes sq JOIN subjects s ON s.id = sq.subject_id JOIN schools sch ON sch.id = s.school_id WHERE sq.id = subject_quiz_questions.quiz_id AND sch.user_id = auth.uid())
);
CREATE POLICY "Anyone can view questions of active quizzes" ON public.subject_quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM subject_quizzes WHERE subject_quizzes.id = subject_quiz_questions.quiz_id AND subject_quizzes.is_active = true)
);

-- Subject quiz options policies
CREATE POLICY "Admins can manage all options" ON public.subject_quiz_options FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their options" ON public.subject_quiz_options FOR ALL USING (
  EXISTS (SELECT 1 FROM subject_quiz_questions qq JOIN subject_quizzes sq ON sq.id = qq.quiz_id JOIN subjects s ON s.id = sq.subject_id JOIN schools sch ON sch.id = s.school_id WHERE qq.id = subject_quiz_options.question_id AND sch.user_id = auth.uid())
);
CREATE POLICY "Anyone can view options" ON public.subject_quiz_options FOR SELECT USING (true);

-- School teachers policies
CREATE POLICY "Admins can manage all school teachers" ON public.school_teachers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Schools can manage their teachers" ON public.school_teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = school_teachers.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Teachers can view their school assignments" ON public.school_teachers FOR SELECT USING (teacher_id = auth.uid());

-- Update students RLS to include school access
CREATE POLICY "Schools can view their students" ON public.students FOR SELECT USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = students.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Schools can manage their students" ON public.students FOR ALL USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = students.school_id AND schools.user_id = auth.uid())
);

-- Update classes RLS to include school access
CREATE POLICY "Schools can view their classes" ON public.classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = classes.school_id AND schools.user_id = auth.uid())
);
CREATE POLICY "Schools can manage their classes" ON public.classes FOR ALL USING (
  EXISTS (SELECT 1 FROM schools WHERE schools.id = classes.school_id AND schools.user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_quizzes_updated_at BEFORE UPDATE ON public.subject_quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();