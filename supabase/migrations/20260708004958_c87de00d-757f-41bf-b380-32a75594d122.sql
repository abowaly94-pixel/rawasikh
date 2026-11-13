
ALTER TABLE public.zoom_links
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

CREATE INDEX IF NOT EXISTS zoom_links_scheduled_at_idx ON public.zoom_links(scheduled_at);
