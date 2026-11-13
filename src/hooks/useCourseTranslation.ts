import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { translateMany, isTranslatableLang, looksTranslated } from "@/lib/autoTranslate";

const CACHE_PREFIX = "course-tr:";
const ALL_LANGS = ["en", "fr", "ur"] as const;
const MAX_ATTEMPTS = 3;

// Must match the field order callers pass into `texts`, and maps 1:1 onto
// the `course_translations` table's columns.
const FIELD_ORDER = ["title", "description"] as const;

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

function rowLooksValid(fields: string[], originals: string[], targetLang: string): boolean {
  return fields.every((v, i) => !originals[i] || looksTranslated(v, targetLang));
}

/**
 * Translate a course's title + description from Arabic to the current UI
 * language. Same design as useBlogTranslation: translate client-side (so the
 * request comes from the visitor's own IP, since Google's free endpoint
 * blocks cloud datacenter IPs), then share the result via the
 * `course_translations` table so future visitors get an instant DB read.
 *
 * Cache state is keyed by BOTH course id and language (not language alone),
 * so navigating between courses never shows a stale translation left over
 * from a previously viewed course while the new one is still loading.
 */
export function useCourseTranslation(
  id: string | undefined,
  texts: (string | null | undefined)[],
  sourceLang: string = "ar",
  version: string | number = "1",
) {
  const { i18n } = useTranslation();
  const target = i18n.language?.slice(0, 2) || "ar";
  const originals = texts.map((t) => t ?? "");
  const originalsSignature = originals.join("␟");

  // Keyed by `${id}:${lang}` so switching between courses never leaks a
  // previous course's translated text into the new one while it loads.
  const [byKey, setByKey] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const attemptRef = useRef(0);

  const stateKey = id ? `${id}:${target}` : "";

  // Fast path: localStorage (this browser has seen this course/lang before).
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
      const { data: existing } = await supabase
        .from("course_translations")
        .select("title, description, source_updated_at")
        .eq("course_id", id)
        .eq("language", target)
        .maybeSingle();

      if (cancelled) return true;

      const versionStr = String(version || "");
      const existingIsFresh = existing && (!versionStr || String(existing.source_updated_at || "") === versionStr);

      if (existingIsFresh) {
        const fromDb = FIELD_ORDER.map((f, i) => (existing as any)[f] || originals[i] || "");
        if (rowLooksValid(fromDb, originals, target)) {
          writeCache(key, fromDb);
          setByKey((prev) => ({ ...prev, [stateKey]: fromDb }));
          setLoading(false);
          return true;
        }
      }

      const translatedArray = await translateMany(originals, target, sourceLang);
      if (cancelled) return true;

      writeCache(key, translatedArray);
      setByKey((prev) => ({ ...prev, [stateKey]: translatedArray }));
      setLoading(false);

      const row = FIELD_ORDER.reduce((acc, f, i) => {
        acc[f] = translatedArray[i] || "";
        return acc;
      }, {} as Record<(typeof FIELD_ORDER)[number], string>);
      supabase
        .from("course_translations")
        .upsert(
          { course_id: id, language: target, ...row, source_updated_at: version != null ? String(version) : null },
          { onConflict: "course_id,language" },
        )
        .then(({ error }) => {
          if (error) console.error("Failed to cache course translation:", error);
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
          console.error(`Course translation attempt ${attemptRef.current} failed:`, err);
          if (cancelled || attemptRef.current >= MAX_ATTEMPTS) break;
          await sleep(500 * 2 ** attemptRef.current);
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
