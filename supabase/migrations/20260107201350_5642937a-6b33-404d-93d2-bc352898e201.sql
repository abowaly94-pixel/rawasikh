-- Drop the partially created table if exists
DROP TABLE IF EXISTS public.global_stages CASCADE;

-- Create global_stages table for global educational stages
CREATE TABLE public.global_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grade_levels table (الصفوف الدراسية)
CREATE TABLE public.grade_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.global_stages(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, stage_id)
);

-- Enable RLS
ALTER TABLE public.global_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;

-- Everyone can read global stages and grade_levels
CREATE POLICY "Everyone can view global stages" 
ON public.global_stages FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage global stages" 
ON public.global_stages FOR ALL 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Everyone can view grade levels" 
ON public.grade_levels FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage grade levels" 
ON public.grade_levels FOR ALL 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Update subjects table to reference grade_levels
ALTER TABLE public.subjects ADD COLUMN grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE CASCADE;

-- Insert default stages
INSERT INTO public.global_stages (name, order_index) VALUES 
('الابتدائية', 1),
('الإعدادية', 2),
('الثانوية', 3);

-- Insert default grade_levels for each stage
INSERT INTO public.grade_levels (name, stage_id, order_index)
SELECT 'الصف الأول', id, 1 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف الثاني', id, 2 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف الثالث', id, 3 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف الرابع', id, 4 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف الخامس', id, 5 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف السادس', id, 6 FROM public.global_stages WHERE name = 'الابتدائية'
UNION ALL
SELECT 'الصف الأول', id, 1 FROM public.global_stages WHERE name = 'الإعدادية'
UNION ALL
SELECT 'الصف الثاني', id, 2 FROM public.global_stages WHERE name = 'الإعدادية'
UNION ALL
SELECT 'الصف الثالث', id, 3 FROM public.global_stages WHERE name = 'الإعدادية'
UNION ALL
SELECT 'الصف الأول', id, 1 FROM public.global_stages WHERE name = 'الثانوية'
UNION ALL
SELECT 'الصف الثاني', id, 2 FROM public.global_stages WHERE name = 'الثانوية'
UNION ALL
SELECT 'الصف الثالث', id, 3 FROM public.global_stages WHERE name = 'الثانوية';