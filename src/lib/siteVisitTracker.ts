import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "rwk_visitor_id";

// A persistent, anonymous per-browser identifier (not tied to any account),
// used only to count unique visitors. Falls back gracefully if storage/crypto
// is unavailable so tracking never throws.
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export async function trackPageView(path: string) {
  try {
    await supabase.from("site_visits").insert({
      visitor_id: getVisitorId(),
      path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
    });
  } catch {
    // Tracking must never break the app
  }
}
