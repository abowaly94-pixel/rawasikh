import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface UseCountUpOptions {
  /** Final value to reach. */
  end: number;
  /** Start the animation only when true (typically tied to visibility). */
  start: boolean;
  /** Duration in milliseconds. */
  duration?: number;
  /** Delay before the animation begins. */
  delay?: number;
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

/**
 * requestAnimationFrame counter with a soft ease-out. It animates from zero
 * only once the section is visible, and jumps straight to the final value when
 * the visitor prefers reduced motion.
 */
export const useCountUp = ({
  end,
  start,
  duration = 1500,
  delay = 0,
}: UseCountUpOptions) => {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    if (reducedMotion || typeof window === "undefined") {
      setValue(end);
      return;
    }

    let frame = 0;
    let timeout = 0;

    const run = () => {
      const startedAt = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        setValue(Math.round(end * easeOutCubic(progress)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      timeout = window.setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [delay, duration, end, reducedMotion, start]);

  return value;
};
