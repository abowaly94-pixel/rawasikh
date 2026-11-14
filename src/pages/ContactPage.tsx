import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Facebook,
  Headset,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/site/SectionHeading";
import Reveal from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PHONE_DISPLAY = "01033441054";
const PHONE_HREF = "tel:+201033441054";
const WHATSAPP_HREF = "https://wa.me/201033441054";
const EMAIL = "info@rawasikh.com";
const MAP_HREF = "https://www.google.com/maps/search/?api=1&query=Nasr+City+Cairo+El+Tayaran+Street";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const XIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15z" />
  </svg>
);

const YouTubeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const SnapchatIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
  </svg>
);

const ContactPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [form, setForm] = useState({ name: "", phone: "", topic: "", message: "" });

  const topics = t("contactExtras.topics", { returnObjects: true });
  const topicOptions = Array.isArray(topics) ? (topics as string[]) : [];

  const channels = [
    {
      icon: <Phone className="h-6 w-6" aria-hidden />,
      label: t("contactPage.phone"),
      value: PHONE_DISPLAY,
      href: PHONE_HREF,
      external: false,
      ltr: true,
    },
    {
      icon: <WhatsAppIcon className="h-6 w-6" />,
      label: t("contactPage.whatsapp"),
      value: "+20 10 33441054",
      href: WHATSAPP_HREF,
      external: true,
      ltr: true,
    },
    {
      icon: <Mail className="h-6 w-6" aria-hidden />,
      label: t("contactPage.email"),
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      external: false,
      ltr: true,
    },
    {
      icon: <MapPin className="h-6 w-6" aria-hidden />,
      label: t("contactPage.address"),
      value: t("contactPage.addressValue"),
      href: MAP_HREF,
      external: true,
      ltr: false,
    },
  ];

  const socialLinks = [
    {
      icon: <Facebook className="h-5 w-5" aria-hidden />,
      label: t("contactPage.facebook"),
      href: "https://www.facebook.com/rawasikheg/",
    },
    {
      icon: <Instagram className="h-5 w-5" aria-hidden />,
      label: t("contactPage.instagram"),
      href: "https://www.instagram.com/rawasikheg/",
    },
    { icon: <XIcon className="h-5 w-5" />, label: t("contactPage.twitter"), href: "https://x.com/rawasikheg" },
    {
      icon: <TikTokIcon className="h-5 w-5" />,
      label: t("contactPage.tiktok"),
      href: "https://www.tiktok.com/@rawasikheg",
    },
    {
      icon: <YouTubeIcon className="h-5 w-5" />,
      label: t("contactPage.youtube"),
      href: "https://www.youtube.com/@rawasikheg",
    },
    {
      icon: <SnapchatIcon className="h-5 w-5" />,
      label: t("contactPage.snapchat"),
      href: "https://www.snapchat.com/add/rawasikheg",
    },
  ];

  const facts = [
    { icon: <Clock className="h-4 w-4 text-gold" aria-hidden />, label: t("contactExtras.factResponse") },
    { icon: <CalendarDays className="h-4 w-4 text-gold" aria-hidden />, label: t("contactExtras.factHours") },
    { icon: <MapPin className="h-4 w-4 text-gold" aria-hidden />, label: t("contactExtras.factPlace") },
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error(t("contactExtras.formNameRequired"));
      return;
    }
    if (!form.message.trim()) {
      toast.error(t("contactExtras.formMessageRequired"));
      return;
    }

    const lines = [
      `${t("contactExtras.formName")}: ${form.name.trim()}`,
      form.phone.trim() ? `${t("contactExtras.formPhone")}: ${form.phone.trim()}` : "",
      form.topic ? `${t("contactExtras.formTopic")}: ${form.topic}` : "",
      "",
      form.message.trim(),
    ].filter(Boolean);

    window.open(
      `${WHATSAPP_HREF}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="تواصل معنا"
        description="تواصل مع فريق رواسخ للاستفسار عن الكورسات والخدمات الأكاديمية والترجمة — هاتف، بريد إلكتروني، واتساب، ونموذج مباشر."
        path="/contact"
        keywords={["تواصل مع رواسخ", "خدمة العملاء", "استفسار", "دعم فني"]}
      />
      <Header />

      <main>
        {/* ================= HERO ================= */}
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

          <div className="shell relative z-10 py-10 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/70 px-4 py-1.5 text-xs font-bold text-gold-strong">
                  <Headset className="h-3.5 w-3.5 text-gold" aria-hidden />
                  {t("contactExtras.eyebrow")}
                </span>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.45] text-foreground md:text-5xl">
                  {t("contactPage.title")}
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <div className="rule-gold mx-auto" aria-hidden />
                <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-foreground/70 md:text-lg">
                  {t("contactPage.subtitle")}
                </p>
              </Reveal>

              <Reveal delay={200}>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                    <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon className="h-4 w-4" />
                      {t("contactPage.ctaWhatsapp")}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="gap-2 rounded-xl px-7">
                    <a href={PHONE_HREF}>
                      <Phone className="h-4 w-4" aria-hidden />
                      {t("contactExtras.callNow")}
                    </a>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={260}>
                <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-border/70 pt-6 text-[13px] font-medium text-muted-foreground">
                  {facts.map((fact) => (
                    <li key={fact.label} className="inline-flex items-center gap-2">
                      {fact.icon}
                      {fact.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= CHANNELS ================= */}
        <section className="section-y bg-background">
          <div className="shell">
            <SectionHeading
              align="center"
              title={t("contactExtras.channelsTitle")}
              highlight={t("contactExtras.channelsHighlight")}
              description={t("contactExtras.channelsDesc")}
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {channels.map((channel, index) => (
                <Reveal key={channel.label} delay={index * 60} className="h-full">
                  <a
                    href={channel.href}
                    target={channel.external ? "_blank" : undefined}
                    rel={channel.external ? "noopener noreferrer" : undefined}
                    className="surface-card group flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        {channel.icon}
                      </span>
                      <span className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground/40 nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-5 text-[15px] font-bold text-foreground">{channel.label}</h3>
                    <p
                      className="mt-1.5 flex-1 text-[13px] leading-7 text-muted-foreground"
                      dir={channel.ltr ? "ltr" : undefined}
                      style={channel.ltr && isRtl ? { textAlign: "right" } : undefined}
                    >
                      {channel.value}
                    </p>

                    <span className="mt-5 block" aria-hidden>
                      <span className="block h-px w-8 bg-gold/60 transition-all duration-500 group-hover:w-14" />
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= HOURS + QUICK MESSAGE ================= */}
        <section className="section-y border-y border-border/70 bg-paper">
          <div className="shell">
            <SectionHeading
              title={t("contactExtras.formTitle")}
              highlight={t("contactExtras.formHighlight")}
              description={t("contactExtras.formDesc")}
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
              <Reveal className="order-2 h-full lg:order-1">
                <aside className="panel-ink flex h-full flex-col p-7 sm:p-9">
                  <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
                  <div
                    className="pointer-events-none absolute -top-20 end-0 h-56 w-56 rounded-full blur-3xl"
                    style={{ background: "hsl(var(--primary) / 0.45)" }}
                    aria-hidden
                  />

                  <div className="relative flex h-full flex-col">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-gold">
                      <Clock className="h-6 w-6" aria-hidden />
                    </span>

                    <h3 className="mt-6 text-[22px] font-bold text-white sm:text-[26px]">
                      {t("contactExtras.hoursTitle")}
                    </h3>
                    <p className="mt-3 text-[13.5px] leading-8 text-white/65">
                      {t("contactExtras.hoursDesc")}
                    </p>

                    <dl className="mt-6 space-y-3 border-t border-white/10 pt-6">
                      <div className="flex items-center justify-between gap-4 text-[13px]">
                        <dt className="text-white/60">{t("contactExtras.hoursWeekdays")}</dt>
                        <dd className="font-semibold text-white nums" dir="ltr">
                          {t("contactExtras.hoursWeekdaysValue")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[13px]">
                        <dt className="text-white/60">{t("contactExtras.hoursFriday")}</dt>
                        <dd className="font-semibold text-gold">{t("contactExtras.hoursFridayValue")}</dd>
                      </div>
                    </dl>

                    <div className="mt-auto space-y-3 pt-7">
                      <a
                        href={PHONE_HREF}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/80 transition-colors hover:border-gold/40 hover:text-white"
                      >
                        <Phone className="h-4 w-4 text-gold" aria-hidden />
                        <span className="nums" dir="ltr">
                          {PHONE_DISPLAY}
                        </span>
                      </a>
                      <a
                        href={`mailto:${EMAIL}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/80 transition-colors hover:border-gold/40 hover:text-white"
                      >
                        <Mail className="h-4 w-4 text-gold" aria-hidden />
                        <span dir="ltr">{EMAIL}</span>
                      </a>
                    </div>
                  </div>
                </aside>
              </Reveal>

              <Reveal delay={90} className="order-1 h-full lg:order-2">
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">{t("contactExtras.formName")}</Label>
                        <Input
                          id="contact-name"
                          value={form.name}
                          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder={t("contactExtras.formNamePlaceholder")}
                          autoComplete="name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">{t("contactExtras.formPhone")}</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          dir="ltr"
                          value={form.phone}
                          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder="01xxxxxxxxx"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-topic">{t("contactExtras.formTopic")}</Label>
                      <Select
                        value={form.topic}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, topic: value }))}
                      >
                        <SelectTrigger id="contact-topic">
                          <SelectValue placeholder={t("contactExtras.formTopicPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {topicOptions.map((topic) => (
                            <SelectItem key={topic} value={topic}>
                              {topic}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-message">{t("contactExtras.formMessage")}</Label>
                      <Textarea
                        id="contact-message"
                        rows={5}
                        value={form.message}
                        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                        placeholder={t("contactExtras.formMessagePlaceholder")}
                      />
                    </div>

                    <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                      {t("contactExtras.formHint")}
                    </p>

                    <Button type="submit" size="lg" className="w-full gap-2 rounded-xl">
                      <Send className="h-4 w-4" aria-hidden />
                      {t("contactExtras.formSubmit")}
                    </Button>
                  </form>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= SOCIAL ================= */}
        <section className="section-y bg-background">
          <div className="shell">
            <SectionHeading
              align="center"
              title={t("contactExtras.socialTitle")}
              highlight={t("contactExtras.socialHighlight")}
              description={t("contactExtras.socialDesc")}
            />

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {socialLinks.map((link, index) => (
                <Reveal key={link.label} delay={index * 45} variant="pop">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-3 text-[13.5px] font-semibold text-foreground/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
                  >
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">
                      {link.icon}
                    </span>
                    {link.label}
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CLOSING BAND ================= */}
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
                    {t("contactExtras.closingTitle")}
                  </h2>
                  <div className="divider-gold mx-auto h-px w-40" aria-hidden />
                  <p className="mt-4 text-[14.5px] leading-8 text-white/70">
                    {t("contactExtras.closingDesc")}
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Button asChild size="lg" variant="secondary" className="gap-2 rounded-xl px-7">
                      <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcon className="h-4 w-4" />
                        {t("contactPage.ctaWhatsapp")}
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="rounded-xl border-white/30 bg-transparent px-7 text-white hover:bg-white hover:text-ink"
                    >
                      <a href={PHONE_HREF}>{t("contactExtras.closingCall")}</a>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
