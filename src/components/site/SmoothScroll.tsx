import { useEffect } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setSmoothScroll } from "@/lib/smoothScroll";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Global inertial scrolling, powered by Lenis.
 *
 * The same library powers the reference experience we studied. Lenis only
 * changes the *feel* of the wheel/trackpad; it still moves the native scroll
 * position, so sticky headers, ScrollTrigger and anchor links keep working.
 *
 * Reduced-motion visitors keep native scrolling: the instance is not created
 * at all, and every GSAP section checks the same preference.
 */
const SmoothScroll = () => {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let lenis: import("lenis").default | null = null;
    let observer: MutationObserver | null = null;

    const tick = (time: number) => {
      lenis?.raf(time * 1000);
    };

    const isBodyLocked = () => {
      const body = document.body;
      const root = document.documentElement;
      return (
        body.hasAttribute("data-scroll-locked") ||
        body.style.overflow === "hidden" ||
        body.style.overflowY === "hidden" ||
        root.style.overflow === "hidden"
      );
    };

    const syncLock = () => {
      if (!lenis) return;
      if (isBodyLocked()) lenis.stop();
      else lenis.start();
    };

    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;

        lenis = new Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          syncTouch: false,
          // Yield the wheel to nested scroll containers (sidebar nav,
          // dialogs, dropdowns, tables) while they can still scroll in
          // the wheel direction; Lenis resumes page scroll at their ends.
          // Without this, the wheel over any nested scroller silently
          // scrolls the page — or appears to do nothing at all.
          allowNestedScroll: true,
          wheelMultiplier: 0.95,
          touchMultiplier: 1.4,
          anchors: { offset: -88 },
          stopInertiaOnNavigate: true,
          autoRaf: false,
        });

        setSmoothScroll(lenis);

        // Canonical Lenis + GSAP integration: one clock drives both systems,
        // which keeps scrubbed sections perfectly aligned with the page.
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        observer = new MutationObserver(syncLock);
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["style", "class", "data-scroll-locked"],
        });
        syncLock();
      })
      .catch(() => {
        // If the optional chunk cannot load, native scrolling remains intact.
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
      setSmoothScroll(null);
    };
  }, [reducedMotion]);

  return null;
};

export default SmoothScroll;
