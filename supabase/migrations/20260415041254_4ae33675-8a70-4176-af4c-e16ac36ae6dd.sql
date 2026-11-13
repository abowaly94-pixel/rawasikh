CREATE TABLE public.news_ticker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_ticker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ticker items"
ON public.news_ticker
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage ticker items"
ON public.news_ticker
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_news_ticker_updated_at
BEFORE UPDATE ON public.news_ticker
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();