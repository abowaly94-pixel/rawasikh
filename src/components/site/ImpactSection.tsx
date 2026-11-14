import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";

import Reveal from "@/components/site/Reveal";
import StatsGrid from "@/components/site/StatsGrid";
import { usePlatformCounts } from "@/hooks/usePlatformCounts";
import impactCourses from "@/assets/impact/impact-courses.jpg";
import impactTrainers from "@/assets/impact/impact-trainers.jpg";
import impactLevels from "@/assets/impact/impact-levels.jpg";
import impactArticles from "@/assets/impact/impact-articles.jpg";

const ImpactSection = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const { data, isLoading } = usePlatformCounts();

  const stats = [
    { value: data?.courses ?? 0, label: t("impact.courses"), suffix: "+", image: impactCourses },
    { value: data?.teachers ?? 0, label: t("impact.teachers"), suffix: "+", image: impactTrainers },
    { value: data?.levels ?? 0, label: t("impact.levels"), suffix: "+", image: impactLevels },
    { value: data?.articles ?? 0, label: t("impact.articles"), suffix: "+", image: impactArticles },
  ];

  return (
    <section className="relative overflow-hidden border-b border-border/70 bg-paper">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(70% 90% at 100% 0%, hsl(var(--gold) / 0.10) 0%, transparent 60%)",
        }}
        aria-hidden
      />
      <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden />

      <div className="shell relative py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <Reveal>
            <div>
              <h2 className="max-w-md text-[26px] font-bold leading-[1.45] text-foreground sm:text-[32px]">
                {t("impact.title")}
                <span className="text-gradient-brand"> {t("impact.titleHighlight")}</span>
              </h2>

              <div className="rule-gold mt-4" aria-hidden />

              <p className="mt-4 max-w-md text-[13.5px] leading-8 text-muted-foreground">
                {t("impact.description")}
              </p>

              <Link
                to="/about"
                className="group mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"
              >
                <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-primary">
                  {t("impact.viewAll")}
                </span>
                <ArrowIcon
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </Reveal>

          <div>
            <StatsGrid stats={stats} loading={isLoading} />
            <p className="mt-3 text-[11px] text-muted-foreground/70">{t("impact.note")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
