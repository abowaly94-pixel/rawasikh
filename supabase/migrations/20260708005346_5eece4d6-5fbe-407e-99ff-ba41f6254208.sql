
-- Notifications table (in-app)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Dedupe table for zoom reminders
CREATE TABLE IF NOT EXISTS public.zoom_reminders_sent (
  zoom_link_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL,        -- '24h' | '30m'
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (zoom_link_id, user_id, kind)
);
GRANT ALL ON public.zoom_reminders_sent TO service_role;
ALTER TABLE public.zoom_reminders_sent ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge function) touches this table.

-- Enable realtime on notifications for live bell updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
