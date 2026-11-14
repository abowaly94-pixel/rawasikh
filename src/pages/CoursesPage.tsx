import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, SlidersHorizontal } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseTranslation from "@/components/course/CourseTranslation";
import CourseCard from "@/components/site/CourseCard";
import SearchField from "@/components/site/SearchField";
import Reveal from "@/components/site/Reveal";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";
import { resolvePrice, formatPrice, perLevelLabel, type PricesMap } from "@/lib/coursePrice";
import { getLocalizedCourseDescription, getLocalizedCourseTitle } from "@/lib/courseTranslations";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_video_url?: string | null;
  price: number;
  is_featured: boolean;
  category_id: string | null;
  instructor_id: string | null;
  created_at: string;
  updated_at?: string | null;
  has_levels?: boolean | null;
  price_label?: string | null;
  prices?: PricesMap | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

type SortKey = "default" | "priceAsc" | "priceDesc";
type PriceFilter = "all" | "free" | "paid";

/** A course counts as free when it has no price and no custom price label. */
const isCourseFree = (course: Course) => {
  const resolved = resolvePrice(course.prices, course.price, "ar", course.price_label);
  return !resolved.label && (!resolved.amount || resolved.amount === 0);
};

const CoursesPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get("category"),
  );
  const [sort, setSort] = useState<SortKey>("default");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  /* Drag-to-scroll for the mobile filter chip rail (mouse users). Touch keeps
     native swipe scrolling; pills are buttons, so keyboard users can also tab
     through them. In RTL scrollLeft is negative, so the delta sign flips. */
  const chipsRailRef = useRef<HTMLDivElement>(null);
  const chipsDragRef = useRef({ active: false, startX: 0, startScroll: 0, dragged: false });

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setSelectedCategory(searchParams.get("category"));
  }, [searchParams]);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["course_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { tt } = useTermsTranslation((categories || []).map((category) => category.name));

  const filteredCourses = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    const matched = (courses || []).filter((course) => {
      const localizedTitle = getLocalizedCourseTitle(course, i18n.language, t);
      const localizedDescription = getLocalizedCourseDescription(course, i18n.language, t);
      const searchText = [course.title, course.description, localizedTitle, localizedDescription]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchText.includes(term);
      const matchesCategory = !selectedCategory || course.category_id === selectedCategory;
      const free = isCourseFree(course);
      const matchesPrice =
        priceFilter === "all" || (priceFilter === "free" ? free : !free);
      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (sort === "default") return matched;

    return [...matched].sort((a, b) =>
      sort === "priceAsc" ? a.price - b.price : b.price - a.price,
    );
  }, [courses, searchQuery, selectedCategory, priceFilter, sort, i18n.language, t]);

  /** Category counts for the filter rail (computed from the loaded course list). */
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const course of courses || []) {
      if (!course.category_id) continue;
      map.set(course.category_id, (map.get(course.category_id) || 0) + 1);
    }
    return map;
  }, [courses]);

  const categoryName = categories?.find((category) => category.id === selectedCategory)?.name;

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "default", label: t("coursesPage.sort.newest") },
    { key: "priceAsc", label: t("coursesPage.sort.priceAsc") },
    { key: "priceDesc", label: t("coursesPage.sort.priceDesc") },
  ];
  const activeSortLabel = sortOptions.find((option) => option.key === sort)?.label;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title={categoryName ? `كورسات ${tt(categoryName)}` : "الكورسات والبرامج التدريبية"}
        description={
          categoryName
            ? `تصفح كورسات ${tt(categoryName)} على منصة رواسخ التعليمية — برامج تدريبية معتمدة بشهادات إتمام ودعم فني.`
            : "تصفح جميع الكورسات والبرامج التدريبية على منصة رواسخ: مسارات تعليمية معتمدة، شهادات إتمام، ومحتوى عربي احترافي."
        }
        path={selectedCategory ? `/courses?category=${selectedCategory}` : "/courses"}
        keywords={["كورسات", "دورات تدريبية", "برامج تعليمية", "رواسخ", ...(categories || []).map((c) => c.name)]}
        jsonLd={
          filteredCourses.length > 0
            ? {
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: "الكورسات والبرامج التدريبية في رواسخ",
                itemListElement: filteredCourses.slice(0, 20).map((course, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: course.title,
                  url: `https://rawasikheg.com/courses/${course.id}`,
                })),
              }
            : undefined
        }
      />
      <Header />

      <main className="flex-1">
        {/* ---- Page header ---- */}
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

          <div className="shell relative py-6 lg:py-8">
            <nav className="mb-3 flex items-center gap-2 text-[12.5px] text-muted-foreground" aria-label="مسار التنقل">
              <Link to="/" className="transition-colors hover:text-primary">
                {t("nav.home")}
              </Link>
              <span aria-hidden>/</span>
              <span className="font-medium text-foreground">{t("nav.courses")}</span>
            </nav>

            <div className="max-w-3xl">
              <h1 className="text-[28px] font-bold leading-[1.4] text-foreground sm:text-[36px] lg:text-[42px]">
                {categoryName ? (
                  <>
                    {t("nav.courses")}
                    <span className="text-gradient-brand"> · {tt(categoryName)}</span>
                  </>
                ) : (
                  <>
                    {t("coursesPage.title")}
                  </>
                )}
              </h1>
              <div className="rule-gold" aria-hidden />
              <p className="mt-2 max-w-2xl text-[14px] leading-8 text-muted-foreground sm:text-[15px]">
                {t("coursesPage.subtitle")}
              </p>
            </div>

            <div className="mt-3 max-w-xl">
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t("coursesPage.searchPlaceholder")}
                ariaLabel={t("coursesPage.searchPlaceholder")}
                size="lg"
              />
            </div>
          </div>
        </section>

        {/* ---- Filter bar (mobile) ---- */}
        <section className="sticky top-16 z-30 border-b border-border bg-background shadow-sm lg:hidden">
          <div className="shell flex items-center gap-3 py-3">
            <span className="hidden shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground sm:flex">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              {t("coursesPage.filterLabel")}
            </span>

            <div
              ref={chipsRailRef}
              tabIndex={0}
              role="region"
              aria-label={t("coursesPage.categoryFilter")}
              className="chips-scroll -mx-1 flex min-w-0 flex-1 cursor-grab select-none items-center gap-2 overflow-x-auto px-1 active:cursor-grabbing"
              onPointerDown={(e) => {
                if (e.pointerType !== "mouse") return;
                const el = chipsRailRef.current;
                if (!el) return;
                chipsDragRef.current = {
                  active: true,
                  startX: e.clientX,
                  startScroll: el.scrollLeft,
                  dragged: false,
                };
              }}
              onPointerMove={(e) => {
                const drag = chipsDragRef.current;
                const el = chipsRailRef.current;
                if (!drag.active || !el) return;
                const dx = e.clientX - drag.startX;
                if (Math.abs(dx) > 5) drag.dragged = true;
                el.scrollLeft = drag.startScroll + (isRtl ? dx : -dx);
              }}
              onPointerUp={() => {
                chipsDragRef.current.active = false;
              }}
              onPointerCancel={() => {
                chipsDragRef.current.active = false;
              }}
              onPointerLeave={() => {
                chipsDragRef.current.active = false;
              }}
              onClickCapture={(e) => {
                // Swallow the click after a real drag so picking a chip doesn't
                // trigger by accident at the end of a scroll gesture.
                if (chipsDragRef.current.dragged) {
                  e.stopPropagation();
                  e.preventDefault();
                  chipsDragRef.current.dragged = false;
                }
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="chip shrink-0"
                data-active={selectedCategory === null}
              >
                {t("coursesPage.all")}
              </button>
              {categories?.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="chip shrink-0"
                  data-active={selectedCategory === category.id}
                >
                  <span data-no-auto-translate>{tt(category.name)}</span>
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] font-semibold text-foreground/80 transition-colors hover:border-primary/35 hover:text-primary sm:flex"
                >
                  {activeSortLabel}
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => setSort(option.key)}
                    className={cn(
                      "cursor-pointer",
                      sort === option.key && "bg-brand-soft font-semibold text-primary",
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* ---- Results ---- */}
        <section className="bg-background py-8 lg:py-12">
          <div className="shell lg:grid lg:grid-cols-[286px_1fr] lg:items-start lg:gap-8">
            {/* Filter rail — the desktop counterpart of the mobile chip bar. */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 space-y-6 rounded-2xl border border-border bg-card p-5">
                <div>
                  <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                    {t("coursesPage.categoryFilter")}
                  </h2>
                  <ul className="space-y-0.5">
                    <li>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                          selectedCategory === null
                            ? "bg-brand-soft font-semibold text-primary"
                            : "text-foreground/75 hover:bg-muted hover:text-primary",
                        )}
                      >
                        <span>{t("coursesPage.all")}</span>
                        <span className="nums text-[11px] text-muted-foreground">
                          {courses?.length ?? 0}
                        </span>
                      </button>
                    </li>
                    {categories?.map((category) => (
                      <li key={category.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(category.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] transition-colors",
                            selectedCategory === category.id
                              ? "bg-brand-soft font-semibold text-primary"
                              : "text-foreground/75 hover:bg-muted hover:text-primary",
                          )}
                        >
                          <span
                            className="line-clamp-2 flex-1 text-start text-[12.5px] leading-6"
                            data-no-auto-translate
                          >
                            {tt(category.name)}
                          </span>
                          <span className="nums shrink-0 text-[11px] text-muted-foreground">
                            {categoryCounts.get(category.id) ?? 0}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px bg-border" aria-hidden />

                <div>
                  <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("coursesPage.priceLabel")}
                  </h2>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                    {(
                      [
                        { key: "all", label: t("coursesPage.all") },
                        { key: "free", label: t("coursesPage.free") },
                        { key: "paid", label: t("coursesPage.paid") },
                      ] as { key: PriceFilter; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setPriceFilter(option.key)}
                        className={cn(
                          "rounded-lg px-1 py-1.5 text-[12px] font-medium transition-colors",
                          priceFilter === option.key
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" aria-hidden />

                <div>
                  <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("coursesPage.sortLabel")}
                  </h2>
                  <ul className="space-y-0.5">
                    {sortOptions.map((option) => (
                      <li key={option.key}>
                        <button
                          type="button"
                          onClick={() => setSort(option.key)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] transition-colors",
                            sort === option.key
                              ? "bg-brand-soft font-semibold text-primary"
                              : "text-foreground/75 hover:bg-muted hover:text-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              sort === option.key ? "bg-primary" : "bg-transparent",
                            )}
                            aria-hidden
                          />
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {(selectedCategory || priceFilter !== "all" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setPriceFilter("all");
                      setSearchQuery("");
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {t("coursesPage.clearFilters")}
                  </button>
                )}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-[13px] text-muted-foreground">
                  {t("coursesPage.results", { count: filteredCourses.length })}
                </p>
              </div>

            {coursesLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
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
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course, index) => {
                  const legacyTitle = getLocalizedCourseTitle(course, i18n.language, t);
                  const legacyDescription = getLocalizedCourseDescription(course, i18n.language, t);
                  const hasLegacyOverride = legacyTitle !== course.title;
                  const resolved = resolvePrice(
                    course.prices,
                    course.price,
                    i18n.language,
                    course.price_label,
                  );
                  const isFree = !resolved.label && (!resolved.amount || resolved.amount === 0);
                  const priceText = course.has_levels
                    ? perLevelLabel(i18n.language)
                    : formatPrice(resolved, i18n.language);
                  const courseCategory = categories?.find(
                    (category) => category.id === course.category_id,
                  );

                  return (
                    <CourseTranslation
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      updatedAt={course.updated_at ?? undefined}
                    >
                      {(autoTitle, autoDescription) => {
                        const courseTitle = hasLegacyOverride ? legacyTitle : autoTitle;
                        const courseDescription = hasLegacyOverride
                          ? legacyDescription
                          : autoDescription;

                        return (
                          <Reveal delay={Math.min(index, 5) * 50} className="h-full">
                            <CourseCard
                              href={`/courses/${course.id}`}
                              title={courseTitle}
                              description={courseDescription}
                              image={course.thumbnail_url}
                              featured={course.is_featured}
                              isFree={isFree}
                              priceText={priceText}
                              priceLabel={t("coursesPage.priceLabel")}
                              category={courseCategory ? tt(courseCategory.name) : null}
                              featuredLabel={t("coursesPage.featured")}
                              freeLabel={t("coursesPage.free")}
                              detailsLabel={t("coursesPage.viewDetails")}
                              isRtl={isRtl}
                            />
                          </Reveal>
                        );
                      }}
                    </CourseTranslation>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                  <BookOpen className="h-7 w-7" aria-hidden />
                </span>
                <h2 className="text-lg font-bold text-foreground">{t("coursesPage.noResults")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? t("coursesPage.tryOther") : t("coursesPage.comingSoon")}
                </p>
                {(searchQuery || selectedCategory) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    {t("coursesPage.all")}
                    <ArrowIcon className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;
