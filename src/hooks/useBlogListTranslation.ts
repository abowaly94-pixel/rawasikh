import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { translateMany, isTranslatableLang, looksTranslated } from "@/lib/autoTranslate";

const CACHE_PREFIX = "blog-list-tr:";
const ALL_LANGS = ["en", "fr", "ur"] as const;

// Matches the [title, excerpt, author_bio] field order BlogPage.tsx passes in.
const FIELD_NAMES = ["title", "excerpt", "author_bio"] as const;

type Item = { id: string; fields: (string | null | undefined)[]; version?: string | null };

function cacheKey(lang: string, sig: string) {
  return `${CACHE_PREFIX}${lang}:${sig}`;
}

function readCache(key: string): Record<string, string[]> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: Record<string, string[]>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** True only if every non-empty field actually looks translated — guards
 * against displaying (or re-caching) a row poisoned by a partial failure. */
function rowLooksValid(fields: string[], originals: string[], targetLang: string): boolean {
  return fields.every((v, i) => !originals[i] || looksTranslated(v, targetLang));
}

/**
 * Batch translation for a blog list. Translation happens client-side (Google's
 * free endpoint blocks datacenter/server IPs, so this can't run from an edge
 * function), then results are written into the shared `blog_post_translations`
 * table so other visitors get an instant DB read instead of re-translating.
 *
 * A post's fields are only ever swapped in once every field for that post has
 * been verified to be in the target language — never a mix of translated and
 * still-Arabic fields.
 */
export function useBlogListTranslation(items: Item[], sourceLang: string = "ar") {
  const { i18n } = useTranslation();
  const target = i18n.language?.slice(0, 2) || "ar";
  const [maps, setMaps] = useState<Record<string, Record<string, string[]>>>({});

  const signature = items.map((it) => `${it.id}:${it.version || ""}`).join(",");

  useEffect(() => {
    if (!items.length) return;
    const next: Record<string, Record<string, string[]>> = {};
    for (const lang of ALL_LANGS) {
      const cached = readCache(cacheKey(lang, signature));
      if (cached) next[lang] = cached;
    }
    if (Object.keys(next).length) setMaps((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, items.length]);

  useEffect(() => {
    if (!items.length || target === sourceLang || !isTranslatableLang(target)) return;

    const cached = readCache(cacheKey(target, signature)) || {};
    const missing = items.filter((it) => !cached[it.id]);
    if (!missing.length) {
      setMaps((prev) => ({ ...prev, [target]: cached }));
      return;
    }

    let cancelled = false;
    (async () => {
      const map: Record<string, string[]> = { ...cached };

      // Shared DB cache: fetch any translations other visitors already produced.
      const { data: existingRows } = await supabase
        .from("blog_post_translations")
        .select("post_id, title, excerpt, author_bio, source_updated_at")
        .eq("language", target)
        .in("post_id", missing.map((it) => it.id));

      if (cancelled) return;
      const existingByPost = new Map((existingRows || []).map((r: any) => [r.post_id, r]));
      const stillMissing: Item[] = [];

      for (const item of missing) {
        const row = existingByPost.get(item.id);
        const versionStr = String(item.version || "");
        const isFresh = row && (!versionStr || String(row.source_updated_at || "") === versionStr);
        const fromDb = isFresh ? FIELD_NAMES.map((f, i) => row[f] || String(item.fields[i] ?? "")) : null;
        const originals = item.fields.map((v) => String(v ?? ""));
        if (fromDb && rowLooksValid(fromDb, originals, target)) {
          map[item.id] = fromDb;
          setMaps((prev) => ({ ...prev, [target]: { ...(prev[target] || {}), [item.id]: map[item.id] } }));
        } else {
          stillMissing.push(item);
        }
      }

      await Promise.all(
        stillMissing.map(async (item) => {
          const originals = item.fields.map((v) => String(v ?? ""));
          try {
            const translated = await translateMany(originals, target, sourceLang);
            if (cancelled) return;
            map[item.id] = translated;
            setMaps((prev) => ({ ...prev, [target]: { ...(prev[target] || {}), [item.id]: translated } }));

            const row = FIELD_NAMES.reduce((acc, f, i) => {
              acc[f] = translated[i] || "";
              return acc;
            }, {} as Record<(typeof FIELD_NAMES)[number], string>);
            supabase
              .from("blog_post_translations")
              .upsert(
                { post_id: item.id, language: target, ...row, source_updated_at: item.version || null },
                { onConflict: "post_id,language" },
              )
              .then(({ error }) => {
                if (error) console.error("Failed to cache blog translation:", error);
              });
          } catch (err) {
            // Leave this item untranslated (falls back to the source text via
            // the `map` consumer below) rather than caching a broken mix.
            console.error(`Blog list translation failed for post ${item.id}:`, err);
          }
        }),
      );

      if (!cancelled) writeCache(cacheKey(target, signature), map);
    })().catch((err) => {
      if (!cancelled) console.error("Blog list translation failed:", err);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, target, sourceLang]);

  const map = target === sourceLang ? {} : maps[target] || {};
  return { map, loading: false };
}
