import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  Languages,
  PlayCircle,
  Quote,
  Star,
  UserCheck,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsUpdatesSection from "@/components/NewsUpdatesSection";
import PortfolioSection from "@/components/PortfolioSection";
import CourseTranslation from "@/components/course/CourseTranslation";
import Reveal from "@/components/site/Reveal";
import SectionHeading from "@/components/site/SectionHeading";
import Magnetic from "@/components/site/Magnetic";
import CourseCard from "@/components/site/CourseCard";
import SmartImage from "@/components/site/SmartImage";
import SearchField from "@/components/site/SearchField";
import ImpactSection from "@/components/site/ImpactSection";
import LearningExperience from "@/components/site/LearningExperience";
import ScrollScrub from "@/components/site/ScrollScrub";
import CtaBand from "@/components/site/CtaBand";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { resolvePrice, formatPrice, perLevelLabel, type PricesMap } from "@/lib/coursePrice";
import { getLocalizedCourseDescription, getLocalizedCourseTitle } from "@/lib/courseTranslations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";
import heroScholar from "@/assets/hero-scholar.jpg";
import serviceTraining from "@/assets/services/service-training.jpg";
import serviceEducation from "@/assets/services/service-education.jpg";
import serviceAcademic from "@/assets/services/service-academic.jpg";
import serviceTranslation from "@/assets/services/service-translation.jpg";
import serviceDigitalSolutions from "@/assets/services/service-digital-solutions.jpg";
import assessmentLevel from "@/assets/assessment/assessment-level.jpg";
import assessmentResults from "@/assets/assessment/assessment-results.jpg";
import assessmentRecommendation from "@/assets/assessment/assessment-recommendation.jpg";
import blogFallbackImage from "@/assets/blog-fallback-library.jpg";
import { getBlogImageFallback, getBlogImageUrl } from "@/lib/blogImageFallbacks";
import { cn } from "@/lib/utils";

const testimonialRatings = [5, 5, 5, 5, 4, 5];

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */

