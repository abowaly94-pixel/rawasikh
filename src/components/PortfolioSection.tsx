import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import SectionHeading from "@/components/site/SectionHeading";
import Reveal from "@/components/site/Reveal";
import { portfolioFallbackImage } from "@/lib/portfolioImages";
import portfolioFallbackLibrary from "@/assets/blog-fallback-library.jpg";

const PortfolioSection = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const { data: items, isLoading } = useQuery({
    queryKey: ["portfolio-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !items || items.length === 0) return null;

  return (
    <section className="section-y relative overflow-hidden border-y border-border/70 bg-paper">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(80% 90% at 90% 0%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.12) 0%, transparent 65%)",
        }}
        aria-hidden
      />
      <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="shell relative">
        <SectionHeading
          title={t("portfolioSection.title")}
          highlight={t("portfolioSection.titleHighlight")}
          description={t("portfolioSection.description")}
          action={
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link to="/portfolio">
                {t("portfolioSection.viewAll")}
                <ArrowIcon className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const image = item.image_url || portfolioFallbackImage(item.title) || portfolioFallbackLibrary;
            return (
              <Reveal key={item.id} delay={Math.min(index, 4) * 60} className="h-full">
                <article className="surface-card group flex h-full flex-col overflow-hidden" data-cursor="link">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {image ? (
                      <>
                        <img
                          src={image}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/15"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-soft">
                        <Briefcase className="h-10 w-10 text-primary/35" aria-hidden />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-[15.5px] font-bold leading-7 text-foreground">
                      {item.title}
                    </h3>
                    {item.client && (
                      <p className="mt-1 text-[12px] font-semibold text-gold">{item.client}</p>
                    )}
                    {item.description && (
                      <p className="mt-3 flex-1 text-[13px] leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
