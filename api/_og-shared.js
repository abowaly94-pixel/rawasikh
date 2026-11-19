// Shared Open Graph helpers for the serverless preview endpoint and the
// build-time static OG pages. Keep the poster rules in sync with
// src/lib/blogImageFallbacks.ts so the link preview matches the article hero.

export const CANONICAL_BASE = "https://rawasikheg.com";
// The apex domain answers with a 308 redirect to www. Crawlers such as
// WhatsApp do not always follow redirects when downloading the poster, so
// every asset URL points straight at the host that actually serves it.
export const ASSET_BASE = "https://www.rawasikheg.com";
export const DEFAULT_IMAGE = `${ASSET_BASE}/social-share.webp`;
export const DEFAULT_DESCRIPTION = "رواسخ - للخدمات التعليمية وتنمية المهارات";

// The publishable key is already shipped in the browser bundle
// (src/integrations/supabase/client.ts); these fallbacks only make the
// serverless function resilient when Vercel env vars are not configured.
export const SUPABASE_FALLBACK_URL = "https://modjallmgsapfxbkdrpo.supabase.co";
export const SUPABASE_FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZGphbGxtZ3NhcGZ4YmtkcnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTM1NjksImV4cCI6MjA5MTU4OTU2OX0.thsVIRVPPHanjUfrAQXpnTutZpPf2gzx4raM7KUprKg";

// Public copies of the app's editorial fallbacks. They live in
// public/blog-covers so crawlers can fetch a stable URL.
export const BLOG_COVERS = {
  individual: `${ASSET_BASE}/blog-covers/individual-learning.jpg`,
  waqf: `${ASSET_BASE}/blog-covers/blog-waqf.jpg`,
  arabic: `${ASSET_BASE}/blog-covers/blog-arabic-identity.jpg`,
  expert: `${ASSET_BASE}/blog-covers/expert-teacher.jpg`,
};

// Images that are known to be dead or that we intentionally never preview:
// WordPress hotlinks from the old site, the retired igtsservice.com host, and
// a handful of legacy filenames whose files were lost.
const BROKEN_IMAGE_MARKERS = [
  "/wp-content/uploads/",
  "igtsservice.com",
  "Gemini_Generated_Image_kpna8jkpna8jkpna",
  "Gemini_Generated_Image_2y9mar2y9mar2y9m-1",
  "OL1V2K0",
];

export const isBrokenImage = (value) => {
  const image = String(value || "");
  if (!image) return true;
  return BROKEN_IMAGE_MARKERS.some((marker) => image.includes(marker));
};

const TITLE_FALLBACKS = [
  ["هندسة السلوك النفسي", BLOG_COVERS.individual],
  ["ألفاظ الوقف", BLOG_COVERS.waqf],
  ["العربية والهوية الثقافية", BLOG_COVERS.arabic],
  ["شهرة الحديث", BLOG_COVERS.waqf],
];

const CATEGORY_FALLBACKS = {
  "الصحة النفسية": BLOG_COVERS.individual,
  "الفقه": BLOG_COVERS.waqf,
  "علوم الحديث": BLOG_COVERS.waqf,
  "اللغة العربية": BLOG_COVERS.arabic,
  "اللغات والثقافة": BLOG_COVERS.arabic,
  "مختصرات بحوث الدراسات العليا": BLOG_COVERS.waqf,
  "أخبار رواسخ": BLOG_COVERS.expert,
  "الاستشارات والأبحاث": BLOG_COVERS.individual,
  "التطوير المهني": BLOG_COVERS.expert,
  "التعليم والتدريب": BLOG_COVERS.individual,
  "الجودة والإدارة": BLOG_COVERS.expert,
};

export const blogCoverFallback = (title, category) => {
  const safeTitle = String(title || "");
  const titleMatch = TITLE_FALLBACKS.find(([needle]) => safeTitle.includes(needle));
  if (titleMatch) return titleMatch[1];
  if (category && CATEGORY_FALLBACKS[category]) return CATEGORY_FALLBACKS[category];
  return BLOG_COVERS.individual;
};

export const decodeBasicEntities = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");

export const firstImageFromHtml = (html) => {
  const match = String(html || "").match(/<img[^>]*src=["']([^"'>]+)["']/i);
  return match?.[1] || "";
};

export const firstImageFromBlocks = (raw) => {
  let blocks = raw;
  if (typeof blocks === "string") {
    try {
      blocks = JSON.parse(blocks);
    } catch {
      return "";
    }
  }
  if (!Array.isArray(blocks)) return "";

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const text = typeof block.text === "string" ? block.text : "";
    const image = firstImageFromHtml(text);
    if (image) return image;
  }
  return "";
};

export const normalizeImageUrl = (value) => {
  const image = decodeBasicEntities(value).trim();
  if (!image) return "";
  if (image.startsWith("https://")) return image;
  if (image.startsWith("http://")) return `https://${image.slice("http://".length)}`;
  if (image.startsWith("//")) return `https:${image}`;
  if (image.startsWith("/")) return `${ASSET_BASE}${image}`;
  return `${ASSET_BASE}/${image}`;
};

export const toPreviewImage = (value, version = "") => {
  const image = normalizeImageUrl(value);
  if (!image) return DEFAULT_IMAGE;

  let preview = image;
  const storageMatch = image.match(/^(https:\/\/[^/]+\/storage\/v1)\/object\/public\/(.+)$/);
  if (storageMatch) {
    preview = `${storageMatch[1]}/render/image/public/${storageMatch[2].split("?")[0]}?width=1200&height=630&resize=cover&quality=80&format=webp`;
  }

  if (!version) return preview;
  return `${preview}${preview.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
};

export const imageType = (value) => {
  if (/([?&])format=webp(&|$)/i.test(value)) return "image/webp";
  const clean = value.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  return "";
};

export const resolveBlogPoster = (entry) => {
  const version = entry?.updated_at || "";
  const explicit = String(entry?.image_url || "").trim();
  if (explicit && !isBrokenImage(explicit)) {
    return toPreviewImage(explicit, version);
  }

  const embedded =
    firstImageFromBlocks(entry?.article_blocks) || firstImageFromHtml(entry?.content);
  if (embedded && !isBrokenImage(embedded)) {
    return toPreviewImage(embedded, version);
  }

  const category = entry?.blog_categories?.name || entry?.category_name || "";
  return toPreviewImage(blogCoverFallback(entry?.title, category), version);
};

export const resolveCoursePoster = (entry) => {
  const version = entry?.updated_at || "";
  const explicit = String(entry?.thumbnail_url || "").trim();
  if (explicit && !isBrokenImage(explicit)) {
    return toPreviewImage(explicit, version);
  }
  return DEFAULT_IMAGE;
};