const TestimonialsSlider = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const reducedMotion = usePrefersReducedMotion();
  const items =
    (t("testimonials.items", { returnObjects: true }) as Array<{
      name: string;
      role: string;
      text: string;
    }>) || [];
  const testimonials = items.map((item, index) => ({
    ...item,
    rating: testimonialRatings[index] ?? 5,
  }));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    direction: isRtl ? "rtl" : "ltr",
    align: "start",
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setSnapCount(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay pauses on hover, keyboard focus and hidden tabs. It is disabled
  // entirely for visitors who prefer reduced motion.
  useEffect(() => {
    if (!emblaApi || reducedMotion) return;

    const root = emblaApi.rootNode();
    let timer = 0;
    let paused = false;

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (!paused && !document.hidden) emblaApi.scrollNext();
      }, 7000);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    root.addEventListener("pointerenter", pause);
    root.addEventListener("pointerleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", resume);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      root.removeEventListener("pointerenter", pause);
      root.removeEventListener("pointerleave", resume);
      root.removeEventListener("focusin", pause);
      root.removeEventListener("focusout", resume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [emblaApi, reducedMotion]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ms-10 flex" style={{ direction: isRtl ? "rtl" : "ltr" }}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="min-w-0 flex-[0_0_100%] ps-10 md:flex-[0_0_50%] lg:flex-[0_0_33.3333%]"
            >
              <figure className="surface-card flex h-full flex-col p-6">
                <Quote className="mb-4 h-7 w-7 text-gold/50" aria-hidden />
                <blockquote className="flex-1 text-[14.5px] leading-8 text-foreground/80">
                  {testimonial.text}
                </blockquote>

                <div className="mt-5 flex items-center gap-1" role="img" aria-label={`${testimonial.rating} / 5`}>
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className={cn(
                        "h-3.5 w-3.5",
                        starIndex < testimonial.rating
                          ? "fill-gold text-gold"
                          : "text-border",
                      )}
                      aria-hidden
                    />
                  ))}
                </div>

                <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-primary">
                    {testimonial.name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {testimonial.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {testimonial.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          aria-label={isRtl ? "السابق" : "Previous"}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>

        <div className="flex items-center gap-2" role="tablist" aria-label={t("testimonials.badge")}>
          {Array.from({ length: snapCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={selectedIndex === index}
              aria-label={`${t("testimonials.badge")} ${index + 1}`}
              onClick={() => emblaApi?.scrollTo(index)}
              className="group flex h-6 w-6 items-center justify-center rounded-full transition-colors"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  selectedIndex === index
                    ? "w-5 bg-gold"
                    : "w-1.5 bg-border group-hover:bg-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          aria-label={isRtl ? "التالي" : "Next"}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const Index = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const heroVisualRef = useRef<HTMLDivElement>(null);

  // One stable autoplay instance so the blog carousel advances on its own.
  // It pauses while the visitor hovers or focuses inside the carousel, and
  // stays off completely when reduced motion is requested.
  const blogAutoplay = useRef(
    Autoplay({
      delay: 4500,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );

  // Hero choreography: the headline lines rise out of a mask, then the arch
  // and its halo drift at different speeds as the hero leaves the viewport.
  // This mirrors the layered, scroll-linked entrance used by the reference
  // site while keeping our own quieter amplitude.
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(".hero-line-inner", {
        yPercent: 118,
        skewY: 5,
        duration: 1.15,
        ease: "power4.out",
        stagger: 0.12,
        delay: 0.12,
      });

      gsap.to(".hero-arch", {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      gsap.to(".hero-halo", {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, hero);

    return () => ctx.revert();
  }, [reducedMotion]);

  // A few pixels of pointer depth on the hero portrait. The values are written
  // to CSS variables inside rAF, so the effect never triggers React renders.
  useEffect(() => {
    const visual = heroVisualRef.current;
    if (!visual || reducedMotion) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    const paint = () => {
      frame = 0;
      visual.style.setProperty("--hero-x", `${targetX.toFixed(2)}px`);
      visual.style.setProperty("--hero-y", `${targetY.toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = visual.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 9;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 7;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    visual.addEventListener("pointermove", onPointerMove);
    visual.addEventListener("pointerleave", reset);

    return () => {
      cancelAnimationFrame(frame);
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", reset);
    };
  }, [reducedMotion]);

  const { data: homeVideoSetting } = useQuery({
    queryKey: ["site_setting_home_video"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "home_video_url")
        .maybeSingle();
      return data?.setting_value || null;
    },
  });
  const homeVideoUrl = homeVideoSetting || "https://www.youtube.com/embed/FrAx3-Sgqho";

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["featured_courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const { data: blogPosts } = useQuery({
    queryKey: ["blog_posts_homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const services = [
    {
      icon: Briefcase,
      image: serviceTraining,
      title: t("services.training"),
      description: t("services.trainingDesc"),
      tags: t("services.trainingTags", { returnObjects: true }) as string[],
      href: "/services#training",
    },
    {
      icon: GraduationCap,
      image: serviceEducation,
      title: t("services.education"),
      description: t("services.educationDesc"),
      tags: t("services.educationTags", { returnObjects: true }) as string[],
      href: "/services#education",
    },
    {
      icon: FileText,
      image: serviceAcademic,
      title: t("services.academic"),
      description: t("services.academicDesc"),
      tags: t("services.academicTags", { returnObjects: true }) as string[],
      href: "/academic-services",
    },
    {
      icon: Languages,
      image: serviceTranslation,
      title: t("services.translation"),
      description: t("services.translationDesc"),
      tags: t("services.translationTags", { returnObjects: true }) as string[],
      href: "/services#translation",
    },
    {
      icon: Code2,
      image: serviceDigitalSolutions,
      title: t("services.digitalSolutions"),
      description: t("services.digitalSolutionsDesc"),
      tags: t("services.digitalSolutionsTags", { returnObjects: true }) as string[],
      href: "/digital-solutions",
      featuredWide: true,
    },
  ];

  const assessmentCards = [
    { icon: ClipboardCheck, image: assessmentLevel, title: t("levelAssessment.card1Title"), description: t("levelAssessment.card1Desc") },
    { icon: PlayCircle, image: assessmentResults, title: t("levelAssessment.card2Title"), description: t("levelAssessment.card2Desc") },
    { icon: GraduationCap, image: assessmentRecommendation, title: t("levelAssessment.card3Title"), description: t("levelAssessment.card3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="رواسخ — للخدمات التعليمية وتنمية المهارات"
        description="منصة رواسخ التعليمية: كورسات تدريبية معتمدة، خدمات أكاديمية وترجمة، وتقييم مستوى مجاني — مع شهادات إتمام ودعم فني."
        path="/"
        keywords={[
          "كورسات أونلاين",
          "دورات تدريبية",
          "خدمات أكاديمية",
          "تعلم عن بعد",
          "رواسخ",
          "تقييم مستوى",
        ]}
      />
      <Helmet>
        {/* The hero portrait is the LCP element on the homepage. */}
        <link rel="preload" as="image" href={heroScholar} {...({ fetchpriority: "high" } as Record<string, string>)} />
      </Helmet>
      <Header />

      <main>
        {/* ================= HERO ================= */}
        <section ref={heroRef} className="relative overflow-hidden border-b border-border/70 bg-paper">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              background:
                "radial-gradient(90% 70% at 85% 10%, hsl(var(--primary) / 0.12) 0%, transparent 60%), radial-gradient(70% 60% at 5% 90%, hsl(var(--gold) / 0.14) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden />

          <div className="shell relative grid items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-16">
            {/* Copy */}
            <div className="max-w-none lg:max-w-xl">
              <Reveal delay={80}>
                <h1 className="text-center text-[34px] font-bold leading-[1.4] tracking-tight text-foreground sm:text-[44px] lg:text-start lg:text-[52px]">
                  <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
                    <span className="hero-line-inner block">{t("hero.title1")}</span>
                  </span>
                  <span className="-mb-[0.1em] mt-1 block overflow-hidden pb-[0.1em]">
                    <span className="hero-line-inner block text-gradient-brand">
                      {t("hero.title2")}
                    </span>
                  </span>
                  <span className="-mb-[0.16em] mt-2 block overflow-hidden pb-[0.16em]">
                    <span className="hero-line-inner block text-[20px] font-semibold text-muted-foreground sm:text-[24px] lg:text-[27px]">
                      {t("hero.title3")}
                    </span>
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mx-auto mt-5 max-w-lg text-center text-[15px] leading-9 text-muted-foreground lg:mx-0 lg:text-start">
                  {t("hero.description")}
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mx-auto mt-7 max-w-lg lg:mx-0">
                  <SearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={(value) => {
                      const term = value.trim();
                      if (!term) return;
                      navigate(`/courses?search=${encodeURIComponent(term)}`);
                    }}
                    placeholder={t("coursesPage.searchPlaceholder")}
                    ariaLabel={t("coursesPage.searchPlaceholder")}
                    size="lg"
                    className="max-w-lg bg-card shadow-sm"
                    action={
                      <Button type="submit" size="sm" className="my-1 rounded-full px-5">
                        {t("common.search")}
                      </Button>
                    }
                  />
                </div>
              </Reveal>

              <Reveal delay={300}>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Magnetic>
                    <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                      <Link to="/courses">
                        {t("hero.browseCourses")}
                        <ArrowIcon className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Magnetic pull={0.12}>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="gap-2 rounded-xl border-gold/50 bg-gold-soft/40 px-6 text-primary hover:border-gold hover:bg-gold-soft/70 hover:text-primary"
                    >
                      <Link to="/academic-services">
                        {t("hero.browseAcademicServices")}
                        <ArrowIcon className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Magnetic pull={0.14}>
                    <Button asChild size="lg" variant="outline" className="rounded-xl px-6">
                      <Link to="/about">{t("hero.readMore")}</Link>
                    </Button>
                  </Magnetic>
                </div>
              </Reveal>

              <Reveal delay={360}>
                <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border/80 pt-6 text-center text-[12.5px] font-medium text-muted-foreground lg:justify-start lg:text-start">
                  {[
                    { icon: Award, label: t("courseDetails.completionCertificate") },
                    { icon: Clock, label: t("courseDetails.lifetimeAccess") },
                    { icon: UserCheck, label: t("courseDetails.technicalSupport") },
                  ].map((item) => (
                    <li key={item.label} className="inline-flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-gold" aria-hidden />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            {/* Visual */}
            <Reveal delay={180} variant={isRtl ? "left" : "right"} className="relative">
              <div ref={heroVisualRef} className="hero-arch hero-parallax relative mx-auto max-w-[400px]">
                <div
                  className="hero-halo absolute -inset-6 rounded-b-[40px] rounded-t-full opacity-70 blur-2xl"
                  style={{ background: "hsl(var(--primary) / 0.16)" }}
                  aria-hidden
                />

                {/* Gilded outer ring — the arch reads as a frame, not a photo card. */}
                <div
                  className="pointer-events-none absolute -inset-2.5 rounded-b-[38px] rounded-t-full border border-gold/25"
                  aria-hidden
                />

                <div className="relative overflow-hidden rounded-b-[30px] rounded-t-full border border-border bg-[#f6f1e7] shadow-xl">
                  <div className="pattern-lattice absolute inset-0 opacity-[0.05]" aria-hidden />
                  <img
                    src={heroScholar}
                    alt={t("heroImageAlt")}
                    width={864}
                    height={1080}
                    decoding="async"
                    {...({ fetchpriority: "high" } as Record<string, string>)}
                    className="hero-parallax-image relative block aspect-[4/5] w-full object-cover object-top"
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-28"
                    style={{
                      background:
                        "linear-gradient(to bottom, hsl(var(--primary) / 0.07), transparent)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                    style={{
                      background:
                        "linear-gradient(to top, hsl(var(--gold) / 0.12), transparent)",
                    }}
                    aria-hidden
                  />
                </div>

                {/* Floating: certified */}
                <div className="hero-parallax-float absolute -start-4 top-16 hidden items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-soft text-gold">
                    <Award className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[12px] leading-tight">
                    <span className="block font-bold text-foreground">
                      {t("courseDetails.completionCertificate")}
                    </span>
                    <span className="block text-muted-foreground">
                      {t("whyUs.highQuality")}
                    </span>
                  </span>
                </div>

                {/* Floating: rating */}
                <div className="hero-parallax-float absolute -end-3 bottom-10 hidden items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:flex">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                    ))}
                  </span>
                  <span className="text-[12px] font-bold text-foreground nums" dir="ltr">
                    4.9
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= IMPACT ================= */}
        <ImpactSection />

        {/* ================= FEATURED COURSES ================= */}
        <section className="section-y bg-paper">
          <div className="shell">
            <SectionHeading
              title={t("coursesSection.title")}
              highlight={t("coursesSection.titleHighlight")}
              description={t("coursesSection.description")}
              action={
                <Button asChild variant="outline" className="gap-2 rounded-xl">
                  <Link to="/courses">
                    {t("coursesSection.viewAll")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />

            <div className="mt-8">
              {coursesLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="overflow-hidden rounded-2xl border border-border bg-card">
                      <Skeleton className="aspect-video w-full" />
                      <div className="space-y-3 p-5">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-9 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses && courses.length > 0 ? (
                <ScrollScrub
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  refreshKey={courses.length}
                  y={78}
                  skew={4}
                  rotateX={12}
                  rotateY={3}
                  depth={16}
                  scale={0.96}
                  parallax={3}
                >
                  {courses.map((course) => {
                    const legacyTitle = getLocalizedCourseTitle(course, i18n.language, t);
                    const legacyDescription = getLocalizedCourseDescription(course, i18n.language, t);
                    const hasLegacyOverride = legacyTitle !== course.title;
                    const resolved = resolvePrice(
                      (course.prices ?? null) as PricesMap | null,
                      course.price,
                      i18n.language,
                      course.price_label,
                    );
                    const isFree = !resolved.label && (!resolved.amount || resolved.amount === 0);
                    const priceText = course.has_levels
                      ? perLevelLabel(i18n.language)
                      : formatPrice(resolved, i18n.language);

                    return (
                      <CourseTranslation
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        description={course.description}
                        updatedAt={course.updated_at}
                      >
                        {(autoTitle, autoDescription) => {
                          const courseTitle = hasLegacyOverride ? legacyTitle : autoTitle;
                          const courseDescription = hasLegacyOverride
                            ? legacyDescription
                            : autoDescription;
                          return (
                            <div className="h-full">
                              <CourseCard
                                href={`/courses/${course.id}`}
                                title={courseTitle}
                                description={courseDescription}
                                image={course.thumbnail_url}
                                featured={course.is_featured}
                                isFree={isFree}
                                priceText={priceText}
                                featuredLabel={t("coursesSection.featured")}
                                freeLabel={t("coursesSection.free")}
                                detailsLabel={t("coursesPage.viewDetails")}
                                isRtl={isRtl}
                              />
                            </div>
                          );
                        }}
                      </CourseTranslation>
                    );
                  })}
                </ScrollScrub>
              ) : (
                <div className="rounded-2xl border border-dashed border-border py-14 text-center">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
                  <p className="text-muted-foreground">{t("coursesSection.comingSoon")}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= LEARNING EXPERIENCE ================= */}
        <LearningExperience />

        {/* ================= SERVICES ================= */}
        <section id="services" className="section-y bg-background scroll-mt-24">
          <div className="shell">
            <SectionHeading
              title={t("services.title")}
              highlight={t("services.titleHighlight")}
              action={
                <Button asChild variant="outline" className="gap-2 rounded-xl">
                  <Link to="/services">
                    {t("services.details")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />

            <ScrollScrub
              className="mt-8 grid gap-5 sm:grid-cols-2"
              y={82}
              skew={4}
              rotateX={10}
              rotateY={3}
              depth={14}
              scale={0.97}
              parallax={2.5}
            >
              {services.map((service, index) => (
                <div
                  key={service.title}
                  className={cn("h-full", service.featuredWide && "sm:col-span-2")}
                >
                  <article
                    className={cn(
                      "surface-card group flex h-full flex-col overflow-hidden",
                      service.featuredWide && "lg:grid lg:grid-cols-[1.08fr_1fr] lg:items-stretch",
                    )}
                  >
                    <div
                      className={cn(
                        "relative aspect-[16/10] overflow-hidden bg-muted",
                        service.featuredWide && "lg:aspect-auto lg:min-h-[300px]",
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
                        <h3 className="mt-5 text-[17px] font-bold text-foreground lg:text-[18.5px]">
                          <Link to={service.href} className="transition-colors hover:text-primary">
                            {service.title}
                          </Link>
                        </h3>
                        <p className="mt-2 text-[13.5px] leading-8 text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                      <div className="mt-5">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(service.tags) &&
                            service.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                        <Link
                          to={service.href}
                          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary transition-colors hover:text-primary/80"
                        >
                          {t("services.exploreService")}
                          <ArrowIcon className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </ScrollScrub>
          </div>
        </section>

        {/* ================= LEVEL ASSESSMENT ================= */}
        <section className="section-y relative overflow-hidden border-y border-border/70 bg-secondary/40">
          <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
          <div className="shell relative">
            <SectionHeading
              title={t("levelAssessment.title")}
              description={t("levelAssessment.description")}
              align="center"
            />

            <ScrollScrub
              className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-3"
              y={74}
              skew={4}
              rotateX={9}
              rotateY={3}
              depth={12}
              start="top 90%"
              end="top 62%"
            >
              {assessmentCards.map((card) => (
                <div key={card.title} className="h-full">
                  <div className="surface-card group h-full overflow-hidden text-center">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <img
                        src={card.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/15"
                        aria-hidden
                      />
                    </div>
                    <div className="p-6 pt-0">
                      <span className="relative z-10 mx-auto -mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold ring-4 ring-card">
                        <card.icon className="h-6 w-6" aria-hidden />
                      </span>
                      <h3 className="mt-4 text-[15.5px] font-bold text-foreground">{card.title}</h3>
                      <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollScrub>

            <Reveal delay={200}>
              <div className="mt-9 text-center">
                <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                  <Link to="/level-assessment">
                    {t("levelAssessment.cta")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= ABOUT + VIDEO ================= */}
        <section className="section-y bg-background">
          <div className="shell grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-[30px] opacity-60 blur-2xl"
                  style={{ background: "hsl(var(--gold) / 0.18)" }}
                  aria-hidden
                />
                <div className="relative overflow-hidden rounded-3xl border border-border bg-ink shadow-lg">
                  <div className="aspect-video">
                    <iframe
                      src={homeVideoUrl}
                      title="Rawasikh Introduction"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div>
                <h2 className="text-[26px] font-bold leading-[1.45] text-foreground sm:text-[32px]">
                  {t("aboutSection.title")}
                  <span className="text-gradient-brand">{t("aboutSection.titleHighlight")}</span>
                </h2>
                <div className="rule-gold" aria-hidden />
                <h3 className="mt-5 text-[17px] font-bold text-foreground">
                  {t("aboutSection.heading")}
                </h3>
                <p className="mt-3 text-[14px] leading-8 text-muted-foreground">
                  {t("aboutSection.paragraph1")}
                </p>
                <p className="mt-3 text-[14px] leading-8 text-muted-foreground">
                  {t("aboutSection.paragraph2")}
                </p>
                <Button asChild className="mt-6 gap-2 rounded-xl">
                  <Link to="/about">
                    {t("aboutSection.learnMore")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= NEWS + PORTFOLIO ================= */}
        <NewsUpdatesSection />
        <PortfolioSection />

        {/* ================= TESTIMONIALS ================= */}
        <section className="section-y border-y border-border/70 bg-secondary/30">
          <div className="shell">
            <SectionHeading
              title={t("testimonials.title")}
              highlight={t("testimonials.titleHighlight")}
              description={t("testimonials.description")}
              align="center"
            />
            <div className="mt-8">
              <TestimonialsSlider />
            </div>
          </div>
        </section>

        {/* ================= BLOG ================= */}
        <section className="section-y bg-background">
          <div className="shell">
            <SectionHeading
              title={t("blogSection.title")}
              highlight={t("blogSection.titleHighlight")}
              description={t("blogSection.description")}
              action={
                <Button asChild variant="outline" className="gap-2 rounded-xl">
                  <Link to="/blog">
                    {t("nav.blog")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />

            <div className="mt-8">
              {blogPosts && blogPosts.length > 0 ? (
                <Carousel
                  opts={{
                    align: "start",
                    direction: i18n.dir() === "rtl" ? "rtl" : "ltr",
                    loop: blogPosts.length > 3,
                  }}
                  plugins={reducedMotion ? [] : [blogAutoplay.current]}
                  className="w-full"
                >
                  <CarouselContent className="-ms-4">
                    {blogPosts.map((post) => (
                      <CarouselItem
                        key={post.id}
                        className="ps-4 basis-full sm:basis-1/2 lg:basis-1/3"
                      >
                        <article className="surface-card group flex h-full flex-col overflow-hidden">
                          <Link to={`/blog/${post.id}`} className="block">
                            <div className="relative aspect-[16/9] overflow-hidden bg-brand-soft">
                              {/* Resolve the image exactly like the article page does,
                                  so the card and the post always show the same cover. */}
                              <SmartImage
                                src={getBlogImageUrl(post)}
                                fallbackSrc={getBlogImageFallback(post)}
                                alt={post.title}
                                width={400}
                                height={225}
                                widths={[320, 480, 640, 800]}
                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                                quality={72}
                                referrerPolicy="no-referrer"
                                className="transition-transform duration-700 group-hover:scale-[1.04]"
                              />
                            </div>
                          </Link>

                          <div className="flex flex-1 flex-col p-5">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              {post.category && (
                                <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[11px] font-bold text-gold-strong">
                                  {post.category}
                                </span>
                              )}
                              {post.read_time && (
                                <span className="text-[11.5px] text-muted-foreground nums">
                                  {post.read_time} {t("blogSection.readTime")}
                                </span>
                              )}
                            </div>

                            <h3 className="line-clamp-2 text-[15px] font-bold leading-7 text-foreground transition-colors group-hover:text-primary">
                              <Link to={`/blog/${post.id}`}>{post.title}</Link>
                            </h3>
                            {post.excerpt && (
                              <p className="mt-2 line-clamp-3 text-[13px] leading-7 text-muted-foreground">
                                {post.excerpt}
                              </p>
                            )}

                            <div className="mt-auto flex items-center justify-between border-t border-border/80 pt-4">
                              <span className="text-[11.5px] text-muted-foreground nums">
                                {new Date(post.created_at).toLocaleDateString(i18n.language)}
                              </span>
                              <Link
                                to={`/blog/${post.id}`}
                                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary"
                              >
                                {t("blogSection.readMore")}
                              </Link>
                            </div>
                          </div>
                        </article>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      title: "5 استراتيجيات فعّالة لتعليم اللغة العربية للناطقين بغيرها",
                      excerpt:
                        "تعرف على أحدث الأساليب والاستراتيجيات المستخدمة في تعليم اللغة العربية كلغة ثانية.",
                      category: "التعليم",
                      readTime: "5",
                    },
                    {
                      title: "أهمية التحول الرقمي في المؤسسات التعليمية",
                      excerpt: "كيف يمكن للتحول الرقمي أن يُحدث نقلة نوعية في جودة التعليم؟",
                      category: "التدريب",
                      readTime: "7",
                    },
                    {
                      title: "دليلك الشامل لكتابة رسالة ماجستير متميزة",
                      excerpt:
                        "نقدم لك خطوات عملية ونصائح من خبراء أكاديميين لمساعدتك في إعداد رسالة قوية.",
                      category: "الخدمات الأكاديمية",
                      readTime: "10",
                    },
                  ].map((post) => (
                    <article key={post.title} className="surface-card flex h-full flex-col overflow-hidden">
                      <div className="relative aspect-[16/9] overflow-hidden bg-brand-soft">
                        <img
                          src={blogFallbackImage}
                          alt={post.title}
                          width={400}
                          height={225}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[11px] font-bold text-gold-strong">
                            {post.category}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground nums">
                            {post.readTime} {t("blogSection.readTime")}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-7 text-foreground">
                          {post.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-7 text-muted-foreground">
                          {post.excerpt}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <CtaBand />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
