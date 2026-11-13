-- Make school_id nullable for admin-created assessments
ALTER TABLE public.school_level_assessments ALTER COLUMN school_id DROP NOT NULL;

-- Update RLS policy to allow admins to view their own assessments (with null school_id)
DROP POLICY IF EXISTS "Active assessments are viewable by authenticated users" ON public.school_level_assessments;

CREATE POLICY "Active assessments are viewable by authenticated users" 
ON public.school_level_assessments 
FOR SELECT 
USING ((is_active = true) AND (auth.uid() IS NOT NULL));