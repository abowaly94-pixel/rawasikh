-- Add PDF attachments column to course_lessons
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create storage bucket for lesson PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload lesson PDFs
CREATE POLICY "Admins and teachers can upload lesson pdfs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-pdfs' 
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'teacher')
  )
);

-- Allow anyone to view lesson PDFs (public bucket)
CREATE POLICY "Anyone can view lesson pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-pdfs');

-- Allow admins and teachers to delete lesson PDFs
CREATE POLICY "Admins and teachers can delete lesson pdfs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-pdfs' 
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'teacher')
  )
);