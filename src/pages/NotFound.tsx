import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Compass, Home, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const quickLinks = [
  { to: "/courses", label: "الكورسات", icon: BookOpen },
  { to: "/level-assessment", label: "تقييم المستوى", icon: Compass },
  { to: "/contact", label: "تواصل معنا", icon: Mail },
];

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="الصفحة غير موجودة"
        description="الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تصفح الكورسات والخدمات على منصة رواسخ."
        path={location.pathname}
        noIndex
      />
      <Header />

      <main className="relative flex flex-1 items-center overflow-hidden py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(70% 60% at 80% 10%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(60% 50% at 10% 90%, hsl(var(--gold) / 0.14) 0%, transparent 65%)",
          }}
          aria-hidden
        />
        <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />

        <div className="shell relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-[72px] font-bold leading-none text-gradient-brand sm:text-[96px] nums">
              404
            </p>

            <h1 className="mt-4 text-[26px] font-bold leading-tight text-foreground sm:text-[32px]">
              {t("common.notFoundMessage")}
            </h1>
            <div className="rule-gold mx-auto mt-5" aria-hidden />

            <p className="mx-auto mt-5 max-w-lg text-[14.5px] leading-8 text-muted-foreground">
              يبدو أن الرابط الذي فتحته غير صحيح أو أن الصفحة تم نقلها. يمكنك العودة للرئيسية أو
              البدء من أحد المسارات التالية.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2 rounded-xl px-6">
                <Link to="/">
                  <Home className="h-4 w-4" aria-hidden />
                  {t("common.backToHome")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 rounded-xl px-6">
                <Link to="/courses">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  تصفح الكورسات
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-start text-[13.5px] font-semibold text-foreground/80 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
                >
                  <span className="inline-flex items-center gap-2">
                    <link.icon className="h-4 w-4 text-gold" aria-hidden />
                    {link.label}
                  </span>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
