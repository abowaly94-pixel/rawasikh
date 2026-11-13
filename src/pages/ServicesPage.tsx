import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { ArrowLeft, ArrowRight, Briefcase, Code2, GraduationCap, FileText, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import serviceTraining from "@/assets/services/service-training.jpg";
import serviceEducation from "@/assets/services/service-education.jpg";
import serviceAcademic from "@/assets/services/service-academic.jpg";
import serviceTranslation from "@/assets/services/service-translation.jpg";
import serviceDigitalSolutions from "@/assets/services/service-digital-solutions.jpg";

const ServicesPage = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 300);
      }
    }
  }, [location.hash]);

  const ids = ["training", "education", "academic", "translation", "digital-solutions"];
  const icons = [Briefcase, GraduationCap, FileText, Languages, Code2];
  const images = [
    serviceTraining,
    serviceEducation,
    serviceAcademic,
    serviceTranslation,
    serviceDigitalSolutions,
  ];
  const links: Record<string, string> = {
    academic: "/academic-services",
    "digital-solutions": "/digital-solutions",
  };
  const items = t("servicesPage.items", { returnObjects: true }) as Array<{
    title: string;
    tags: string[];
    details: string;
  }>;
  const services = items.map((item, i) => ({
    ...item,
    id: ids[i] ?? `service-${i}`,
    icon: icons[i] ?? Briefcase,
    image: images[i] ?? serviceTraining,
    href: links[ids[i] ?? ""],
  }));

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="خدماتنا التعليمية والتدريبية"
        description="خدمات رواسخ: تدريب احترافي، تعليم وتنمية مهارات، خدمات أكاديمية وترجمة — حلول متكاملة للأفراد والمؤسسات."
        path="/services"
        keywords={["خدمات تدريبية", "خدمات أكاديمية", "ترجمة", "تطوير مهني", "رواسخ"]}
      />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70 bg-paper">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(80% 90% at 90% 0%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.12) 0%, transparent 65%)",
          }}
          aria-hidden
        />
        <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="shell py-6 lg:py-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-balance text-3xl leading-[1.25] md:text-5xl font-bold text-foreground mb-4">
              {t("servicesPage.title1")} <span className="text-primary">{t("servicesPage.title2")}</span>
            </h1>
            <p className="mx-auto max-w-xl text-base leading-8 text-foreground/70 font-medium md:text-lg">
              {t("servicesPage.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-8 lg:py-12">
        <div className="shell">
          <div className="grid gap-6 sm:grid-cols-2">
            {services.map((service, index) => {
              const isFeaturedWide = index === 4;
              return (
                <div
                  key={index}
                  id={service.id}
                  className={cn("h-full scroll-mt-24", isFeaturedWide && "sm:col-span-2")}
                >
                  <article
                    className={cn(
                      "surface-card group flex h-full flex-col overflow-hidden",
                      isFeaturedWide && "lg:grid lg:grid-cols-[1.08fr_1fr] lg:items-stretch",
                    )}
                  >
                    <div
                      className={cn(
                        "relative aspect-[16/10] overflow-hidden bg-muted",
                        isFeaturedWide && "lg:aspect-auto lg:min-h-[320px]",
                      )}
                    >
                      <img
                        src={service.image}
                        alt={service.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-center contrast-[1.04] saturate-[0.94] transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                      />
                      {/* graded so all service photographs read as one cohesive set */}
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, hsl(var(--card) / 0.94) 0%, hsl(var(--card) / 0.28) 16%, transparent 40%), radial-gradient(80% 60% at 100% 0%, hsl(var(--gold) / 0.16) 0%, transparent 60%)",
                        }}
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/20"
                        aria-hidden
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-6 pt-5 lg:p-7">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                            <service.icon className="h-6 w-6" aria-hidden />
                          </span>
                          <span className="font-display text-[13px] font-bold text-border nums">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <h2 className="mt-5 text-[17px] font-bold text-foreground lg:text-[19px]">
                          {service.href ? (
                            <Link to={service.href} className="transition-colors hover:text-primary">
                              {service.title}
                            </Link>
                          ) : (
                            service.title
                          )}
                        </h2>
                        <p className="mt-2 text-[13.5px] leading-8 text-muted-foreground">{service.details}</p>
                      </div>
                      <div className="mt-5">
                        <div className="flex flex-wrap gap-2">
                          {service.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {service.href && (
                          <Link
                            to={service.href}
                            className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary transition-colors hover:text-primary/80"
                          >
                            {t("services.exploreService")}
                            <ArrowIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" aria-hidden />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
