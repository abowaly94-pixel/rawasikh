import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Gauge,
  Headset,
  Layers,
  Library,
  Quote,
  TrendingUp,
} from "lucide-react";

import SectionHeading from "@/components/site/SectionHeading";
import Reveal from "@/components/site/Reveal";
import ScrollScrub from "@/components/site/ScrollScrub";
import expertTeacher from "@/assets/expert-teacher.jpg";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const LearningExperience = () => {
  const { t } = useTranslation();

  const features: Feature[] = [
    {
      icon: Layers,
      title: t("experience.hybridTitle"),
      description: t("experience.hybridDesc"),
    },
    {
      icon: Gauge,
      title: t("experience.assessmentTitle"),
      description: t("experience.assessmentDesc"),
    },
    {
      icon: BadgeCheck,
      title: t("experience.certificateTitle"),
      description: t("experience.certificateDesc"),
    },
    {
      icon: TrendingUp,
      title: t("experience.progressTitle"),
      description: t("experience.progressDesc"),
    },
    {
      icon: Library,
      title: t("experience.libraryTitle"),
      description: t("experience.libraryDesc"),
    },
    {
      icon: Headset,
      title: t("experience.supportTitle"),
      description: t("experience.supportDesc"),
    },
  ];

  return (
    <section className="section-y bg-background">
      <div className="shell">
        <SectionHeading
          title={t("experience.title")}
          highlight={t("experience.titleHighlight")}
          description={t("experience.description")}
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <Reveal className="h-full">
            <figure className="relative h-full min-h-[420px] overflow-hidden rounded-3xl bg-ink">
              <img
                src={expertTeacher}
                alt=""
                width={512}
                height={512}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top opacity-75"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10"
                aria-hidden
              />
              <div className="pattern-lattice-light absolute inset-0 opacity-[0.06]" aria-hidden />

              <div className="relative flex h-full flex-col justify-end p-7 text-white sm:p-8">
                <Quote className="h-8 w-8 text-gold/80" aria-hidden />
                <blockquote className="mt-4 font-display text-[20px] font-semibold leading-[1.7] text-white/95 sm:text-[22px]">
                  {t("experience.quote")}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2 text-[12px] text-white/55">
                  <span className="h-px w-8 bg-gold/60" aria-hidden />
                  {t("experience.quoteBy")}
                </figcaption>
              </div>
            </figure>
          </Reveal>

          <ScrollScrub
            className="grid gap-4 sm:grid-cols-2"
            y={68}
            skew={4}
            rotateX={10}
            rotateY={3}
            depth={12}
            scale={0.975}
            stagger={0.28}
            parallax={2}
            start="top 92%"
            end="top 60%"
          >
            {features.map((feature, index) => (
              <div key={feature.title} className="h-full">
                <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <feature.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground/50 nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[14.5px] font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              </div>
            ))}
          </ScrollScrub>
        </div>
      </div>
    </section>
  );
};

export default LearningExperience;
