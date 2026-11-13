#!/usr/bin/env node
/**
 * json-to-ddl.mjs — توليد CREATE TABLE من باك أب JSON
 *
 * بيستخدم للأعمدة/الجداول اللي مش موجودة في supabase/migrations.
 * الاستخدام:
 *   node migrate/json-to-ddl.mjs "C:\path\to\rawasikh-backup.json"
 *
 * المخرجات:
 *   migrate/schema-missing-tables.sql   ← الـ DDL
 *   migrate/schema-inference-report.md  ← تقرير الأنواع المستنتجة (للمراجعة)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const backupPath = process.argv[2];
if (!backupPath || !fs.existsSync(backupPath)) {
  console.error("✖ استخدم: node migrate/json-to-ddl.mjs <backup.json>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const tables = data.tables || {};

/* ---------- الجداول الموجودة في الـ migrations ---------- */
const migDir = path.join(ROOT, "supabase", "migrations");
const sql = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => fs.readFileSync(path.join(migDir, f), "utf8"))
  .join("\n");
const inMigrations = new Set(
  [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)].map((m) => m[1].toLowerCase()),
);

const missing = Object.keys(tables)
  .filter((t) => !inMigrations.has(t.toLowerCase()))
  .sort();

/* ---------- استنتاج النوع ---------- */
const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isTs = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v) => typeof v === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(v);
const isEmail = (v) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v);
const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

function inferType(rows, col) {
  const vals = rows.map((r) => r?.[col]).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return { type: "text", why: "كل القيم null → نص (راجعها يدويًا)" };

  const types = new Set();
  for (const v of vals) {
    if (typeof v === "boolean") types.add("boolean");
    else if (typeof v === "number") types.add(Number.isInteger(v) ? "number" : "decimal");
    else if (typeof v === "object") types.add("jsonb");
    else if (typeof v === "string") {
      if (isUuid(v)) types.add("uuid");
      else if (isTs(v)) types.add("timestamptz");
      else if (isDate(v)) types.add("date");
      else if (isTime(v)) types.add("time");
      else if (["true", "false"].includes(v)) types.add("boolean?");
      else types.add("text");
    }
  }

  // لو فيه uuid + نص → الأغلب mixed → نص
  let pick;
  if (types.size === 1) pick = [...types][0];
  else if (types.has("text")) pick = "text";
  else pick = [...types][0];

  const map = {
    uuid: "uuid",
    timestamptz: "timestamptz",
    date: "date",
    time: "time",
    boolean: "boolean",
    "boolean?": "boolean",
    number: "integer",
    decimal: "numeric",
    jsonb: "jsonb",
    text: "text",
  };
  return { type: map[pick] || "text", why: `${vals.length} قيمة — أنواع: ${[...types].join(", ")}` };
}

/* ---------- مطابقة أسماء الجداول للعلاقات ---------- */
const tableSet = new Set(Object.keys(tables));
const singular = (t) => (t.endsWith("ies") ? t.slice(0, -3) + "y" : t.endsWith("ses") || t.endsWith("xes") ? t.slice(0, -2) : t.endsWith("s") ? t.slice(0, -1) : t);
function findTarget(col) {
  // أعمدة المستخدمين
  if (/(^|_)by$/.test(col) || col === "user_id" || col === "created_by" || col === "recorded_by") return "auth.users";

  if (!col.endsWith("_id")) return null;
  const base = col.slice(0, -3);
  if (base === "user") return "auth.users";

  // مطابقة مباشرة
  for (const c of [`${base}s`, `${base}es`, base, `${singular(base)}s`]) {
    if (tableSet.has(c) && c !== col) return c;
  }
  // مطابقة مركبة: plan_id → course_payment_plans
  for (const t of tableSet) {
    if (t === col) continue;
    if (t.endsWith(`_${base}s`) || t.endsWith(`_${base}es`)) return t;
  }
  return null;
}

