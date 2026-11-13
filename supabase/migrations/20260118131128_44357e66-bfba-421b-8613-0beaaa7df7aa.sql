-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to question images
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow authenticated users to upload question images
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their question images
CREATE POLICY "Authenticated users can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete question images
CREATE POLICY "Authenticated users can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Add image_url column to exam_questions
ALTER TABLE public.exam_questions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to quiz_questions (course quizzes)
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to school_assessment_questions
ALTER TABLE public.school_assessment_questions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to subject_quiz_questions
ALTER TABLE public.subject_quiz_questions
ADD COLUMN IF NOT EXISTS image_url TEXT;