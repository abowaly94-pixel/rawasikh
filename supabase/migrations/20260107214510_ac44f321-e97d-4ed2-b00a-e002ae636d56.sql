-- Create stages table for school stages (المراحل)
CREATE TABLE IF NOT EXISTS public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grade_levels table for grade levels within stages (الصفوف)
CREATE TABLE IF NOT EXISTS public.grade_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add stage_id and grade_level_id to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL;

-- Add stage_id and grade_level_id to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stages
CREATE POLICY "Stages are viewable by everyone" ON public.stages FOR SELECT USING (true);
CREATE POLICY "Admins can manage stages" ON public.stages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "School owners can manage their stages" ON public.stages FOR ALL USING (
  school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
);

-- RLS Policies for grade_levels
CREATE POLICY "Grade levels are viewable by everyone" ON public.grade_levels FOR SELECT USING (true);
CREATE POLICY "Admins can manage grade levels" ON public.grade_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "School owners can manage their grade levels" ON public.grade_levels FOR ALL USING (
  stage_id IN (SELECT s.id FROM stages s JOIN schools sc ON s.school_id = sc.id WHERE sc.user_id = auth.uid())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stages_school_id ON public.stages(school_id);
CREATE INDEX IF NOT EXISTS idx_grade_levels_stage_id ON public.grade_levels(stage_id);
CREATE INDEX IF NOT EXISTS idx_classes_stage_id ON public.classes(stage_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level_id ON public.classes(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_students_stage_id ON public.students(stage_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_level_id ON public.students(grade_level_id);