import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger in milliseconds. */
  delay?: number;
  /**
   * Motion flavour:
   * - "up"    — the default editorial rise.
   * - "fade"  — opacity only.
   * - "scale" — subtle grow into place.
   * - "rise"  — a taller, softer rise for hero-scale blocks.
   * - "pop"   — a confident pop for badges and small chips.
   * - "left" / "right" — directional entrances for split layouts.
   */
  variant?: "up" | "fade" | "scale" | "rise" | "pop" | "left" | "right";
  className?: string;
}

/**
 * Reveals content once it scrolls into view. The IntersectionObserver lives in
 * a shared hook so every section uses the same small, consistent motion.
 *
 * Motion uses the modern `translate` / `scale` properties rather than
 * `transform`, so a reveal never fights an element's own transform (hover
 * lifts, GSAP, parallax) and the compositor can keep both on separate layers.
 * Reduced-motion visitors see the final state immediately.
 */
const Reveal = ({ children, delay = 0, variant = "up", className }: RevealProps) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reducedMotion = usePrefersReducedMotion();
  const shown = reducedMotion || inView;

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      data-reveal={shown ? "in" : "out"}
      data-variant={variant}
      style={delay && !reducedMotion ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default Reveal;
