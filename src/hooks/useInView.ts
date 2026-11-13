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
 */
export const useInView = <T extends HTMLElement = HTMLDivElement>({
  rootMargin = "0px 0px -8% 0px",
  threshold = 0.12,
  once = true,
}: UseInViewOptions = {}) => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, inView };
};