/* ---------- توليد ---------- */
const ddl = [];
const report = [];
ddl.push(`-- ============================================================`);
ddl.push(`-- جداول موجودة في الداتابيز الحقيقية وغير موجودة في supabase/migrations`);
ddl.push(`-- مولّدة آليًا من الباك أب: ${path.basename(backupPath)}`);
ddl.push(`-- ⚠️ راجعها قبل التنفيذ — الأنواع مستنتجة من البيانات، والـ RLS لازم تتكتب يدويًا`);
ddl.push(`-- ============================================================`);
ddl.push("");

for (const t of missing) {
  const rows = Array.isArray(tables[t]) ? tables[t] : [];
  const cols = new Set();
  for (const r of rows.slice(0, 500)) if (r && typeof r === "object") Object.keys(r).forEach((k) => cols.add(k));
  const colList = [...cols];

  if (!colList.length) {
    ddl.push(`-- ${t}: مفيش صفوف ولا أعمدة — مش ممكن توليد هيكل (اتعمل يدويًا أو من الداشبورد)`);
    ddl.push("");
    report.push({ table: t, columns: [], rows: 0, note: "فاضي تمامًا" });
    continue;
  }

  const lines = [];
  const fks = [];
  const indexes = [];
  for (const c of colList) {
    const { type } = inferType(rows, c);
    let def = `  "${c}" ${type}`;
    if (c === "id") def += type === "uuid" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : " PRIMARY KEY";
    if (c === "created_at" || c === "updated_at") def += " NOT NULL DEFAULT now()";
    if (c === "is_active" || c === "is_published" || c === "is_featured") def += " DEFAULT false";
    const target = findTarget(c);
    if (target && type === "uuid") {
      fks.push(`ALTER TABLE public."${t}" ADD CONSTRAINT "${t}_${c}_fkey" FOREIGN KEY ("${c}") REFERENCES ${target === "auth.users" ? "auth.users" : `public."${target}"`}(id) ON DELETE SET NULL;`);
      indexes.push(`CREATE INDEX IF NOT EXISTS "${t}_${c}_idx" ON public."${t}"("${c}");`);
    }
    lines.push(def);
  }

  ddl.push(`CREATE TABLE IF NOT EXISTS public."${t}" (`);
  ddl.push(lines.join(",\n"));
  ddl.push(`);`);
  ddl.push(`ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;`);
  ddl.push(`GRANT SELECT, INSERT, UPDATE, DELETE ON public."${t}" TO authenticated;`);
  if (fks.length) ddl.push(fks.join("\n"));
  if (indexes.length) ddl.push(indexes.join("\n"));
  ddl.push("");

  report.push({ table: t, rows: rows.length, columns: colList.map((c) => `${c}: ${inferType(rows, c).type}`) });
}

fs.mkdirSync(path.join(ROOT, "migrate"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "migrate", "schema-missing-tables.sql"), ddl.join("\n"));

const md = [];
md.push(`# تقرير استنتاج الهيكل — ${missing.length} جدول`);
md.push("");
md.push(`المصدر: \`${path.basename(backupPath)}\``);
md.push("");
for (const r of report) {
  md.push(`## ${r.table} — ${r.rows} صف`);
  if (r.note) md.push(`> ${r.note}`);
  else md.push(r.columns.map((c) => `- \`${c}\``).join("\n"));
  md.push("");
}
fs.writeFileSync(path.join(ROOT, "migrate", "schema-inference-report.md"), md.join("\n"));

console.log(`✔ جداول في الـ migrations: ${inMigrations.size}`);
console.log(`✔ جداول في الباك أب: ${Object.keys(tables).length}`);
console.log(`✔ جداول ناقصة (اتولّد لها DDL): ${missing.length}`);
console.log(missing.join(", "));
console.log(`\n📄 migrate/schema-missing-tables.sql`);
console.log(`📄 migrate/schema-inference-report.md`);
