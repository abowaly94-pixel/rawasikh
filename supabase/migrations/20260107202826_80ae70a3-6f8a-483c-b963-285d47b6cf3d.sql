-- Create table for tracking student progress on subject content
CREATE TABLE public.subject_content_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.subject_content(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate progress entries
ALTER TABLE public.subject_content_progress 
ADD CONSTRAINT unique_user_content_progress UNIQUE (user_id, content_id);

-- Enable RLS
ALTER TABLE public.subject_content_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own progress"
ON public.subject_content_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own progress"
ON public.subject_content_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete their own progress"
ON public.subject_content_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_subject_content_progress_user ON public.subject_content_progress(user_id);
CREATE INDEX idx_subject_content_progress_subject ON public.subject_content_progress(subject_id);