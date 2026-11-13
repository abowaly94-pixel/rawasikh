// Small helper for supabase.functions.invoke() callers.
//
// When a Supabase Edge Function returns a non-2xx status, supabase-js
// throws a generic `FunctionsHttpError` whose `.message` is the unhelpful
// literal string "Edge Function returned a non-2xx status code" — the
// function's own JSON body (which usually has a specific, useful Arabic
// `error` message) is NOT surfaced automatically. Callers that did
// `if (error) throw error;` were showing that generic English sentence to
// the admin no matter what actually went wrong inside the function
// (missing permission, invalid input, a downstream Supabase Auth error,
// etc.), making it impossible to tell what to fix without reading server
// logs. This unwraps the real body so the toast always shows the true
// reason.
export async function getFunctionErrorMessage(error: unknown, fallback = "حدث خطأ غير متوقع"): Promise<string> {
  try {
    const resp = (error as { context?: Response } | null)?.context;
    if (resp && typeof resp.json === "function") {
      const body = await (resp.clone ? resp.clone() : resp).json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    // Response body wasn't JSON (or already consumed) — fall through to the generic message below.
  }
  return (error as { message?: string } | null)?.message || fallback;
}
