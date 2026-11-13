# sync-youtube-videos

Pulls the latest uploads from the Rawasikh YouTube channel and inserts new
videos into `public.news_updates`, so the homepage "آخر الأخبار والفيديوهات"
carousel stays in sync without manual work.

- Channel: `@rawasikheg` (`UCoX5FsTLzAzx4Dn9mWV-XOg`)
- Source: YouTube public RSS feed (`/feeds/videos.xml`) — no API key needed
- Dedupe: compares YouTube video ids, so manually added videos are not duplicated
- Shorts are stored with their `/shorts/` URL so the site opens the vertical popup

## Deploy (Supabase CLI)

```bash
npx supabase login
npx supabase link --project-ref modjallmgsapfxbkdrpo
npx supabase functions deploy sync-youtube-videos
npx supabase db push
```

`db push` applies `supabase/migrations/20261106090000_sync_youtube_videos_cron.sql`,
which schedules the function every 15 minutes via pg_cron + pg_net.

## Deploy (Dashboard)

1. Edge Functions → Deploy a new function → name it `sync-youtube-videos`.
2. Paste `supabase/functions/sync-youtube-videos/index.ts` and deploy.
3. SQL Editor → run the SQL from
   `supabase/migrations/20261106090000_sync_youtube_videos_cron.sql`.

## Manual sync

Dashboard → الأخبار والفيديوهات → **مزامنة يوتيوب**.

Or call the function directly:

```bash
curl -X POST \
  "https://modjallmgsapfxbkdrpo.supabase.co/functions/v1/sync-youtube-videos" \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual"}'
```

## Optional env vars

| Variable | Default | Purpose |
| --- | --- | --- |
| `YOUTUBE_CHANNEL_ID` | Rawasikh channel | Sync a different channel |
| `YOUTUBE_MAX_VIDEOS` | `15` | How many feed entries to import (1–50) |
