import { cn } from "@/lib/utils";
import Reveal from "@/components/site/Reveal";
import SplitWords from "@/components/site/SplitWords";

interface SectionHeadingProps {
  title: string;
  highlight?: string;
  description?: string;
  /** Where the text block sits; use "center" for widened hero-style sections. */
  align?: "start" | "center";
  /** "light" on paper/white, "dark" on ink panels. */
  tone?: "light" | "dark";
  /** Optional action rendered on the trailing edge on desktop. */
  action?: React.ReactNode;
  className?: string;
}

const SectionHeading = ({
  title,
  highlight,
  description,
  align = "start",
  tone = "light",
  action,
  className,
}: SectionHeadingProps) => {
  const centered = align === "center";
  const dark = tone === "dark";

  return (
    <Reveal>
      <div
        className={cn(
          "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
          centered && "md:flex-col md:items-center",
          className,
        )}
      >
        <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
          <h2
            className={cn(
              "pb-2 text-[26px] font-bold leading-[1.6] sm:text-[32px] lg:text-[38px]",
              dark ? "text-white" : "text-foreground",
            )}
          >
            <SplitWords text={title} onView stagger={65} />
            {highlight && (
              <>
                {" "}
                <SplitWords
                  as="span"
                  onView
                  stagger={65}
                  className={dark ? "text-gold" : "text-gradient-brand"}
                  text={highlight}
                />
              </>
            )}
          </h2>

          <div
            className={cn(
              "rule-gold mt-4",
              centered && "mx-auto",
              dark && "opacity-90",
            )}
            aria-hidden
          />

          {description && (
            <p
              className={cn(
                "mt-4 text-[15px] leading-8 sm:text-base",
                dark ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0 md:pb-1">{action}</div>}
      </div>
    </Reveal>
  );
};

export default SectionHeading;
