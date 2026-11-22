import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import rawasikhLogo from "@/assets/rawasikh-logo.png";

const socials = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/rawasikheg/",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/rawasikheg/",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0Z",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@rawasikheg",
    path: "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.01 3.01 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z",
  },
  {
    name: "X",
    url: "https://x.com/rawasikheg",
    path: "M18.9 2H22l-6.77 7.74L23.2 22h-6.5l-5.09-6.65L5.8 22H2.66l7.24-8.28L2 2h6.66l4.6 6.08L18.9 2Zm-1.13 18h1.72L7.4 3.9H5.56L17.77 20Z",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@rawasikheg",
    path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15Z",
  },
  {
    name: "Snapchat",
    url: "https://www.snapchat.com/add/rawasikheg",
    path: "M12.2.79c.99 0 4.35.28 5.93 3.82.53 1.2.4 3.22.3 4.85v.06c-.02.18-.03.35-.04.51.08.05.2.09.4.09.3-.02.66-.12 1.04-.3.16-.09.34-.1.46-.1.18 0 .36.03.51.09.45.15.73.48.73.84.02.45-.39.84-1.21 1.17-.09.03-.21.07-.34.12-.45.13-1.14.36-1.34.81-.09.22-.06.52.12.87l.02.02c.06.13 1.52 3.47 4.79 4.01.25.04.43.27.42.51 0 .08-.02.15-.05.23-.24.57-1.27.99-3.15 1.27-.06.09-.12.37-.16.57-.03.18-.08.36-.14.55-.07.27-.27.4-.55.4h-.03c-.14 0-.31-.03-.54-.07-.36-.07-.77-.13-1.27-.13-.3 0-.6.01-.92.07-.6.1-1.12.46-1.72.88-.85.6-1.83 1.29-3.29 1.29-.06 0-.12-.02-.18-.02h-.15c-1.47 0-2.43-.67-3.28-1.29-.6-.42-1.1-.78-1.71-.88-.31-.05-.63-.07-.93-.07-.54 0-.96.09-1.27.15-.21.04-.39.07-.54.07-.37 0-.52-.22-.58-.42-.06-.19-.09-.39-.14-.57-.03-.18-.1-.49-.16-.57-1.92-.22-2.95-.64-3.19-1.23-.03-.06-.05-.15-.05-.22-.02-.24.16-.47.42-.51 3.26-.54 4.73-3.88 4.79-4.02l.02-.03c.18-.34.22-.64.12-.87-.2-.43-.89-.66-1.33-.81-.12-.03-.24-.07-.35-.12-1.1-.43-1.26-.93-1.2-1.27.1-.48.68-.79 1.17-.79.15 0 .27.03.38.07.42.2.79.3 1.1.3.24 0 .39-.06.47-.1l-.05-.57c-.1-1.63-.22-3.65.31-4.84C7.39 1.08 10.74.81 11.73.81l.42-.02h.06Z",
  },
  {
    name: "WhatsApp",
    url: "https://wa.me/201033441054",
    path: "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z",
  },
];

const Footer = () => {
  const { t } = useTranslation();

  // `sticky bottom-0` pins the footer to the bottom of the viewport while the
  // page is shorter than the screen. It stays within the page wrapper, so on
  // long pages it simply flows after the content as usual.
  return (
    <footer className="sticky bottom-0 mt-auto overflow-hidden bg-ink text-white/70">
      <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 end-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.28)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 start-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "hsl(var(--gold) / 0.16)" }}
        aria-hidden
      />

      <div className="shell relative z-10 pt-12 pb-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="space-y-5 lg:col-span-4">
            <div className="inline-flex items-center rounded-md bg-white p-2.5 shadow-sm">
              <img
                src={rawasikhLogo}
                alt="رواسخ"
                width={131}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto"
              />
            </div>
            <p className="max-w-sm text-[13.5px] leading-8 text-white/65">
              {t("footer.about")}
            </p>
            <div className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]" aria-hidden>
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <nav className="lg:col-span-2" aria-label={t("footer.quickLinks")}>
            <h3 className="mb-4 font-display text-[13px] font-bold uppercase tracking-wider text-white">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5 text-[13.5px]">
              {[
                { to: "/", label: t("nav.home"), onClick: () => window.scrollTo({ top: 0, behavior: 'auto' }) },
                { to: "/courses", label: t("nav.courses") },
                { to: "/teachers", label: t("nav.teachers") },
                { to: "/level-assessment", label: t("nav.levelAssessment") },
                { to: "/blog", label: t("nav.blog") },
                { to: "/contact", label: t("nav.contact") },
                { to: "/auth", label: t("footer.login") },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Services */}
          <nav className="lg:col-span-3" aria-label={t("footer.ourServices")}>
            <h3 className="mb-4 font-display text-[13px] font-bold uppercase tracking-wider text-white">
              {t("footer.ourServices")}
            </h3>
            <ul className="space-y-2.5 text-[13.5px]">
              {[
                { to: "/services#training", label: t("services.training") },
                { to: "/services#education", label: t("services.education") },
                { to: "/services#academic", label: t("services.academic") },
                { to: "/services#translation", label: t("services.translation") },
                { to: "/academic-services", label: t("nav.academicServices") },
                { to: "/digital-solutions", label: t("nav.digitalSolutions") },
                { to: "/portfolio", label: t("portfolioSection.badge") },
                { to: "/policies", label: t("nav.policies") },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="lg:col-span-3">
            <h3 className="mb-4 font-display text-[13px] font-bold uppercase tracking-wider text-white">
              {t("footer.contactUs")}
            </h3>
            <ul className="space-y-3.5 text-[13.5px]">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span className="leading-7 text-white/60">{t("footer.address")}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <a
                  href="tel:+201033441054"
                  className="nums text-white/60 transition-colors hover:text-white"
                  dir="ltr"
                >
                  +20 103 344 1054
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <a
                  href="mailto:info@rawasikheg.com"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  info@rawasikheg.com
                </a>
              </li>
            </ul>

            <Link
              to="/contact"
              className="group mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("cta.contactUs")}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-10 h-px w-full bg-white/10" aria-hidden />

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-center md:flex-row md:text-start">
          <p className="text-[12px] leading-6 text-white/50">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-5 text-[12px]">
            <Link to="/policies" className="text-white/50 transition-colors hover:text-white">
              {t("footer.privacyPolicy")}
            </Link>
            <Link to="/policies" className="text-white/50 transition-colors hover:text-white">
              {t("nav.policies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
