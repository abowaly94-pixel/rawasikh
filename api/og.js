// Dynamic Open Graph pages for blog posts and courses.
//
// The site is a client-rendered Vite app, so link-preview crawlers never see
// the React Helmet tags. Vercel rewrites social-bot requests here instead of
// serving the generic index.html card, which gives every shared article its
// own poster image, title and description — including posts created after the
// last deployment.

import {
  CANONICAL_BASE,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SUPABASE_FALLBACK_KEY,
  SUPABASE_FALLBACK_URL,
  imageType,
  resolveBlogPoster,
  resolveCoursePoster,
} from "./_og-shared.js";

const SOCIAL_BOT_PATTERN =
  /(facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Google-Structured-Data-Testing-Tool|Pinterest|redditbot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator)/i;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pageHtml = ({ title, description, canonical, image }) => {
  const safeTitle = escapeHtml(title || "رواسخ");
  const safeDescription = escapeHtml((description || DEFAULT_DESCRIPTION).slice(0, 220));
  const safeCanonical = escapeHtml(canonical);
  const rawImage = image || DEFAULT_IMAGE;
  const safeImage = escapeHtml(rawImage);
  const type = imageType(rawImage);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<link rel="canonical" href="${safeCanonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="رواسخ" />
<meta property="og:locale" content="ar_EG" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:url" content="${safeCanonical}" />
<meta property="og:image" content="${safeImage}" />
<meta property="og:image:secure_url" content="${safeImage}" />
${type ? `<meta property="og:image:type" content="${type}" />` : ""}
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${safeTitle}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImage}" />
<meta name="twitter:image:alt" content="${safeTitle}" />
</head>
<body><a href="${safeCanonical}">${safeTitle}</a></body>
</html>
`;
};

const supabaseSettings = () => {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    SUPABASE_FALLBACK_URL
  ).replace(/\/$/, "");
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    SUPABASE_FALLBACK_KEY;
  return { url, key };
};

const fetchEntry = async (type, id) => {
  const { url, key } = supabaseSettings();
  if (!url || !key) return null;

  const table = type === "courses" ? "courses" : "blog_posts";
  const select =
    type === "courses"
      ? "id,title,description,thumbnail_url,updated_at"
      : "id,title,excerpt,content,image_url,article_blocks,updated_at,blog_categories(name)";

  const query = async (fields) => {
    const endpoint = `${url}/rest/v1/${table}?select=${encodeURIComponent(fields)}&id=eq.${encodeURIComponent(id)}&limit=1`;
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] || null : null;
  };

  const entry = await query(select);
  if (entry || type === "courses") return entry;

  // Older databases may not have the structured blocks column yet.
  return query("id,title,excerpt,content,image_url,updated_at,blog_categories(name)");
};

export default async function handler(req, res) {
  const type = req.query?.type === "courses" ? "courses" : "blog";
  const id = String(req.query?.id || "").trim();
  const path = type === "courses" ? "courses" : "blog";
  const canonical = `${CANONICAL_BASE}/${path}/${encodeURIComponent(id)}`;
  const isSocialBot = SOCIAL_BOT_PATTERN.test(req.headers["user-agent"] || "");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");

  if (!id) {
    res.status(400).send(pageHtml({ title: "رواسخ", canonical: CANONICAL_BASE, image: DEFAULT_IMAGE }));
    return;
  }

  if (!isSocialBot) {
    res.statusCode = 302;
    res.setHeader("Location", canonical);
    res.end();
    return;
  }

  try {
    const entry = await fetchEntry(type, id);
    if (!entry) {
      res.status(200).send(
        pageHtml({ title: "رواسخ", canonical, image: DEFAULT_IMAGE }),
      );
      return;
    }

    const title = entry.title || "رواسخ";
    const description =
      stripHtml(type === "courses" ? entry.description : entry.excerpt || entry.content) ||
      DEFAULT_DESCRIPTION;

    res.status(200).send(
      pageHtml({
        title,
        description,
        canonical,
        image: type === "courses" ? resolveCoursePoster(entry) : resolveBlogPoster(entry),
      }),
    );
  } catch {
    // A preview is still better than a broken link card.
    res.status(200).send(pageHtml({ title: "رواسخ", canonical, image: DEFAULT_IMAGE }));
  }
}
