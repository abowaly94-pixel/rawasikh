import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORTED_LANGS = new Set(["en", "fr", "ur"]);
const TRANSLATABLE_FIELDS = ["title", "excerpt", "content", "author_name", "author_bio", "category_name"] as const;
type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];
type BlogTranslation = Record<TranslatableField, string>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Free Google Translate endpoint (no API key). Chunks long HTML into pieces
// to stay under URL/query limits.
async function gtranslate(text: string, targetLang: string, sourceLang = "ar"): Promise<string> {
  if (!text || !text.trim()) return text;
  const MAX = 4500;
  const chunks: string[] = [];
  // Split by paragraph/tag boundaries to keep HTML intact when possible.
  const parts = text.split(/(?<=>)(?=<)|(?<=\n)/);
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > MAX && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf += p;
    }
    if (buf.length > MAX) {
      // Hard split if a single part is too long
      for (let i = 0; i < buf.length; i += MAX) chunks.push(buf.slice(i, i + MAX));
      buf = "";
    }
  }
  if (buf) chunks.push(buf);

  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}` +
      `&dt=t&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`gtranslate ${res.status}`);
    const data = await res.json();
    // data[0] is an array of [translated, original, ...] pairs
    const out = Array.isArray(data?.[0]) ? data[0].map((seg: unknown[]) => (seg?.[0] as string) || "").join("") : chunk;
    translatedChunks.push(out);
  }
  return translatedChunks.join("");
}

async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  const results: string[] = [];
  // Sequential to avoid rate-limiting from the free endpoint.
  for (const t of texts) {
    try {
      results.push(await gtranslate(t, targetLang));
    } catch (e) {
      console.error("gtranslate failed:", e instanceof Error ? e.message : String(e));
      results.push(t);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const targetLang = String(body?.targetLang || "").slice(0, 2);

    if (!targetLang || targetLang === "ar") {
      return jsonResponse({ translations: body?.texts || [], translation: body?.fields || null });
    }
    if (!SUPPORTED_LANGS.has(targetLang)) {
      return jsonResponse({ error: "Unsupported target language" }, 400);
    }

    if (body?.postId && body?.fields && typeof body.fields === "object") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Supabase service credentials missing" }, 500);

      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const postId = String(body.postId);
      const sourceUpdatedAt = body.sourceUpdatedAt ? String(body.sourceUpdatedAt) : null;

      const { data: existing } = await supabase
        .from("blog_post_translations")
        .select("title,excerpt,content,author_name,author_bio,category_name,source_updated_at")
        .eq("post_id", postId)
        .eq("language", targetLang)
        .maybeSingle();

      const requestedFields = TRANSLATABLE_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(body.fields, f));
      const hasAll = requestedFields.every((f) => {
        const orig = String(body.fields[f] ?? "").trim();
        const saved = String(existing?.[f] ?? "").trim();
        return orig ? Boolean(saved) : true;
      });

      if (existing && hasAll && !body.force && (!sourceUpdatedAt || existing.source_updated_at === sourceUpdatedAt)) {
        return jsonResponse({ translation: existing, cached: true });
      }

      const originals = requestedFields.map((f) => String(body.fields[f] ?? ""));
      const translatedTexts = await translateTexts(originals, targetLang);

      const partial = requestedFields.reduce((acc, f, i) => {
        acc[f] = translatedTexts[i] || "";
        return acc;
      }, {} as BlogTranslation);
      const translation = { ...existing, ...partial };

      await supabase.from("blog_post_translations").upsert(
        { post_id: postId, language: targetLang, ...translation, source_updated_at: sourceUpdatedAt },
        { onConflict: "post_id,language" },
      );

      return jsonResponse({ translation, translations: translatedTexts, cached: false });
    }

    if (!Array.isArray(body?.texts)) return jsonResponse({ error: "Missing texts or fields" }, 400);
    const originalTexts = body.texts.map((t: unknown) => String(t ?? ""));
    const translations = await translateTexts(originalTexts, targetLang);
    return jsonResponse({ translations });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
