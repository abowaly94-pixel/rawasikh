import { cn } from "@/lib/utils";
import CountUp from "@/components/site/CountUp";
import Reveal from "@/components/site/Reveal";

export interface StatItem {
  value: number;
  label: string;
  suffix?: string;
  image?: string;
  imageAlt?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  loading?: boolean;
  className?: string;
}

/**
 * Editorial stat grid: expressive imagery on top, numbers and hairlines below.
 * Colors come from theme-flipping tokens so dark mode stays readable.
 */
const StatsGrid = ({ stats, loading = false, className }: StatsGridProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:rounded-3xl",
        className,
      )}
      aria-busy={loading}
    >
      {stats.map((stat, index) => (
        <Reveal
          key={stat.label}
          delay={Math.min(index, 3) * 70}
          className={cn(
            "group relative",
            // Hairline dividers drawn with borders, not gaps, so they stay crisp.
            index % 2 === 1 && "border-s border-border",
            index >= 2 && "border-t border-border",
          )}
        >
          {stat.image && (
            <div className="relative aspect-[3/2] overflow-hidden">
              <img
                src={stat.image}
                alt={stat.imageAlt ?? ""}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/15"
                aria-hidden
              />
              <span
                className="absolute start-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-white/90 backdrop-blur-sm"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          )}

          <div className="p-5 sm:p-6">
            {!stat.image && (
              <span
                className="block text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            )}

            <div
              className={cn(
                "flex items-baseline gap-0.5 font-display text-[34px] font-bold leading-none tracking-tight text-foreground sm:text-[40px]",
                stat.image ? "mt-0" : "mt-3",
              )}
            >
              {loading ? (
                <span className="inline-block h-[34px] w-16 animate-pulse rounded bg-border sm:h-[40px]" />
              ) : (
                <CountUp value={stat.value} suffix={stat.suffix} />
              )}
            </div>

            <p className="mt-3 max-w-[15rem] text-[12px] leading-6 text-muted-foreground sm:text-[12.5px]">
              {stat.label}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
};

export default StatsGrid;