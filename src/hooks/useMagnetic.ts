import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface MagneticOptions {
  /** Fraction of the cursor-to-centre delta the element follows (reference: 0.2). */
  pull?: number;
  /** Follow duration in seconds while the pointer is inside (reference: 0.2). */
  followDuration?: number;
  /** Spring-back duration in seconds on leave (reference: 0.7). */
  returnDuration?: number;
  /** Portion of the pull applied to the inner content for a layered feel. */
  innerFactor?: number;
}

/**
 * Magnetic hover, faithful to the reference site's `.link-arrow` behaviour:
 * the element eases toward the cursor by a fraction of the centre delta while
 * hovered (fast follow), then springs back on leave (slow return). Offsets are
 * written to `--mx`/`--my` inside rAF, so no React render runs.
 *
 * Fully disabled for coarse pointers and reduced-motion visitors.
 */
export const useMagnetic = <T extends HTMLElement>({
  pull = 0.2,
  followDuration = 0.2,
  returnDuration = 0.7,
  innerFactor = 0.35,
}: MagneticOptions = {}) => {
  const ref = useRef<T>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const inner = el.querySelector<HTMLElement>("[data-magnetic-inner]");

    let frame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let duration = followDuration;
    let last = performance.now();

    const setDuration = (seconds: number) => {
      duration = seconds;
      // Keep the transition snappy but smooth by easing per-frame toward the
      // target; the CSS transition is bypassed for precise timing.
      el.style.transitionDuration = `${seconds}s`;
      if (inner) inner.style.transitionDuration = `${seconds}s`;
    };

    const paint = (now: number) => {
      frame = 0;
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now;
      // Exponential smoothing normalised to the requested duration.
      const k = 1 - Math.exp((-dt / Math.max(duration, 0.01)) * 3.2);
      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      el.style.setProperty("--mx", `${currentX.toFixed(2)}px`);
      el.style.setProperty("--my", `${currentY.toFixed(2)}px`);
      if (inner) {
        inner.style.setProperty("--mx", `${(currentX * innerFactor).toFixed(2)}px`);
        inner.style.setProperty("--my", `${(currentY * innerFactor).toFixed(2)}px`);
      }

      if (Math.abs(targetX - currentX) > 0.08 || Math.abs(targetY - currentY) > 0.08) {
        frame = requestAnimationFrame(paint);
      } else {
        frame = 0;
      }
    };

    const schedule = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(paint);
      }
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      targetX = dx * pull;
      targetY = dy * pull;
      schedule();
    };

    const onEnter = () => {
      setDuration(followDuration);
    };

    const onLeave = () => {
      setDuration(returnDuration);
      targetX = 0;
      targetY = 0;
      schedule();
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      el.style.transitionDuration = "";
      if (inner) {
        inner.style.removeProperty("--mx");
        inner.style.removeProperty("--my");
        inner.style.transitionDuration = "";
      }
    };
  }, [followDuration, innerFactor, pull, reducedMotion, returnDuration]);

  return ref;
};

export default useMagnetic;
