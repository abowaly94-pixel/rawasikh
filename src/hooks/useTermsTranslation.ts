import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateMany, isTranslatableLang } from "@/lib/autoTranslate";

const CACHE_PREFIX = "terms-tr:";

function cacheKey(lang: string) {
  return `${CACHE_PREFIX}${lang}`;
}

function loadCache(lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: string, map: Record<string, string>) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Translates short terms (e.g. category names) from Arabic to the current
 * language via the free Google Translate endpoint. Caches results in
 * localStorage so switching languages later is instant.
 */
export function useTermsTranslation(terms: (string | null | undefined)[]) {
  const { i18n } = useTranslation();
  const lang = i18n.language || "ar";

  const cleanTerms = useMemo(() => {
    const set = new Set<string>();
    for (const t of terms) {
      const v = (t ?? "").trim();
      if (v) set.add(v);
    }
    return Array.from(set);
  }, [terms]);
  const cleanTermsKey = cleanTerms.join("");

  const [map, setMap] = useState<Record<string, string>>(() => {
    if (!isTranslatableLang(lang)) return {};
    return loadCache(lang);
  });

  useEffect(() => {
    if (!isTranslatableLang(lang)) {
      setMap({});
      return;
    }
    setMap(loadCache(lang));
  }, [lang]);

  useEffect(() => {
    if (!isTranslatableLang(lang) || cleanTerms.length === 0) return;
    const cached = loadCache(lang);
    const missing = cleanTerms.filter((t) => !cached[t]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        // translateMany throws if any term fails to translate — that's fine
        // here (short single-word terms rarely fail); on failure we simply
        // leave those terms untranslated for this pass rather than crash.
        const translations = await translateMany(missing, lang);
        if (cancelled) return;
        const next = { ...cached };
        missing.forEach((term, i) => {
          const tr = (translations[i] || "").trim();
          if (tr && tr !== term) next[term] = tr;
        });
        saveCache(lang, next);
        setMap(next);
      } catch (err) {
        console.error("Terms translation failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, cleanTerms, cleanTermsKey]);

  return {
    tt: (term: string | null | undefined) => {
      const v = (term ?? "").trim();
      if (!v) return term ?? "";
      if (!isTranslatableLang(lang)) return v;
      return map[v] || v;
    },
  };
}
