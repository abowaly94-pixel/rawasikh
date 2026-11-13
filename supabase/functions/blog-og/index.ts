// Public edge function returning HTML with Open Graph tags for a blog post,
// so link-preview crawlers (WhatsApp, Facebook, Telegram, Twitter) render
// the article's image, title and description. Browsers are redirected to
// the canonical article URL on rawasikheg.com.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_ANON_KEY;
const CANONICAL_BASE = "https://rawasikheg.com";
const PREVIEW_BUCKET = "site-assets";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOCIAL_BOT_PATTERN =
  /(facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Google-Structured-Data-Testing-Tool)/i;

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(s: string) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(s: string) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeImageUrl(value: string) {
  const imageUrl = decodeBasicEntities(value).trim();
  if (!imageUrl) return "";
  let absoluteUrl = "";
  if (imageUrl.startsWith("https://")) absoluteUrl = imageUrl;
  else if (imageUrl.startsWith("http://")) absoluteUrl = `https://${imageUrl.slice("http://".length)}`;
  else if (imageUrl.startsWith("/")) absoluteUrl = `${CANONICAL_BASE}${imageUrl}`;
  if (!absoluteUrl) return "";

  const storageMatch = absoluteUrl.match(/^(https:\/\/[^/]+\/storage\/v1)\/object\/public\/(.+)$/);
  if (storageMatch) {
    return `${storageMatch[1]}/render/image/public/${storageMatch[2].split("?")[0]}?width=600&height=315&resize=cover&quality=60&format=webp`;
  }
  return absoluteUrl;
}

function addVersionToUrl(value: string, version: string) {
  if (!value || !version) return value;
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}v=${encodeURIComponent(version)}`;
}

function imageType(value: string) {
  if (/([?&])format=webp(&|$)/i.test(value)) return "image/webp";
  const clean = value.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function safePathPart(value: string) {
  return String(value || "latest").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "latest";
}

async function publishPreviewHtml(path: string, html: string) {
  const storageClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const htmlFile = new Blob([html], { type: "text/html; charset=utf-8" });
  const { error } = await storageClient.storage.from(PREVIEW_BUCKET).upload(path, htmlFile, {
    upsert: true,
    contentType: "text/html; charset=utf-8",
    cacheControl: "60",
  });

  if (error) throw error;

  const { data } = storageClient.storage.from(PREVIEW_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Support /functions/v1/blog-og/{id}  OR  ?id=...
    const parts = url.pathname.split("/").filter(Boolean);
    let id = url.searchParams.get("id") || parts[parts.length - 1];
    if (id === "blog-og") id = "";

    if (!id) {
      return new Response("Missing post id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: post } = await supabase
      .from("blog_posts")
      .select("id,title,excerpt,content,image_url")
      .eq("id", id)
      .maybeSingle();

    const version = url.searchParams.get("v") || "";
    const versionSuffix = version ? `?v=${encodeURIComponent(version)}` : "";
    const target = `${CANONICAL_BASE}/blog/${id}`;
    const sharedTarget = `${target}${versionSuffix}`;

    const isSocialBot = SOCIAL_BOT_PATTERN.test(req.headers.get("user-agent") || "");
    if (!isSocialBot) {
      return Response.redirect(sharedTarget, 302);
    }

    if (!post) {
      return new Response(
        `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>رواسخ</title><link rel="canonical" href="${esc(target)}"></head><body><a href="${esc(target)}">رواسخ</a></body></html>`,
        { status: 200, headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders } },
      );
    }

    const title = esc(post.title || "رواسخ");
    const desc = esc(
      (post.excerpt && stripHtml(post.excerpt)) ||
        stripHtml(post.content || "").slice(0, 200) ||
        "رواسخ - للخدمات التعليمية وتنمية المهارات",
    );
    const imageUrl = addVersionToUrl(normalizeImageUrl(post.image_url || ""), version);
    const image = esc(imageUrl);
    const type = imageType(imageUrl);
    const canonical = esc(sharedTarget);

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:site_name" content="رواسخ" />
<meta property="og:locale" content="ar_EG" />
${image ? `<meta property="og:image" content="${image}" />` : ""}
${image ? `<meta property="og:image:secure_url" content="${image}" />` : ""}
${type ? `<meta property="og:image:type" content="${type}" />` : ""}
${image ? `<meta property="og:image:width" content="1200" />` : ""}
${image ? `<meta property="og:image:height" content="630" />` : ""}
${image ? `<meta property="og:image:alt" content="${title}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:url" content="${canonical}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ""}
</head>
<body>
<p><a href="${canonical}">${title}</a></p>
</body>
</html>`;

    const previewPath = `og/blog/${safePathPart(id)}-${safePathPart(version || "latest")}.html`;
    const previewUrl = await publishPreviewHtml(previewPath, html);
    return Response.redirect(previewUrl, 302);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=60",
        ...corsHeaders,
      },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});
