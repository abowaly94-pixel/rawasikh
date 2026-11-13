-- The homepage carousel sorts featured items first and only shows 12, so
-- videos imported by sync-youtube-videos must be featured to reach it.
UPDATE public.news_updates
SET is_featured = true
WHERE content_type = 'video'
  AND is_featured = false;
