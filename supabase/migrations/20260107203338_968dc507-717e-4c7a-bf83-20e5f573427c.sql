-- Drop the old foreign key constraint FIRST
ALTER TABLE public.subjects 
DROP CONSTRAINT IF EXISTS subjects_stage_id_fkey;

-- Now update existing subjects to use global_stages
UPDATE public.subjects 
SET stage_id = '5cc9f57a-e1ac-4f43-b5f2-d05b768aa451'
WHERE stage_id = '9f2aa5d3-b529-49ae-af2c-b6bb50d41fe4';

UPDATE public.subjects 
SET stage_id = 'fc1fc3f8-62ea-4ffc-9082-212587aeb6d9'
WHERE stage_id = '3b7a0bfe-83de-414c-8512-a51fdcf5131a';

-- Add new foreign key constraint referencing global_stages
ALTER TABLE public.subjects 
ADD CONSTRAINT subjects_stage_id_fkey 
FOREIGN KEY (stage_id) REFERENCES public.global_stages(id) ON DELETE CASCADE;