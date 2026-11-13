import { useLayoutEffect, useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

interface ScrollScrubProps {
  children: React.ReactNode;
  className?: string;
  /** CSS selector for the elements to animate. Defaults to the direct children. */
  selector?: string;
  /** Vertical travel in pixels for the entrance lift. */
  y?: number;
  /** Tilt (degrees) applied while each card is still rising, straightened on settle. */
  skew?: number;
  /** 3D tilt around the X axis (degrees) as cards roll up into the viewport. */
  rotateX?: number;
  /** 3D tilt around the Y axis (degrees) for a subtle sideways swing. */
  rotateY?: number;
  /** Per-card depth offset (px). Each index starts a little lower than the last. */
  depth?: number;
  /** Total stagger across all targets, in seconds. */
  stagger?: number;
  /** Scale each card starts from, settling to 1 as it lands. */
  scale?: number;
  /**
   * Extra parallax speed for the drift after a card has landed. `0` disables it;
   * higher values make cards continue moving gently as the section passes.
   */
  parallax?: number;
  /** Perspective depth in pixels for the 3D rotation. Smaller = more dramatic. */
  perspective?: number;
  start?: string;
  end?: string;
  /** A number adds smoothing to the scrub; `true` binds it 1:1. */
  scrub?: number | boolean;
  /** Re-initialise when async content (courses, posts) changes length. */
  refreshKey?: string | number;
}

/**
 * Cinematic scroll-scrubbed entrance, powered by GSAP ScrollTrigger.
 *
 * Each card rolls up out of depth (perspective + rotateX/rotateY), straightens,
 * scales into place and then keeps a gentle parallax drift, while later cards
 * resolve a beat after earlier ones for an organic cascade. The motion is bound
 * to the scrollbar, so it plays forward and rewinds as the reader scrolls.
 *
 * Everything animates `transform`, `opacity` and `filter` only, keeping the work
 * on the GPU compositor for a steady frame rate. Reduced-motion visitors skip
 * the animation entirely and the markup stays fully visible without JavaScript.
 */
const ScrollScrub = ({
  children,
  className,
  selector,
  y = 88,
  skew = 6,
  rotateX = 0,
  rotateY = 0,
  depth = 0,
  stagger = 0.32,
  scale = 0.985,
  parallax = 0,
  perspective = 1200,
  start = "top 88%",
  end = "top 55%",
  scrub = 0.7,
  refreshKey,
}: ScrollScrubProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const targets = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : (Array.from(root.children) as HTMLElement[]);

    if (targets.length === 0) return;

    let cancelled = false;
    const triggers: ScrollTrigger[] = [];
    // Give the grid a shared 3D space so rotateX/rotateY read as real depth
    // instead of a flat skew.
    root.style.perspective = `${perspective}px`;
    root.style.perspectiveOrigin = "50% 40%";
    root.style.transformStyle = "preserve-3d";

    // Distribute the stagger across the entrance range so later cards resolve a
    // touch after earlier ones, giving the grid an organic cascade rather than
    // a single synchronised jump.
    const step = targets.length > 1 ? stagger / (targets.length - 1) : 0;
    const shift = 220;

    const ctx = gsap.context(() => {
      targets.forEach((target, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const offset = Math.round(index * step * shift);
        const targetStart = offset ? `top+=${offset} ${start.split(" ")[1] ?? "88%"}` : start;
        const targetEnd = offset ? `top+=${offset} ${end.split(" ")[1] ?? "55%"}` : end;

        const entrance = gsap.fromTo(
          target,
          {
            y: y + depth * index,
            z: -90 - depth * index,
            rotateX: rotateX || -8,
            rotateY: rotateY * direction,
            skewY: skew * direction,
            scale,
            opacity: 0,
            filter: "blur(6px)",
          },
          {
            y: 0,
            z: 0,
            rotateX: 0,
            rotateY: 0,
            skewY: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power4.out",
            force3D: true,
            scrollTrigger: {
              trigger: root,
              start: targetStart,
              end: targetEnd,
              scrub,
              invalidateOnRefresh: true,
            },
          },
        );

        if (entrance.scrollTrigger) triggers.push(entrance.scrollTrigger);

        // A secondary, slower set of transforms for the "settled" state gives the
        // cards a subtle parallax drift as the whole section keeps travelling.
        if (parallax) {
          const drift = gsap.fromTo(
            target,
            { yPercent: parallax * direction },
            {
              yPercent: -parallax * direction,
              ease: "none",
              force3D: true,
              scrollTrigger: {
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.1,
                invalidateOnRefresh: true,
              },
            },
          );
          if (drift.scrollTrigger) triggers.push(drift.scrollTrigger);
        }
      });
    }, root);

    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    const timer = window.setTimeout(refresh, 350);
    const onLoad = () => refresh();

    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", onLoad);
      triggers.forEach((trigger) => trigger.kill());
      ctx.revert();
      root.style.perspective = "";
      root.style.perspectiveOrigin = "";
      root.style.transformStyle = "";
    };
  }, [
    depth,
    end,
    parallax,
    perspective,
    reducedMotion,
    refreshKey,
    rotateX,
    rotateY,
    scale,
    scrub,
    selector,
    skew,
    stagger,
    start,
    y,
  ]);

  return (
    <div ref={rootRef} className={cn(className)}>
      {children}
    </div>
  );
};

export default ScrollScrub;
