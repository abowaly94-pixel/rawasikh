import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Reveal from "@/components/site/Reveal";

const CtaBand = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section className="bg-background pb-12 md:pb-16">
      <div className="shell">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-xl sm:px-12"
            style={{
              background:
                "radial-gradient(120% 150% at 50% 0%, hsl(var(--brand-deep)) 0%, hsl(var(--ink)) 68%)",
            }}
          >
            <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <div
              className="pointer-events-none absolute -bottom-28 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "hsl(var(--gold) / 0.20)" }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-white/[0.07]" aria-hidden />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-[26px] font-bold leading-[1.4] text-white sm:text-[34px]">
                {t("cta.bandTitle")}
              </h2>
              <div className="divider-gold mx-auto h-px w-40" aria-hidden />
              <p className="mt-4 text-[14.5px] leading-8 text-white/70">
                {t("cta.description")}
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary" className="gap-2 rounded-xl px-7">
                  <Link to="/contact">
                    {t("cta.contactUs")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-white/30 bg-transparent px-7 text-white hover:bg-white hover:text-ink"
                >
                  <a href="https://wa.me/201033441054" target="_blank" rel="noopener noreferrer">
                    {t("cta.whatsapp")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CtaBand;
