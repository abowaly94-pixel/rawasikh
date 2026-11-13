
CREATE TABLE public.zoom_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zoom_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_links TO authenticated;
GRANT ALL ON public.zoom_links TO service_role;

ALTER TABLE public.zoom_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zoom links"
  ON public.zoom_links FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert zoom links"
  ON public.zoom_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update zoom links"
  ON public.zoom_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete zoom links"
  ON public.zoom_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_zoom_links_updated_at
  BEFORE UPDATE ON public.zoom_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
