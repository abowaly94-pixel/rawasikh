-- Optional formatted table shown inside a blog article.
-- `table_data` stores { headers: string[], rows: string[][] } and is rendered
-- on the public article page only while `is_table_visible` is true, so editors
-- can prepare a table and hide/show it at any time without deleting its data.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS table_data jsonb,
  ADD COLUMN IF NOT EXISTS is_table_visible boolean NOT NULL DEFAULT false;
