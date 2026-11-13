/**
 * Build-time sitemap generator.
 *
 * Static marketing pages are listed by hand; courses, blog posts, store
 * products and portfolio entries are pulled from Supabase so the sitemap
 * always reflects what is actually published. Runs as part of `prebuild`;
 * the build never fails because of it.
 */
import fs from "node:fs/promises";
import path from "node:path";

const CANONICAL_BASE = "https://rawasikheg.com";
const OUT_FILE = path.resolve("public/sitemap.xml");

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/courses", changefreq: "weekly", priority: "0.9" },
  { path: "/teachers", changefreq: "weekly", priority: "0.8" },
  { path: "/store", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/services", changefreq: "monthly", priority: "0.8" },
  { path: "/academic-services", changefreq: "monthly", priority: "0.7" },
  { path: "/digital-solutions", changefreq: "monthly", priority: "0.8" },
  { path: "/portfolio", changefreq: "monthly", priority: "0.7" },
  { path: "/level-assessment", changefreq: "monthly", priority: "0.7" },
  { path: "/evaluation-tests", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/policies", changefreq: "yearly", priority: "0.4" },
];

function parseEnv(content = "") {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
    // Optional: fall back to process.env only.
  }
}

async function fetchRows(baseUrl, key, table, select, filter = "") {
  const rows = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const endpoint = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(
      select,
    )}${filter}&limit=${limit}&offset=${offset}`;
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`${table}: ${response.status}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < limit) break;
  }
  return rows;
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isoDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

function urlEntry({ path: routePath, changefreq, priority, lastmod }) {
  return `  <url>
    <loc>${escapeXml(`${CANONICAL_BASE}${routePath}`)}</loc>
    <lastmod>${isoDate(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  await loadEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const entries = STATIC_PAGES.map((page) => urlEntry({ ...page, lastmod: new Date() }));

  if (supabaseUrl && supabaseKey) {
    const [courses, posts, products, portfolio] = await Promise.all([
      fetchRows(supabaseUrl, supabaseKey, "courses", "id,updated_at", "&is_published=eq.true"),
      fetchRows(supabaseUrl, supabaseKey, "blog_posts", "id,updated_at", "&is_published=eq.true"),
      fetchRows(supabaseUrl, supabaseKey, "products", "id,updated_at", "&is_active=eq.true"),
      fetchRows(supabaseUrl, supabaseKey, "portfolio", "id,updated_at", "&is_active=eq.true"),
    ]);

    for (const course of courses) {
      entries.push(
        urlEntry({
          path: `/courses/${course.id}`,
          changefreq: "weekly",
          priority: "0.8",
          lastmod: course.updated_at,
        }),
      );
    }

    for (const post of posts) {
      entries.push(
        urlEntry({
          path: `/blog/${post.id}`,
          changefreq: "monthly",
          priority: "0.7",
          lastmod: post.updated_at,
        }),
      );
    }

    for (const product of products) {
      entries.push(
        urlEntry({
          path: `/store/${product.id}`,
          changefreq: "weekly",
          priority: "0.7",
          lastmod: product.updated_at,
        }),
      );
    }

    // Portfolio entries currently open inside the listing page, so only the
    // listing itself is submitted. Kept here for future detail routes.
    void portfolio;
  } else {
    console.warn("Sitemap: Supabase env missing, writing static URLs only.");
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  await fs.writeFile(OUT_FILE, xml, "utf8");
  console.log(`Sitemap written with ${entries.length} URLs.`);
}

main().catch((error) => {
  console.warn(`Skipping sitemap generation: ${error.message}`);
});
