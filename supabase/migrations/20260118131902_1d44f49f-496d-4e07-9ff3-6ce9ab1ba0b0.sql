-- Add content_id column to subject_quizzes to link quizzes to specific content
ALTER TABLE public.subject_quizzes 
ADD COLUMN content_id UUID REFERENCES public.subject_content(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_subject_quizzes_content_id ON public.subject_quizzes(content_id);