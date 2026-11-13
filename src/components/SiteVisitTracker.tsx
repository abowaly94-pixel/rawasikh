import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/siteVisitTracker";

// Mounted once at the app root. Silently logs one row per route change so the
// admin "Platform Stats" page can show real visitor traffic (including
// anonymous, not-logged-in users) instead of just registered-user counts.
const SiteVisitTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;
    trackPageView(path);
  }, [location.pathname]);

  return null;
};

export default SiteVisitTracker;
