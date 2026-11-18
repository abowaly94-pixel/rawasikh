import fs from "node:fs/promises";
import path from "node:path";

const CANONICAL_BASE = "https://rawasikheg.com";
const FALLBACK_DESCRIPTION = "رواسخ - للخدمات التعليمية وتنمية المهارات";
const DEFAULT_IMAGE = `${CANONICAL_BASE}/social-share.webp`;
const OUT_DIR = path.resolve("public/og");

function parseEnv(content = "") {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  try {
    const localEnv = parseEnv(await fs.readFile(path.resolve(".env"), "utf8"));
    for (const [key, value] of Object.entries(localEnv)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Build still succeeds without OG generation if env is unavailable.
  }
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function firstImageFromHtml(value) {
  const match = String(value || "").match(/<img[^>]*src=["']([^"'>]+)["']/i);
  return match?.[1] || "";
}

function firstImageFromBlocks(value) {
  let blocks = value;
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
    const image = firstImageFromHtml(block.text);
    if (image) return image;
  }
  return "";
}

function decodeBasicEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeImageUrl(value) {
  const imageUrl = decodeBasicEntities(value).trim();
  if (!imageUrl) return "";
  if (imageUrl.startsWith("https://")) return imageUrl;
  if (imageUrl.startsWith("http://")) return `https://${imageUrl.slice("http://".length)}`;
  if (imageUrl.startsWith("/")) return `${CANONICAL_BASE}${imageUrl}`;
  return "";
}

function toPreviewImageUrl(value, version) {
  const imageUrl = normalizeImageUrl(value);
  if (!imageUrl) return "";

  let previewUrl = imageUrl;
  const storageMatch = imageUrl.match(/^(https:\/\/[^/]+\/storage\/v1)\/object\/public\/(.+)$/);
  if (storageMatch) {
    previewUrl = `${storageMatch[1]}/render/image/public/${storageMatch[2].split("?")[0]}?width=1200&height=630&resize=cover&quality=80&format=webp`;
  }

  if (!version) return previewUrl;
  return `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function imageType(value) {
  if (/([?&])format=webp(&|$)/i.test(value)) return "image/webp";
  const clean = value.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

function pageHtml({ type, title, description, canonical, image }) {
  const safeTitle = esc(title || "رواسخ");
  const safeDescription = esc((description || FALLBACK_DESCRIPTION).slice(0, 220));
  const safeCanonical = esc(canonical);
  const safeImage = esc(image);
  const safeImageType = safeImage ? esc(imageType(image)) : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<link rel="canonical" href="${safeCanonical}" />
<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="رواسخ" />
<meta property="og:locale" content="ar_EG" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:url" content="${safeCanonical}" />
${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ""}
${safeImage ? `<meta property="og:image:secure_url" content="${safeImage}" />` : ""}
${safeImageType ? `<meta property="og:image:type" content="${safeImageType}" />` : ""}
${safeImage ? `<meta property="og:image:width" content="1200" />` : ""}
${safeImage ? `<meta property="og:image:height" content="630" />` : ""}
${safeImage ? `<meta property="og:image:alt" content="${safeTitle}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ""}
</head>
<body><a href="${safeCanonical}">${safeTitle}</a></body>
</html>
`;
}

async function fetchAllRows(url, key, table, select, extra = "") {
  const rows = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const endpoint = `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}&limit=${limit}&offset=${offset}`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Could not fetch ${table}: ${response.status}`);
    }

    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < limit) break;
  }
  return rows;
}

async function main() {
  await loadEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Skipping OG page generation: Supabase env is missing.");
    return;
  }

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(path.join(OUT_DIR, "blog"), { recursive: true });
  await fs.mkdir(path.join(OUT_DIR, "courses"), { recursive: true });

  const [posts, courses] = await Promise.all([
    fetchAllRows(supabaseUrl, supabaseKey, "blog_posts", "id,title,excerpt,content,image_url,article_blocks,updated_at"),
    fetchAllRows(supabaseUrl, supabaseKey, "courses", "id,title,description,thumbnail_url,updated_at,is_published", "&is_published=eq.true"),
  ]);

  await Promise.all(
    posts.map((post) => {
      const canonical = `${CANONICAL_BASE}/blog/${post.id}`;
      const description = stripHtml(post.excerpt || post.content || "") || FALLBACK_DESCRIPTION;
      const explicitImage = String(post.image_url || "").trim();
      const imageValue = explicitImage && !explicitImage.includes("/wp-content/uploads/")
        ? explicitImage
        : firstImageFromHtml(post.content) || firstImageFromBlocks(post.article_blocks) || explicitImage;
      const image = toPreviewImageUrl(imageValue, post.updated_at || "") || DEFAULT_IMAGE;
      return fs.writeFile(
        path.join(OUT_DIR, "blog", `${post.id}.html`),
        pageHtml({ type: "article", title: post.title, description, canonical, image }),
        "utf8",
      );
    }),
  );

  await Promise.all(
    courses.map((course) => {
      const canonical = `${CANONICAL_BASE}/courses/${course.id}`;
      const description = stripHtml(course.description || "") || FALLBACK_DESCRIPTION;
      const image = toPreviewImageUrl(course.thumbnail_url || "", course.updated_at || "") || DEFAULT_IMAGE;
      return fs.writeFile(
        path.join(OUT_DIR, "courses", `${course.id}.html`),
        pageHtml({ type: "website", title: course.title, description, canonical, image }),
        "utf8",
      );
    }),
  );

  console.log(`Generated ${posts.length} blog OG pages and ${courses.length} course OG pages.`);
}

main().catch((error) => {
  console.warn(`Skipping OG page generation: ${error.message}`);
});