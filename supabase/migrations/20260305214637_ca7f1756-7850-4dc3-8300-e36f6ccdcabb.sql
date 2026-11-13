
-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id uuid,
  school_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_school_id ON public.activity_logs(school_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Platform admin sees all
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- School admin sees only their school's logs
CREATE POLICY "Schools can view their activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    school_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = activity_logs.school_id
      AND schools.user_id = auth.uid()
    )
  );

-- All authenticated users can insert logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
