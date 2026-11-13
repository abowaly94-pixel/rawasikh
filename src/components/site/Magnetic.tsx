import type { ElementType, ReactNode } from "react";

import useMagnetic from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Fraction of the cursor-to-centre delta the element follows (default 0.2). */
  pull?: number;
  /** Element to render; defaults to a span so it can wrap buttons/links. */
  as?: ElementType;
}

/**
 * Wrapper that gives any control a magnetic pull toward the cursor and marks it
 * for the custom cursor's button state. See hooks/useMagnetic.ts.
 */
const Magnetic = ({ children, className, pull = 0.2, as: Tag = "span" }: MagneticProps) => {
  const ref = useMagnetic<HTMLElement>({ pull });

  return (
    <Tag ref={ref} className={cn("magnetic", className)} data-cursor="button">
      <span data-magnetic-inner className="magnetic__inner">
        {children}
      </span>
    </Tag>
  );
};

export default Magnetic;
