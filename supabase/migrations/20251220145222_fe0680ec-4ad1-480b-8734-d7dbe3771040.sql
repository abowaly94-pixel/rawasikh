-- Add price column to lessons table
ALTER TABLE public.lessons 
ADD COLUMN price numeric NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.lessons.price IS 'سعر الحصة';