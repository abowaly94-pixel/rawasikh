-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the mark-absent-students function to run every hour
SELECT cron.schedule(
  'mark-absent-students-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://xeuncbgdnxgnaamyepog.supabase.co/functions/v1/mark-absent-students',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldW5jYmdkbnhnbmFhbXllcG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODU5OTksImV4cCI6MjA4MTc2MTk5OX0.Wn0wsTFhCl6CqorXO65KsRLwILc_M_eymBzejnm1zmM"}'::jsonb,
      body := '{"source": "cron"}'::jsonb
    ) AS request_id;
  $$
);