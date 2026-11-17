import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Margin around the root, e.g. "0px 0px -10% 0px". */
  rootMargin?: string;
  /** Visible ratio required before the element counts as in view. */
  threshold?: number;
  /** Keep the true state once the element has entered the viewport. */
  once?: boolean;
}

/**
 * One lightweight IntersectionObserver per element. Used by reveal animations,
 * counters and progress rings so each animation starts only when it is visible.
 *
 * Two failure modes are handled explicitly, because both leave content hidden
 * forever when the observer alone is trusted:
 * - The page opens at a restored scroll position (back/forward, refresh, tab
 *   restore). Elements above that position never intersect, so they never
 *   receive an "in" entry.
 * - The browser delays or drops the observer's first callback (background tab,
 *   bfcache, slow first paint on mobile). A layout check on the next frame and
 *   on `pageshow`/`visibilitychange` covers it.
 */
export const useInView = <T extends HTMLElement = HTMLDivElement>({
  rootMargin = "0px 0px -8% 0px",
  threshold = 0.12,
  once = true,
}: UseInViewOptions = {}) => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const inViewRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const show = () => {
      if (inViewRef.current) return;
      inViewRef.current = true;
      setInView(true);
    };

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            if (once) observer.disconnect();
          } else if (!once) {
            inViewRef.current = false;
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);

    /** Reveal anything the reader has already reached, or already scrolled past. */
    const checkReached = () => {
      if (inViewRef.current) return;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom <= 0 || (rect.top < viewportHeight && rect.bottom > 0)) {
        show();
        if (once) observer.disconnect();
      }
    };

    const raf = requestAnimationFrame(checkReached);
    // Scroll restoration can land after the first frame (notably on mobile
    // back/refresh); re-check once the browser has settled the position.
    const restoreTimer = window.setTimeout(checkReached, 400);
    const onPageShow = () => checkReached();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkReached();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(restoreTimer);
      observer.disconnect();
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [once, rootMargin, threshold]);

  return { ref, inView };
};
