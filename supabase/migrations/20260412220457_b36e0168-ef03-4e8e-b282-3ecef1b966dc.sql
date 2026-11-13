
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id text,
  school_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Schools can view their activity logs"
ON public.activity_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM schools WHERE schools.id = activity_logs.school_id AND schools.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_logs_school_id ON public.activity_logs(school_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Add image_url to exam_questions
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS image_url text;
