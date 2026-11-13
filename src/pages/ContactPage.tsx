import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";

const ContactPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const contactInfo = [
    { icon: Phone, label: t("contactPage.phone"), value: "01033441054", href: "tel:+201033441054", dir: "ltr" as const },
    { icon: Mail, label: t("contactPage.email"), value: "info@rawasikh.com", href: "mailto:info@rawasikh.com" },
    { icon: MapPin, label: t("contactPage.address"), value: t("contactPage.addressValue") },
    { icon: () => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, label: t("contactPage.whatsapp"), value: "+20 10 33441054", href: "https://wa.me/201033441054", dir: "ltr" as const },
  ];

  const socialLinks = [
    { icon: Facebook, label: t("contactPage.facebook"), href: "https://www.facebook.com/rawasikheg/" },
    { icon: Instagram, label: t("contactPage.instagram"), href: "https://www.instagram.com/rawasikheg/" },
    { 
      icon: () => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      label: t("contactPage.twitter"), href: "https://x.com/rawasikheg" 
    },
    { 
      icon: () => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15z"/></svg>,
      label: t("contactPage.tiktok"), href: "https://www.tiktok.com/@rawasikheg" 
    },
    { 
      icon: () => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
      label: t("contactPage.youtube"), href: "https://www.youtube.com/@rawasikheg" 
    },
    {
      icon: () => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>,
      label: t("contactPage.snapchat"), href: "https://www.snapchat.com/add/rawasikheg"
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="تواصل معنا"
        description="تواصل مع فريق رواسخ للاستفسار عن الكورسات والخدمات الأكاديمية والترجمة — هاتف، بريد إلكتروني، واتساب، ونموذج مباشر."
        path="/contact"
        keywords={["تواصل مع رواسخ", "خدمة العملاء", "استفسار", "دعم فني"]}
      />
      <Header />

      {/* Hero */}
      <section className="py-12 lg:py-16 bg-primary relative overflow-hidden">
        <div className="absolute top-10 right-[10%] w-60 h-60 bg-primary-foreground/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-[8%] w-52 h-52 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[20%] left-[15%] w-12 h-12 bg-primary-foreground/10 rounded-full animate-float" />
        <div className="absolute top-[55%] right-[20%] w-10 h-10 bg-primary-foreground/5 rounded-full animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-[30%] left-[40%] w-8 h-8 bg-primary-foreground/10 rounded-full animate-float-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-8 left-10 grid grid-cols-3 gap-2 opacity-10">
          {[...Array(9)].map((_, i) => <div key={i} className="w-2 h-2 bg-primary-foreground rounded-full" />)}
        </div>
        <div className="shell relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">{t("contactPage.title")}</h1>
            <p className="text-primary-foreground/80 text-lg">
              {t("contactPage.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12 lg:py-16">
        <div className="shell">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
            {contactInfo.map((item, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: `${0.1 * (index + 1)}s`, animationFillMode: "both" }}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.label}</h3>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" dir={item.dir}>
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-muted-foreground" dir={item.dir}>{item.value}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Social Media */}
          <div className="text-center max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
            <h2 className="text-2xl font-bold text-foreground mb-6">{t("contactPage.followUs")}</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              {socialLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-card border rounded-xl hover:border-primary hover:shadow-md transition-all duration-300 group"
                  >
                    <span className="text-muted-foreground group-hover:text-primary transition-colors">
                      <IconComponent />
                    </span>
                    <span className="text-foreground font-medium">{link.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: "0.7s", animationFillMode: "both" }}>
            <Button asChild size="lg" className="gap-2 text-lg px-8">
              <a href="https://wa.me/201033441054" target="_blank" rel="noopener noreferrer">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t("contactPage.ctaWhatsapp")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
