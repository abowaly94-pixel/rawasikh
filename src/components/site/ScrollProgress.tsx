import { useEffect, useRef } from "react";

/**
 * A 2px reading-progress line that sits above the sticky header. It is updated
 * inside requestAnimationFrame and only touches a CSS variable, so scrolling
 * never triggers a React re-render.
 */
const ScrollProgress = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? Math.min(Math.max(doc.scrollTop / max, 0), 1) : 0;

      element.style.setProperty("--scroll-progress", progress.toFixed(4));
      element.style.opacity = progress > 0.003 ? "1" : "0";
    };

    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="scroll-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] opacity-0 transition-opacity duration-300"
      aria-hidden
    />
  );
};

export default ScrollProgress;
