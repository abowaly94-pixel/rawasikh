-- Add recorded video URL field to lessons table
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS recorded_video_url TEXT;

-- Add lesson_id to exams table to link exams/quizzes/assignments to specific lessons
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_exams_lesson_id ON public.exams(lesson_id);