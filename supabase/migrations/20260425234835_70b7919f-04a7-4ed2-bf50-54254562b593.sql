CREATE TABLE public.news_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'news',
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active news"
ON public.news_updates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage news"
ON public.news_updates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_news_updates_updated_at
BEFORE UPDATE ON public.news_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();