
CREATE TABLE public.zoom_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  zoom_link_id UUID,
  target_title TEXT,
  target_url TEXT,
  course_id UUID,
  lesson_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zoom_audit_log_created_at ON public.zoom_audit_log (created_at DESC);
CREATE INDEX idx_zoom_audit_log_actor ON public.zoom_audit_log (actor_id);
CREATE INDEX idx_zoom_audit_log_link ON public.zoom_audit_log (zoom_link_id);

GRANT SELECT, INSERT ON public.zoom_audit_log TO authenticated;
GRANT ALL ON public.zoom_audit_log TO service_role;

ALTER TABLE public.zoom_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins read zoom audit log"
ON public.zoom_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can insert their OWN audit entry (actor_id must match)
CREATE POLICY "Users insert own audit entries"
ON public.zoom_audit_log
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());
