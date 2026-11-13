-- Refresh the homepage news carousel from the Rawasikh YouTube channel feed.
-- The Edge Function inserts only videos that are not already in news_updates,
-- so running this often is safe.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('sync-youtube-videos')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-youtube-videos');

SELECT cron.schedule(
  'sync-youtube-videos',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://modjallmgsapfxbkdrpo.supabase.co/functions/v1/sync-youtube-videos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZGphbGxtZ3NhcGZ4YmtkcnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTM1NjksImV4cCI6MjA5MTU4OTU2OX0.thsVIRVPPHanjUfrAQXpnTutZpPf2gzx4raM7KUprKg"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
