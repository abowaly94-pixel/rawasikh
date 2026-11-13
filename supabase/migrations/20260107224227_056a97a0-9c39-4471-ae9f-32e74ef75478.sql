-- Drop the existing foreign key constraint on stage_id that references stages table
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_stage_id_fkey;

-- Add new foreign key constraint that references global_stages table
ALTER TABLE public.students 
ADD CONSTRAINT students_stage_id_fkey 
FOREIGN KEY (stage_id) REFERENCES public.global_stages(id) ON DELETE SET NULL;