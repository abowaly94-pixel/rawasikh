-- Add bio field to profiles table
ALTER TABLE public.profiles
ADD COLUMN bio TEXT;

-- Create teacher_ratings table for storing ratings
CREATE TABLE public.teacher_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teacher_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_ratings
CREATE POLICY "Anyone can view ratings"
ON public.teacher_ratings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can rate teachers"
ON public.teacher_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.teacher_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.teacher_ratings
FOR DELETE
USING (auth.uid() = user_id);