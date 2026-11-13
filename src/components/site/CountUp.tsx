import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

/**
 * Formats with Latin digits to match prices and dates across the site.
 * Screen readers get the final value immediately; only the visual number
 * animates, so assistive technology never announces every frame.
 */
const CountUp = ({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
  delay = 0,
  className,
}: CountUpProps) => {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const current = useCountUp({ end: value, start: inView, duration, delay });

  const formatted = useMemo(
    () => new Intl.NumberFormat("en-US").format(current),
    [current],
  );
  const finalValue = useMemo(
    () => `${prefix}${new Intl.NumberFormat("en-US").format(value)}${suffix}`,
    [prefix, suffix, value],
  );

  return (
    <span ref={ref} className={cn("relative inline-flex items-baseline", className)}>
      <span className="sr-only">{finalValue}</span>
      {/* The number run is isolated LTR so "+" stays on the trailing side in RTL copy. */}
      <span aria-hidden dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {prefix}
        {formatted}
        {suffix}
      </span>
    </span>
  );
};

export default CountUp;
