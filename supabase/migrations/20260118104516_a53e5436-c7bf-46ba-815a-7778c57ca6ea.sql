-- Create terms table for semesters
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 1,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add term_id column to subjects table
ALTER TABLE public.subjects ADD COLUMN term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL;

-- Enable RLS on terms
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terms
CREATE POLICY "Admins can manage all terms" 
ON public.terms 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School users can manage their terms" 
ON public.terms 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE id = terms.school_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.schools 
    WHERE id = terms.school_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view school terms" 
ON public.terms 
FOR SELECT 
TO authenticated
USING (public.teacher_can_view_school(school_id));

CREATE POLICY "Students can view school terms" 
ON public.terms 
FOR SELECT 
TO authenticated
USING (public.student_can_view_school(school_id));