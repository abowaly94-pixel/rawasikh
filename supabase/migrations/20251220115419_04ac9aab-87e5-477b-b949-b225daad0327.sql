-- Create course categories table
CREATE TABLE public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course sections table
CREATE TABLE public.course_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course lessons table
CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  description TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course purchases table
CREATE TABLE public.course_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- Course Categories Policies
CREATE POLICY "Anyone can view categories"
  ON public.course_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.course_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Courses Policies
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their courses"
  ON public.courses FOR ALL
  USING (has_role(auth.uid(), 'teacher') AND instructor_id = auth.uid());

-- Course Sections Policies
CREATE POLICY "Anyone can view sections of published courses"
  ON public.course_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_sections.course_id 
    AND courses.is_published = true
  ));

CREATE POLICY "Admins can manage all sections"
  ON public.course_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage sections of their courses"
  ON public.course_sections FOR ALL
  USING (has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_sections.course_id 
    AND courses.instructor_id = auth.uid()
  ));

-- Course Lessons Policies
CREATE POLICY "Anyone can view free lessons"
  ON public.course_lessons FOR SELECT
  USING (is_free = true);

CREATE POLICY "Purchased users can view all lessons"
  ON public.course_lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.course_purchases cp
    JOIN public.course_sections cs ON cs.course_id = cp.course_id
    WHERE cs.id = course_lessons.section_id
    AND cp.user_id = auth.uid()
    AND cp.payment_status = 'completed'
  ));

CREATE POLICY "Admins can manage all lessons"
  ON public.course_lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage lessons of their courses"
  ON public.course_lessons FOR ALL
  USING (has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = course_lessons.section_id
    AND c.instructor_id = auth.uid()
  ));

-- Course Purchases Policies
CREATE POLICY "Users can view their own purchases"
  ON public.course_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
  ON public.course_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all purchases"
  ON public.course_purchases FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();