import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface SplitWordsProps {
  /** The headline text. Split on whitespace. */
  text: string;
  /** Element tag to render. Defaults to a span so it can sit inside a heading. */
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  /** Milliseconds between the start of each word. */
  stagger?: number;
  /** Start the cascade when the element scrolls into view instead of on mount. */
  onView?: boolean;
}

/**
 * Reference-inspired typographic reveal: a headline rises in word by word,
 * each word masked and lifted with a slight tilt, so the line reads as a
 * crafted entrance rather than a plain fade.
 *
 * Accessibility and no-JS safety:
 * - The full sentence stays in the DOM as real text (one span per word), so
 *   screen readers and crawlers read it normally.
 * - Words are visible by default; the animation only runs once the
 *   `reveal-ready` class confirms JavaScript is active, avoiding a flash of
 *   hidden text.
 * - Reduced-motion visitors see the final state immediately.
 */
const SplitWords = ({
  text,
  as: Tag = "span",
  className,
  stagger = 70,
  onView = false,
}: SplitWordsProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });
  const playedRef = useRef(false);

  useEffect(() => {
    if (!onView) return;
    // Once the words have entered, keep them settled.
    if (inView) playedRef.current = true;
  }, [inView, onView]);

  const play = !onView || (reducedMotion ? true : inView || playedRef.current);

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      ref={onView ? (ref as React.Ref<HTMLHeadingElement>) : undefined}
      className={cn("split-words", play && "split-words--play", className)}
      style={{ ["--word-stagger" as string]: `${stagger}ms` }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="split-words__word">
          <span style={{ ["--i" as string]: index }}>{word}</span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
};

export default SplitWords;
