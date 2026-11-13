// deno-lint-ignore-file no-explicit-any
// Pulls the latest videos from the Rawasikh YouTube channel RSS feed and
// inserts any new ones into public.news_updates so they show up on the
// homepage carousel automatically (no API key required).
//
// Deploy:
//   npx supabase functions deploy sync-youtube-videos
//
// Optional env vars:
//   YOUTUBE_CHANNEL_ID  – override the channel (default is Rawasikh)
//   YOUTUBE_MAX_VIDEOS  – how many feed entries to import (default 15)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CHANNEL_ID = "UCoX5FsTLzAzx4Dn9mWV-XOg";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

/** Decode the XML entities YouTube puts in titles/descriptions. */
function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Extract the 11-char video id from any YouTube URL shape. */
function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

type FeedVideo = {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
};

function parseFeed(xml: string, maxVideos: number): FeedVideo[] {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  const videos: FeedVideo[] = [];

  for (const [, entry] of entries) {
    const id = decodeXml(entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "");
    const title = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    if (!id || !title) continue;

    // The <link rel="alternate"> href tells us whether it is a Short
    // (…/shorts/ID) or a normal upload (…/watch?v=ID), which the site uses
    // to pick the right popup size.
    const link = decodeXml(
      entry.match(/<link\s+rel="alternate"\s+href="([^"]+)"/)?.[1] ?? "",
    );
    const url = link || `https://www.youtube.com/watch?v=${id}`;
    const description = decodeXml(
      entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? "",
    ).slice(0, 600);
    const thumbnail =
      decodeXml(entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1] ?? "") || null;
    const publishedAt = decodeXml(
      entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
    );

    videos.push({
      id,
      title,
      description,
      url,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: publishedAt || new Date().toISOString(),
    });

    if (videos.length >= maxVideos) break;
  }

  return videos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const channelId = Deno.env.get("YOUTUBE_CHANNEL_ID")?.trim() || DEFAULT_CHANNEL_ID;
  const maxVideos = Math.min(
    Math.max(Number(Deno.env.get("YOUTUBE_MAX_VIDEOS")) || 15, 1),
    50,
  );

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
    channelId,
  )}`;

  let xml: string;
  try {
    const feedRes = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/atom+xml,application/xml,text/xml,*/*",
      },
    });
    if (!feedRes.ok) {
      return json(
        { ok: false, error: `YouTube feed returned ${feedRes.status}` },
        502,
      );
    }
    xml = await feedRes.text();
  } catch (error) {
    return json({ ok: false, error: `Could not reach YouTube: ${(error as Error).message}` }, 502);
  }

  const feedVideos = parseFeed(xml, maxVideos);
  if (feedVideos.length === 0) {
    return json({ ok: false, error: "No videos found in the channel feed" }, 502);
  }

  // ?dry_run=1 → preview what would be imported without touching the database.
  if (new URL(req.url).searchParams.get("dry_run") === "1") {
    return json({
      ok: true,
      dryRun: true,
      channelId,
      fetched: feedVideos.length,
      videos: feedVideos.map(({ id, title, url, publishedAt }) => ({
        id,
        title,
        url,
        publishedAt,
      })),
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Existing videos (any URL shape) are compared by video id to avoid
  // duplicates when a video was added manually with youtu.be or shorts links.
  const { data: existing, error: existingError } = await supabase
    .from("news_updates")
    .select("id, video_url")
    .eq("content_type", "video");

  if (existingError) {
    return json({ ok: false, error: existingError.message }, 500);
  }

  // Older sync runs inserted videos with is_featured = false, which keeps them
  // out of the homepage carousel (it shows featured items first). Repair those
  // rows on every run; is_active is the flag used to hide a video.
  const { data: repaired, error: repairError } = await supabase
    .from("news_updates")
    .update({ is_featured: true })
    .eq("content_type", "video")
    .eq("is_featured", false)
    .select("id");

  if (repairError) {
    return json({ ok: false, error: repairError.message }, 500);
  }

  const repairedCount = repaired?.length ?? 0;

  const knownIds = new Set(
    (existing || [])
      .map((row: { video_url: string | null }) => youtubeId(row.video_url))
      .filter((id): id is string => Boolean(id)),
  );

  const fresh = feedVideos.filter((video) => !knownIds.has(video.id));

  if (fresh.length === 0) {
    return json({
      ok: true,
      channelId,
      fetched: feedVideos.length,
      inserted: 0,
      repaired: repairedCount,
      skipped: feedVideos.length,
      message: "Already up to date",
    });
  }

  // Place synced videos right after the manually curated news items so the
  // news block stays on top while new uploads still appear first among videos.
  const { data: newsRows } = await supabase
    .from("news_updates")
    .select("order_index")
    .eq("content_type", "news")
    .order("order_index", { ascending: false })
    .limit(1);

  const orderIndex = (newsRows?.[0]?.order_index ?? 0) + 1;

  const rows = fresh.map((video) => ({
    title: video.title,
    description: video.description || null,
    content_type: "video",
    image_url: video.thumbnail,
    video_url: video.url,
    link_url: null,
    is_active: true,
    // Every item currently on the homepage is marked "featured"; the homepage
    // query sorts featured items first and only shows 12, so synced videos must
    // be featured too or they would never reach the carousel.
    is_featured: true,
    order_index: orderIndex,
    published_at: video.publishedAt,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("news_updates")
    .insert(rows)
    .select("id, title, video_url");

  if (insertError) {
    return json({ ok: false, error: insertError.message }, 500);
  }

  return json({
    ok: true,
    channelId,
    fetched: feedVideos.length,
    inserted: inserted?.length ?? 0,
    repaired: repairedCount,
    skipped: feedVideos.length - fresh.length,
    videos: inserted,
  });
});
