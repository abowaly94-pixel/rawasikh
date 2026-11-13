-- Add meeting_link column to lessons table
ALTER TABLE public.lessons
ADD COLUMN meeting_link TEXT;