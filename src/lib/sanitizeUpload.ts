// Sanitize filenames for storage uploads so Arabic/Unicode/symbols are accepted.
// Supabase Storage keys must be ASCII-safe; this helper strips or replaces
// anything unsafe while preserving a short, readable slug + extension.

export function sanitizeExt(name: string, fallback = "bin"): string {
  const raw = (name.split(".").pop() || "").toLowerCase();
  const clean = raw.replace(/[^a-z0-9]/g, "").slice(0, 6);
  return clean || fallback;
}

export function sanitizeBase(name: string, maxLen = 40): string {
  const withoutExt = name.replace(/\.[^.]+$/, "");
  const ascii = withoutExt
    .replace(/[^a-zA-Z0-9._-]+/g, "-") // non-ASCII (Arabic etc) → dash
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, maxLen);
  return ascii || "file";
}

// Returns a unique, ASCII-safe filename like "1734567890-abc123-mybase.jpg"
export function safeUploadName(originalName: string, fallbackExt = "bin"): string {
  const ext = sanitizeExt(originalName, fallbackExt);
  const base = sanitizeBase(originalName);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${rand}-${base}.${ext}`;
}
