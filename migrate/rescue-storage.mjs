#!/usr/bin/env node
/**
 * rescue-storage.mjs — نسخ ملفات Supabase Storage إلى جهازك
 *
 * الاستخدام:
 *   node migrate/rescue-storage.mjs                 # عرض فقط (بدون تنزيل)
 *   node migrate/rescue-storage.mjs --download      # تنزيل فعلي
 *
 * ملاحظات:
 *  - يقرأ VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY من ملف .env
 *  - يعمل على الـ buckets العامة فقط (اللي الـ anon key يقدر يسردها)
 *  - الملفات تتحفظ في migrate/storage/<bucket>/<path>
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const OUT_DIR = path.join(ROOT, "migrate", "storage");
const DOWNLOAD = process.argv.includes("--download");

const BUCKETS = ["site-assets", "lesson-thumbnails", "lesson-pdfs", "payment-screenshots", "task-submissions"];

function readEnv(p) {
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = readEnv(ENV_PATH);
const URL_BASE = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("✖ مفاتيح Supabase مش موجودة في .env");
  process.exit(1);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function listPage(bucket, prefix, offset = 0) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) return { ok: false, status: res.status, items: [] };
  const items = await res.json();
  return { ok: true, status: res.status, items: Array.isArray(items) ? items : [] };
}

async function walk(bucket, prefix = "") {
  const files = [];
  let offset = 0;
  for (;;) {
    const page = await listPage(bucket, prefix, offset);
    if (!page.ok) return { files, error: page.status };
    if (!page.items.length) break;
    for (const it of page.items) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) {
        const sub = await walk(bucket, full);
        files.push(...sub.files);
      } else {
        files.push({ path: full, size: Number(it.metadata?.size || 0), mime: it.metadata?.mimetype || "" });
      }
    }
    if (page.items.length < 1000) break;
    offset += 1000;
  }
  return { files };
}

const human = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`);

const report = [];
let totalBytes = 0;
let totalFiles = 0;

for (const bucket of BUCKETS) {
  const { files, error } = await walk(bucket);
  const bytes = files.reduce((s, f) => s + f.size, 0);
  totalBytes += bytes;
  totalFiles += files.length;
  report.push({ bucket, files: files.length, bytes, error: error || null, listing: files });

  if (DOWNLOAD && files.length) {
    for (const f of files) {
      const dest = path.join(OUT_DIR, bucket, f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (fs.existsSync(dest) && fs.statSync(dest).size === f.size) continue;
      const url = `${URL_BASE}/storage/v1/object/public/${bucket}/${f.path.split("/").map(encodeURIComponent).join("/")}`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`  ✖ ${bucket}/${f.path} → HTTP ${r.status}`);
        continue;
      }
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      process.stdout.write(".");
    }
    process.stdout.write("\n");
  }
}

console.log("\n=== تقرير Buckets ===");
for (const r of report) {
  const note = r.error ? `  (سرد غير متاح: HTTP ${r.error})` : "";
  console.log(`${r.bucket.padEnd(20)} ${String(r.files).padStart(4)} ملف   ${human(r.bytes).padStart(9)}${note}`);
}
console.log(`\nالإجمالي: ${totalFiles} ملف — ${human(totalBytes)} من ${human(totalBytes * 1.0)}`);
console.log(DOWNLOAD ? `\n✔ اتحفظ في: ${OUT_DIR}` : "\n(عرض فقط — أضف --download عشان تنزيل فعلي)");

fs.mkdirSync(path.join(ROOT, "migrate"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "migrate", "storage-manifest.json"),
  JSON.stringify(report.map(({ listing, ...rest }) => ({ ...rest, listing })), null, 2),
);
console.log(`📄 المانيفست: migrate/storage-manifest.json`);
