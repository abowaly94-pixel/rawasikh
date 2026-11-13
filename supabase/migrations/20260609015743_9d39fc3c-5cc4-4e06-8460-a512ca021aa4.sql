CREATE TABLE public.blog_post_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'fr', 'ur')),
  title text,
  excerpt text,
  content text,
  author_name text,
  author_bio text,
  category_name text,
  source_updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, language)
);

GRANT SELECT ON public.blog_post_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_translations TO authenticated;
GRANT ALL ON public.blog_post_translations TO service_role;

ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view translations for published blog posts"
ON public.blog_post_translations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_translations.post_id
      AND bp.is_published = true
  )
);

CREATE POLICY "Admins can manage blog post translations"
ON public.blog_post_translations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_post_translations_updated_at
BEFORE UPDATE ON public.blog_post_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();