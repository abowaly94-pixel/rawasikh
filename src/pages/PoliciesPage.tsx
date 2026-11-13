import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Lock, FileWarning, Scale, Copyright, CreditCard, GraduationCap, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";

type Audience = "student" | "teacher";

const PoliciesPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [audience, setAudience] = useState<Audience>("student");

  // "policiesPage" holds the student/general policies (existing content),
  // "policiesPageTeacher" holds the instructor-facing policies. Both share
  // the exact same shape, so every t() call below is built from this prefix.
  const prefix = audience === "teacher" ? "policiesPageTeacher" : "policiesPage";

  const renderList = (items: string[]) => (
    <ul className="space-y-2 text-muted-foreground mb-6">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" /> {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="السياسات والشروط"
        description="سياسات رواسخ: شروط الاستخدام، سياسة الخصوصية، وسياسة الاسترداد — بشفافية ووضوح."
        path="/policies"
        keywords={["سياسة الخصوصية", "شروط الاستخدام", "سياسة الاسترداد", "رواسخ"]}
      />
      <Header />

      <section className="py-12 lg:py-16 bg-gradient-to-br from-secondary via-background to-muted relative overflow-hidden">
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-[8%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="shell relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t(`${prefix}.title1`)} <span className="text-primary">{t(`${prefix}.title2`)}</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8">{t(`${prefix}.subtitle`)}</p>

            <Tabs value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <TabsList className="mx-auto">
                <TabsTrigger value="student" className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {t("policiesPage.audienceStudent", "سياسات الطلاب")}
                </TabsTrigger>
                <TabsTrigger value="teacher" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  {t("policiesPage.audienceTeacher", "سياسات المحاضرين")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="shell">
          <div className="max-w-4xl mx-auto space-y-8">

            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl"><Lock className="h-6 w-6 text-primary" /></div>
                <h2 className="text-2xl font-bold text-foreground">{t(`${prefix}.privacy.title`)}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">{t(`${prefix}.privacy.intro`)}</p>

              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.privacy.collectTitle`)}</h3>
              {renderList(t(`${prefix}.privacy.collect`, { returnObjects: true }) as string[])}

              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.privacy.useTitle`)}</h3>
              <p className="text-muted-foreground mb-3">{t(`${prefix}.privacy.useIntro`)}</p>
              {renderList(t(`${prefix}.privacy.use`, { returnObjects: true }) as string[])}

              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.privacy.protectTitle`)}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">{t(`${prefix}.privacy.protect`)}</p>

              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.privacy.shareTitle`)}</h3>
              <p className="text-muted-foreground leading-relaxed">{t(`${prefix}.privacy.share`)}</p>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl"><Scale className="h-6 w-6 text-primary" /></div>
                <h2 className="text-2xl font-bold text-foreground">{t(`${prefix}.terms.title`)}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">{t(`${prefix}.terms.intro`)}</p>
              <ul className="space-y-2 text-muted-foreground">
                {(t(`${prefix}.terms.items`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl"><CreditCard className="h-6 w-6 text-primary" /></div>
                <h2 className="text-2xl font-bold text-foreground">{t(`${prefix}.payment.title`)}</h2>
              </div>
              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.payment.paySubtitle`)}</h3>
              {renderList(t(`${prefix}.payment.pay`, { returnObjects: true }) as string[])}
              <h3 className="font-bold text-foreground mb-3 text-lg">{t(`${prefix}.payment.refundSubtitle`)}</h3>
              <ul className="space-y-2 text-muted-foreground">
                {(t(`${prefix}.payment.refund`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl"><FileWarning className="h-6 w-6 text-primary" /></div>
                <h2 className="text-2xl font-bold text-foreground">{t(`${prefix}.disclaimer.title`)}</h2>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                {(t(`${prefix}.disclaimer.items`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl"><Copyright className="h-6 w-6 text-primary" /></div>
                <h2 className="text-2xl font-bold text-foreground">{t(`${prefix}.ip.title`)}</h2>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                {(t(`${prefix}.ip.items`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </Card>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PoliciesPage;
