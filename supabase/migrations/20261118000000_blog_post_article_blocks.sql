-- Structured article blocks edited from the dashboard.
--
-- Each entry is an independent block: heading, paragraph, list, table,
-- footnotes, references, summary, conclusion or a quiet decoration. The
-- legacy `content` column is still written (generated from the blocks) so
-- translations and search engines keep working unchanged.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS article_blocks jsonb;

COMMENT ON COLUMN public.blog_posts.article_blocks IS
  'Ordered array of article blocks used by the block editor. When present, the public Arabic article page renders it instead of content.';
