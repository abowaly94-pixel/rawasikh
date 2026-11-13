import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { translateMany, isTranslatableLang, looksTranslated } from "@/lib/autoTranslate";

const CACHE_PREFIX = "blog-tr:";
const ALL_LANGS = ["en", "fr", "ur"] as const;
const MAX_ATTEMPTS = 3;

// Must match the field order BlogPostPage.tsx passes into `texts`, and maps
// 1:1 onto the `blog_post_translations` table's columns.
//
// IMPORTANT — proper nouns are excluded on purpose. `author_name` (and any
// other person/organization proper name) must NEVER be listed here: Google
// Translate can partially transliterate a multi-word Arabic name (e.g. it
// recognizes "إبراهيم" as a name but treats "طاهر" as the ordinary word
// "pure"), producing mixed-language output inside a single field. Proper
// names always render as their original stored value — see tAuthorName in
// BlogPostPage.tsx. `category_name` is excluded too: categories already
// have one shared, cached translation path (useTermsTranslation/tt(), keyed
// by the term itself) used by every listing page — translating it a second
// time here, independently, is how the same category ends up worded
// differently between the article list and the article page.
const FIELD_ORDER = ["title", "content", "author_bio", "excerpt"] as const;

function cacheKey(id: string, lang: string, version: string | number = "1") {
  return `${CACHE_PREFIX}${id}:${lang}:${version}`;
}

function readCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True only if every non-empty field actually looks translated (guards
 * against a previously-cached row — local or shared — that was poisoned by
 * a partial failure and silently left some fields in Arabic). */
function rowLooksValid(fields: string[], originals: string[], targetLang: string): boolean {
  return fields.every((v, i) => !originals[i] || looksTranslated(v, targetLang));
}

/**
 * Translate a blog post's fields from Arabic to the current UI language.
 *
 * IMPORTANT: the actual translation call MUST happen from the visitor's own
 * browser — Google's free translate endpoint blocks/rate-limits requests
 * coming from cloud datacenter IPs (which is what a Supabase Edge Function
 * would use), so routing this server-side silently returns the untranslated
 * original every time. Instead, we translate client-side (like before), then
 * write the result into the shared `blog_post_translations` table so every
 * *other* visitor gets an instant DB read instead of re-translating.
 *
 * Correctness rules:
 *  - fields are only ever swapped to a translated language ALL AT ONCE, and
 *    only once every field has been verified to actually be in the target
 *    language. A field that fails to translate keeps the whole post showing
 *    in the original language (with a retry running in the background)
 *    rather than showing some fields translated and others not.
 *  - the translated-state cache is keyed by BOTH post id and language (not
 *    language alone), so navigating from one post to another never leaves a
 *    previous post's translated title/content showing under the new post's
 *    id while its own translation is still loading.
 */
export function useBlogTranslation(
  id: string | undefined,
  texts: (string | null | undefined)[],
  sourceLang: string = "ar",
  version: string | number = "1",
) {
  const { i18n } = useTranslation();
  const target = i18n.language?.slice(0, 2) || "ar";
  const originals = texts.map((t) => t ?? "");
  const originalsSignature = originals.join("␟");

  const [byKey, setByKey] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const attemptRef = useRef(0);

  const stateKey = id ? `${id}:${target}` : "";

  // Fast path: localStorage (this browser has seen this post/lang before).
  useEffect(() => {
    if (!id) return;
    const next: Record<string, string[]> = {};
    for (const lang of ALL_LANGS) {
      const cached = readCache(cacheKey(id, lang, version));
      if (cached && cached.length === originals.length && rowLooksValid(cached, originals, lang)) {
        next[`${id}:${lang}`] = cached;
      }
    }
    if (Object.keys(next).length) setByKey((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version, originals.length]);

  useEffect(() => {
    if (!id || target === sourceLang || !isTranslatableLang(target)) return;
    if (originals.every((t) => !t)) return;

    const key = cacheKey(id, target, version);
    const localCached = readCache(key);
    if (localCached && localCached.length === originals.length && rowLooksValid(localCached, originals, target)) {
      setByKey((prev) => ({ ...prev, [stateKey]: localCached }));
      return;
    }

    let cancelled = false;
    attemptRef.current = 0;
    setLoading(true);

    const run = async () => {
      // Shared cache: has ANY visitor already translated this post/lang?
      const { data: existing } = await supabase
        .from("blog_post_translations")
        .select("title, content, author_bio, excerpt, source_updated_at")
        .eq("post_id", id)
        .eq("language", target)
        .maybeSingle();

      if (cancelled) return true;

      const versionStr = String(version || "");
      const existingIsFresh = existing && (!versionStr || String(existing.source_updated_at || "") === versionStr);

      if (existingIsFresh) {
        const fromDb = FIELD_ORDER.map((f, i) => (existing as any)[f] || originals[i] || "");
        // Guard against a previously-poisoned shared cache row: if it isn't
        // actually translated, fall through and retranslate instead of
        // showing the stale mix.
        if (rowLooksValid(fromDb, originals, target)) {
          writeCache(key, fromDb);
          setByKey((prev) => ({ ...prev, [stateKey]: fromDb }));
          setLoading(false);
          return true;
        }
      }

      // Nobody has (validly) translated this yet — translate here, from this
      // browser. translateMany throws if ANY field fails to fully translate,
      // so we never end up displaying a mixed-language result.
      const translatedArray = await translateMany(originals, target, sourceLang);
      if (cancelled) return true;

      writeCache(key, translatedArray);
      setByKey((prev) => ({ ...prev, [stateKey]: translatedArray }));
      setLoading(false);

      // Share it for the next visitor. Best-effort — ignore failures.
      const row = FIELD_ORDER.reduce((acc, f, i) => {
        acc[f] = translatedArray[i] || "";
        return acc;
      }, {} as Record<(typeof FIELD_ORDER)[number], string>);
      supabase
        .from("blog_post_translations")
        .upsert(
          { post_id: id, language: target, ...row, source_updated_at: version != null ? String(version) : null },
          { onConflict: "post_id,language" },
        )
        .then(({ error }) => {
          if (error) console.error("Failed to cache blog translation:", error);
        });
      return true;
    };

    (async () => {
      while (!cancelled && attemptRef.current < MAX_ATTEMPTS) {
        try {
          const done = await run();
          if (done) return;
        } catch (err) {
          attemptRef.current += 1;
          console.error(`Blog translation attempt ${attemptRef.current} failed:`, err);
          if (cancelled || attemptRef.current >= MAX_ATTEMPTS) break;
          await sleep(500 * 2 ** attemptRef.current); // 1s, 2s, 4s
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version, originalsSignature, target, sourceLang, stateKey]);

  const translated = target === sourceLang ? originals : byKey[stateKey] || originals;
  const isTranslating = target !== sourceLang && !byKey[stateKey] && loading;
  return { translated, loading: isTranslating };
}
