-- Add thumbnail_url column to lessons table
ALTER TABLE public.lessons
ADD COLUMN thumbnail_url TEXT;

-- Create storage bucket for lesson thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-thumbnails', 'lesson-thumbnails', true);

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload lesson thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-thumbnails'
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view thumbnails (public bucket)
CREATE POLICY "Anyone can view lesson thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lesson-thumbnails');

-- Allow owners to update/delete their thumbnails
CREATE POLICY "Users can update their lesson thumbnails"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lesson-thumbnails'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their lesson thumbnails"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lesson-thumbnails'
  AND auth.role() = 'authenticated'
);