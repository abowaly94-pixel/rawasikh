
-- Create blog_categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Admins can manage categories
CREATE POLICY "Admins can manage blog categories"
ON public.blog_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active categories
CREATE POLICY "Anyone can view active blog categories"
ON public.blog_categories
FOR SELECT
USING (is_active = true);

-- Add category_id column to blog_posts
ALTER TABLE public.blog_posts
ADD COLUMN category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_blog_posts_category_id ON public.blog_posts(category_id);
