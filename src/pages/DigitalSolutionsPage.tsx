import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionHeading from "@/components/site/SectionHeading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  CloudCog,
  Code2,
  Globe,
  GraduationCap,
  Info,
  Layers,
  ListOrdered,
  Palette,
  Rocket,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";
import digitalPlatforms from "@/assets/digital/digital-platforms.jpg";
import digitalWebsites from "@/assets/digital/digital-websites.jpg";
import digitalApps from "@/assets/digital/digital-apps.jpg";
import digitalSystems from "@/assets/digital/digital-systems.jpg";
import digitalUiux from "@/assets/digital/digital-uiux.jpg";
import digitalCloud from "@/assets/digital/digital-cloud.jpg";

const WHATSAPP_NUMBER = "201033441054";

const serviceIcons = [GraduationCap, Globe, Smartphone, Layers, Palette, CloudCog];
const serviceImages = [
  digitalPlatforms,
  digitalWebsites,
  digitalApps,
  digitalSystems,
  digitalUiux,
  digitalCloud,
];
const processIcons = [Sparkles, Palette, Code2, Rocket];
const strengthIcons = [ShieldCheck, TrendingUp, Clock, Award];

const DigitalSolutionsPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  const services = t("digitalSolutionsPage.services", { returnObjects: true }) as Array<{
    title: string;
    description: string;
    tags?: string[];
  }>;
  const processSteps = t("digitalSolutionsPage.process", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;
  const strengths = t("digitalSolutionsPage.strengths", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;
  const heroBadges = t("digitalSolutionsPage.heroBadges", { returnObjects: true }) as string[];
  const faq = t("digitalSolutionsPage.faq", { returnObjects: true }) as Array<{ q: string; a: string }>;

  const buildWhatsappUrl = (serviceName?: string) => {
    const lines = [t("digitalSolutionsPage.whatsappIntro")];
    if (serviceName) lines[0] += `: ${serviceName}`;
    if (name.trim()) lines.push(`${t("digitalSolutionsPage.whatsappNameLabel")}: ${name.trim()}`);
    if (phone.trim()) lines.push(`${t("digitalSolutionsPage.whatsappPhoneLabel")}: ${phone.trim()}`);
    if (notes.trim()) lines.push(`${t("digitalSolutionsPage.whatsappNotesLabel")}: ${notes.trim()}`);
    const text = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  };

  const handleServiceCta = (serviceTitle: string) => {
    window.open(buildWhatsappUrl(serviceTitle), "_blank", "noopener,noreferrer");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("digitalSolutionsPage.formNameRequired"));
      return;
    }
    if (!phone.trim()) {
      toast.error(t("digitalSolutionsPage.formPhoneRequired"));
      return;
    }
    if (!service) {
      toast.error(t("digitalSolutionsPage.formServiceRequired"));
      return;
    }
    window.open(buildWhatsappUrl(service), "_blank", "noopener,noreferrer");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <Helmet>
        <title>{t("digitalSolutionsPage.seoTitle")}</title>
        <meta name="description" content={t("digitalSolutionsPage.seoDescription")} />
        <meta name="keywords" content={t("digitalSolutionsPage.seoKeywords")} />
        <link rel="canonical" href="https://rawasikheg.com/digital-solutions" />
        <meta property="og:title" content={t("digitalSolutionsPage.seoTitle")} />
        <meta property="og:description" content={t("digitalSolutionsPage.seoDescription")} />
        <meta property="og:type" content="website" />
      </Helmet>

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
        <div className="shell relative z-10 py-8 lg:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/70 px-4 py-1.5 text-xs font-bold text-gold-strong">
              <Code2 className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("digitalSolutionsPage.badge")}
            </span>
            <h1 className="mt-4 mb-4 text-balance text-3xl font-bold leading-[1.35] text-foreground md:text-5xl">
              {t("digitalSolutionsPage.title1")}{" "}
              <span className="text-primary">{t("digitalSolutionsPage.title2")}</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base font-medium leading-8 text-foreground/75 md:text-lg">
              {t("digitalSolutionsPage.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {t("digitalSolutionsPage.heroCta")}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl px-7"
                onClick={() => scrollTo("digital-solutions-list")}
              >
                {t("digitalSolutionsPage.heroSecondaryCta")}
              </Button>
            </div>

            {Array.isArray(heroBadges) && heroBadges.length > 0 && (
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 border-t border-border/70 pt-6 text-[13px] font-medium text-muted-foreground">
                {heroBadges.map((badge, index) => (
                  <li key={index} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gold" aria-hidden />
                    {badge}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="digital-solutions-list" className="section-y scroll-mt-24 bg-muted/30">
        <div className="shell">
          <SectionHeading
            align="center"
            title={t("digitalSolutionsPage.servicesSectionTitle")}
            description={t("digitalSolutionsPage.servicesSectionSubtitle")}
            className="mb-10"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((item, index) => {
              const Icon = serviceIcons[index] ?? Code2;
              const image = serviceImages[index];
              return (
                <article key={index} className="surface-card group flex h-full flex-col overflow-hidden">
                  {image && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={image}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-center contrast-[1.04] saturate-[0.94] transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, hsl(var(--card) / 0.92) 0%, hsl(var(--card) / 0.22) 18%, transparent 45%), radial-gradient(80% 60% at 100% 0%, hsl(var(--gold) / 0.16) 0%, transparent 60%)",
                        }}
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/20"
                        aria-hidden
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="relative z-10 -mt-9 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold ring-4 ring-card transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="font-display text-[13px] font-bold text-border nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[17px] font-bold text-foreground">{item.title}</h3>
                    <p className="mt-2 flex-1 text-[13.5px] leading-8 text-muted-foreground">{item.description}</p>

                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {item.tags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-5 self-start gap-2 px-0 font-semibold text-primary hover:bg-transparent hover:text-primary"
                      onClick={() => handleServiceCta(item.title)}
                    >
                      <Send className="h-4 w-4" />
                      {t("digitalSolutionsPage.servicesCta")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process / Methodology */}
      <section className="section-y border-y border-border/70 bg-paper">
        <div className="shell">
          <SectionHeading
            align="center"
            title={t("digitalSolutionsPage.processSectionTitle")}
            description={t("digitalSolutionsPage.processSectionSubtitle")}
            className="mb-10"
          />
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => {
              const Icon = processIcons[index] ?? Sparkles;
              return (
                <article key={index} className="surface-card relative flex flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-gold-soft px-3 py-1 font-display text-xs font-bold text-gold-strong nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="section-y bg-muted/30">
        <div className="shell">
          <SectionHeading align="center" title={t("digitalSolutionsPage.strengthsSectionTitle")} className="mb-8" />
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {strengths.map((strength, index) => {
              const Icon = strengthIcons[index] ?? ShieldCheck;
              return (
                <article key={index} className="surface-card p-6 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{strength.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-8 text-muted-foreground">{strength.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Request Form */}
      <section id="digital-solutions-form" className="section-y scroll-mt-24 bg-muted/30">
        <div className="shell">
          <div className="mx-auto max-w-xl">
            <SectionHeading
              align="center"
              title={t("digitalSolutionsPage.formSectionTitle")}
              description={t("digitalSolutionsPage.formSectionSubtitle")}
              className="mb-8"
            />
            <Card className="p-6 md:p-8">
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ds-name">{t("digitalSolutionsPage.formName")}</Label>
                  <Input
                    id="ds-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("digitalSolutionsPage.formNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-phone">{t("digitalSolutionsPage.formPhone")}</Label>
                  <Input
                    id="ds-phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-service">{t("digitalSolutionsPage.formService")}</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger id="ds-service">
                      <SelectValue placeholder={t("digitalSolutionsPage.formServicePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s, index) => (
                        <SelectItem key={index} value={s.title}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-notes">{t("digitalSolutionsPage.formNotes")}</Label>
                  <Textarea
                    id="ds-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("digitalSolutionsPage.formNotesPlaceholder")}
                    rows={4}
                  />
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ListOrdered className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("digitalSolutionsPage.formAttachmentsHint")}
                </p>
                <Button type="submit" size="lg" className="w-full gap-2 rounded-xl">
                  <Send className="h-4 w-4" />
                  {t("digitalSolutionsPage.formSubmit")}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ + Guarantee */}
      <section className="section-y">
        <div className="shell">
          <div className="mx-auto max-w-3xl">
            <SectionHeading align="center" title={t("digitalSolutionsPage.faqSectionTitle")} className="mb-8" />
            <Accordion type="single" collapsible className="space-y-3">
              {faq.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-xl border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-start font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-[13.5px] leading-8 text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Alert className="mt-8 border-primary/25 bg-primary/5">
              <Info className="h-5 w-5 text-primary" />
              <AlertTitle className="font-bold">{t("digitalSolutionsPage.disclaimerTitle")}</AlertTitle>
              <AlertDescription className="text-[13.5px] leading-8 text-muted-foreground">
                {t("digitalSolutionsPage.disclaimerText")}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-12 md:pb-16">
        <div className="shell">
          <div className="panel-ink px-6 py-12 text-center shadow-xl sm:px-12">
            <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <div
              className="pointer-events-none absolute -bottom-28 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "hsl(var(--gold) / 0.20)" }}
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-[26px] font-bold leading-tight text-white sm:text-[34px]">
                {t("digitalSolutionsPage.ctaFinalTitle")}
              </h2>
              <div className="divider-gold mx-auto mt-4 h-px w-40" aria-hidden />
              <p className="mt-4 text-[14.5px] leading-8 text-white/70">
                {t("digitalSolutionsPage.ctaFinalSubtitle")}
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-6 gap-2 rounded-xl px-7">
                <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {t("digitalSolutionsPage.ctaFinalButton")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DigitalSolutionsPage;

