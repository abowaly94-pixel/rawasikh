
-- Schedule cron to call the reminders function every 5 minutes
SELECT cron.unschedule('send-zoom-reminders-every-5m')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='send-zoom-reminders-every-5m');

SELECT cron.schedule(
  'send-zoom-reminders-every-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://modjallmgsapfxbkdrpo.supabase.co/functions/v1/send-zoom-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
