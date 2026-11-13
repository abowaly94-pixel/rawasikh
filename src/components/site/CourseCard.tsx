import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Star } from "lucide-react";
import SmartImage from "@/components/site/SmartImage";
import { CARD_IMAGE_SIZES } from "@/lib/image";
import { cn } from "@/lib/utils";

export interface CourseCardProps {
  href: string;
  title: string;
  description?: string | null;
  image?: string | null;
  featured?: boolean;
  isFree?: boolean;
  priceText: string;
  /** Optional hint such as "لكل مستوى" for multi-level courses. */
  priceHint?: string;
  category?: string | null;
  hours?: string;
  lessonsLabel?: string;
  rating?: number | null;
  featuredLabel?: string;
  freeLabel?: string;
  priceLabel?: string;
  detailsLabel?: string;
  isRtl?: boolean;
  className?: string;
}

/** Deterministic fallback cover so a missing thumbnail never leaves a void. */
const fallbacks = [
  "from-[#1F45AD] via-[#16327F] to-[#0B1B33]",
  "from-[#16327F] via-[#1F45AD] to-[#3B6BE0]",
  "from-[#0B1B33] via-[#16327F] to-[#C08A2E]",
  "from-[#1F45AD] via-[#3B6BE0] to-[#7FA0EE]",
];

const hashOf = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 100000;
  }
  return h;
};

const CourseCard = ({
  href,
  title,
  description,
  image,
  featured,
  isFree,
  priceText,
  priceHint,
  category,
  hours,
  lessonsLabel,
  rating,
  featuredLabel,
  freeLabel,
  priceLabel,
  detailsLabel,
  isRtl = true,
  className,
}: CourseCardProps) => {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const gradient = fallbacks[hashOf(title) % fallbacks.length];
  const initial = title?.trim().charAt(0) || "ر";

  return (
    <Link
      to={href}
      data-cursor="link"
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-xs transition-all duration-500",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative aspect-video w-full overflow-hidden">
        {image ? (
          <SmartImage
            src={image}
            alt={title}
            width={640}
            height={360}
            sizes={CARD_IMAGE_SIZES}
            widths={[320, 480, 640, 800, 1024]}
            quality={72}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className={cn(
              "relative flex h-full w-full items-center justify-center bg-gradient-to-br",
              gradient,
            )}
          >
            <span className="pattern-lattice-light absolute inset-0 opacity-[0.14]" aria-hidden />
            <span className="relative font-display text-5xl font-bold text-white/90">
              {initial}
            </span>
          </div>
        )}

        {/* Legibility scrim for the chips that follow */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70"
          aria-hidden
        />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {featuredLabel}
            </span>
          ) : (
            <span />
          )}
          {isFree && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
              {freeLabel}
            </span>
          )}
        </div>

        {category && (
          <span className="absolute inset-x-3 bottom-3 w-fit max-w-[85%] truncate whitespace-nowrap rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {category}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[16.5px] font-bold leading-[1.6] text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        {description && (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-7 text-muted-foreground">
            {description}
          </p>
        )}

        {(hours || lessonsLabel || rating) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            {hours && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <span className="nums">{hours}</span>
              </span>
            )}
            {lessonsLabel && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                <span className="nums">{lessonsLabel}</span>
              </span>
            )}
            {typeof rating === "number" && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                <span className="nums">{rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/80 pt-4">
          <div className="min-w-0">
            {priceLabel && (
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {priceLabel}
              </span>
            )}
            <span className="nums block truncate text-[17px] font-bold text-primary">
              {priceText}
            </span>
            {priceHint && (
              <span className="block text-[11px] text-muted-foreground">
                {priceHint}
              </span>
            )}
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-semibold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
            {detailsLabel}
            <Arrow className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
