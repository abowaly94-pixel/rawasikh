// Free client-side translation via Google Translate's public gtx endpoint.
// Called directly from the browser so each visitor uses their own IP (Google
// blocks datacenter IPs, so calling from an edge function fails with 429).

const SUPPORTED = new Set(["en", "fr", "ur"]);

// Arabic-script Unicode block. NOTE: Urdu ("ur") also uses this block (it's
// written in a Perso-Arabic script), so this check can only be used to
// sanity-check translations INTO "en"/"fr" — a fully-translated Urdu string
// legitimately contains these code points too.
export const hasArabic = (value: string) => /[؀-ۿ]/.test(value);

/** True if `text` looks like it was actually translated into `targetLang`
 * (as opposed to silently falling back to the untouched Arabic source). */
export function looksTranslated(text: string, targetLang: string): boolean {
  if (!text || !text.trim()) return true;
  if (targetLang === "ur") return true; // can't validate via script check
  return !hasArabic(text);
}

// --- Small concurrency limiter -------------------------------------------
// Google's free endpoint rate-limits/blocks bursts of requests from one IP.
// A long article can split into a dozen+ chunks; translating a whole post
// (title + content + author bio + excerpt + category, each possibly
// chunked) in full parallel easily trips that limit, which is what was
// causing long articles to silently fail while short fields (like the
// title) succeeded. Capping concurrency makes the whole batch far more
// likely to succeed on the first try.
const MAX_CONCURRENT = 4;
let active = 0;
const queue: Array<() => void> = [];

function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (active < MAX_CONCURRENT) run();
    else queue.push(run);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateChunkOnce(text: string, targetLang: string, sourceLang: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}` +
    `&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gtranslate ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.[0])
    ? data[0].map((seg: unknown[]) => (seg?.[0] as string) || "").join("")
    : text;
}

/** Translate one chunk with retries (network hiccups / transient 429s), under
 * the shared concurrency limit. Throws (instead of silently returning the
 * original text) once retries are exhausted, so callers know translation of
 * this piece genuinely failed rather than mistaking Arabic-fallback for a
 * real translation. */
async function translateChunk(text: string, targetLang: string, sourceLang: string, attempts = 3): Promise<string> {
  return withLimit(async () => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await translateChunkOnce(text, targetLang, sourceLang);
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) await sleep(300 * 2 ** i); // 300ms, 600ms
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("gtranslate failed");
  });
}

/**
 * Translate a single string (possibly containing HTML) from Arabic to the
 * target language. Splits large content into chunks that fit in the URL.
 * Throws if any chunk ultimately fails — callers must not silently display a
 * half-translated (mixed-language) result.
 */
export async function translateText(text: string, targetLang: string, sourceLang = "ar"): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!SUPPORTED.has(targetLang) || targetLang === sourceLang) return text;

  const MAX = 1800; // Keep well under URL length limits after percent-encoding
  if (text.length <= MAX) return translateChunk(text, targetLang, sourceLang);

  // Split on HTML tag boundaries (>< ), newlines, or Arabic sentence terminators.
  const parts = text.split(/(?<=>)(?=<)|(?<=\n)|(?<=[.!؟])\s+/);
  const chunks: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      chunks.push(buf);
      buf = "";
    }
  };
  for (const p of parts) {
    if ((buf + p).length > MAX) {
      flush();
      if (p.length > MAX) {
        // Hard-split oversized single part
        for (let i = 0; i < p.length; i += MAX) chunks.push(p.slice(i, i + MAX));
      } else {
        buf = p;
      }
    } else {
      buf += p;
    }
  }
  flush();

  // Chunks translate concurrently (bounded by the shared limiter above), but
  // a failure in ANY chunk after retries rejects the whole field instead of
  // quietly leaving that piece in Arabic.
  const results = await Promise.all(chunks.map((c) => translateChunk(c, targetLang, sourceLang)));
  return results.join("");
}

/** Batch translate — all items must succeed, or the whole batch throws.
 * This is intentional: a caller (e.g. a blog post with a title + long body)
 * must never end up showing some fields translated and others still in the
 * source language. */
export async function translateMany(texts: string[], targetLang: string, sourceLang = "ar"): Promise<string[]> {
  const results = await Promise.all(texts.map((t) => translateText(t, targetLang, sourceLang)));
  const allValid = results.every((r, i) => looksTranslated(r, targetLang) || !texts[i]);
  if (!allValid) {
    throw new Error("Translation validation failed: some fields still contain untranslated source text");
  }
  return results;
}

export const isTranslatableLang = (lang: string) => SUPPORTED.has(lang);
