import { useId } from "react";
import { cn } from "@/lib/utils";
import CountUp from "@/components/site/CountUp";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface MetricRingProps {
  value: number;
  label: string;
  tone?: "light" | "dark";
  className?: string;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MetricRing = ({ value, label, tone = "light", className }: MetricRingProps) => {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reducedMotion = usePrefersReducedMotion();
  const dark = tone === "dark";
  const gradientId = `metric-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const progress = inView ? value : 0;
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div
      ref={ref}
      className={cn("relative h-[132px] w-[132px]", className)}
      role="img"
      aria-label={`${label}: ${value}%`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
            <stop offset="100%" style={{ stopColor: "hsl(var(--gold))" }} />
          </linearGradient>
        </defs>

        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={dark ? "hsl(0 0% 100% / 0.14)" : "hsl(var(--border))"}
          strokeWidth="5"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: reducedMotion
              ? "none"
              : "stroke-dashoffset 1.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={value}
          suffix="%"
          duration={1350}
          className={cn(
            "font-display text-[27px] font-bold leading-none",
            dark ? "text-white" : "text-foreground",
          )}
        />
      </div>
    </div>
  );
};

export default MetricRing;
