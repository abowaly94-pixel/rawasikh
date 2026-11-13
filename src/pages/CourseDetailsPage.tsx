import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl, courseJsonLd } from "@/lib/seo";
import SmartImage from "@/components/site/SmartImage";
import { optimizedImage } from "@/lib/image";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseShareButtons from "@/components/CourseShareButtons";
import ZoomLinksInlineManager from "@/components/ZoomLinksInlineManager";
import CourseReviewsSection from "@/components/CourseReviewsSection";
import ZoomJoinButton from "@/components/ZoomJoinButton";
import VideoEmbed from "@/components/VideoEmbed";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { resolvePrice, formatPrice, perLevelLabel, type PricesMap } from "@/lib/coursePrice";
import { getLocalizedCourseDescription, getLocalizedCourseTitle } from "@/lib/courseTranslations";
import { fixTrailingPunctuation } from "@/lib/bidiText";
import { useCourseTranslation } from "@/hooks/useCourseTranslation";
import {
  BookOpen,
  Clock,
  User,
  PlayCircle,
  Lock,
  CheckCircle,
  ArrowRight,
  ShoppingCart,
  GraduationCap,
  FileQuestion,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  updated_at: string;
  preview_video_url?: string | null;
  captions_url?: string | null;
  price: number;
  prices?: PricesMap | null;
  price_label?: string | null;
  is_featured: boolean;
  instructor_id: string | null;
  instructor_name?: string | null;
  has_levels?: boolean;
  requires_level_assessment?: boolean;
  level_assessment_id?: string | null;
}

interface CourseLevel {
  id: string;
  name: string;
  description: string | null;
  price: number;
  order_index: number;
  min_score: number | null;
  max_score: number | null;
  is_active: boolean;
}

interface CourseLevelPurchase {
  level_id: string;
  payment_status: string;
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  level_id: string | null;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
}

const CourseDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["course_sections", id],
    queryFn: async () => {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", id)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      const sectionsWithLessons = await Promise.all(
        sectionsData.map(async (section) => {
          const { data: lessons, error: lessonsError } = await supabase
            .from("course_lessons")
            .select("id, title, duration_minutes, is_free, order_index")
            .eq("section_id", section.id)
            .order("order_index");

          if (lessonsError) throw lessonsError;

          return {
            ...section,
            lessons: lessons || [],
          };
        })
      );

      return sectionsWithLessons as Section[];
    },
    enabled: !!id,
  });

  // Course levels (for multi-level courses)
  const { data: courseLevels } = useQuery({
    queryKey: ["course_levels_public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_levels")
        .select("*")
        .eq("course_id", id!)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as CourseLevel[];
    },
    enabled: !!id && !!course?.has_levels,
  });

  // User's purchased levels
  const { data: levelPurchases } = useQuery({
    queryKey: ["course_level_purchases", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_level_purchases")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as CourseLevelPurchase[];
    },
    enabled: !!user && !!id && !!course?.has_levels,
  });

  // User's level assessment for this course
  const { data: assessmentResult } = useQuery({
    queryKey: ["course_level_assessment", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("course_level_assessments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && !!course?.has_levels,
  });

  // Check for any purchase (pending or completed)
  const { data: purchase } = useQuery({
    queryKey: ["course_purchase", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("course_purchases")
        .select("*")
        .eq("course_id", id)
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && !course?.has_levels,
  });

  const isPurchased = purchase?.payment_status === "completed";
  const isPending = purchase?.payment_status === "pending";

  const purchasedLevelIds = new Set((levelPurchases || []).filter((p) => p.payment_status === "completed").map((p) => p.level_id));
  const pendingLevelIds = new Set((levelPurchases || []).filter((p) => p.payment_status === "pending").map((p) => p.level_id));

  const hasCourseAccess = isPurchased || purchasedLevelIds.size > 0;

  const { data: zoomLinks, isLoading: zoomLoading, isError: zoomError } = useQuery({
    queryKey: ["course_zoom_links", id, hasCourseAccess],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zoom_links" as any)
        .select("id, title, url, lesson_id, scheduled_at, duration_minutes, meeting_id, passcode")
        .eq("course_id", id!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!id && hasCourseAccess,
  });

  // Final exam for the whole course (quiz_type = 'final'), if one exists
  const { data: finalExam } = useQuery({
    queryKey: ["course_final_exam", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quiz_assignments" as any)
        .select("id, quiz_id, course_quizzes ( id, title, passing_score )")
        .eq("course_id", id!)
        .eq("quiz_type", "final")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...(data as any), quiz: (data as any).course_quizzes };
    },
    enabled: !!id && hasCourseAccess,
  });

  // Lesson completion progress, to know when the final exam unlocks
  const totalLessonsCount = (sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
  const { data: completedLessonIds = [] } = useQuery({
    queryKey: ["course_lesson_progress", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("course_id", id!)
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((p) => p.lesson_id);
    },
    enabled: !!user && !!id && hasCourseAccess && !!finalExam,
  });

  const { data: finalExamPassed } = useQuery({
    queryKey: ["course_final_exam_passed", finalExam?.quiz_id, user?.id],
    queryFn: async () => {
      if (!user || !finalExam) return false;
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("quiz_id", finalExam.quiz_id)
        .eq("passed", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!finalExam,
  });


  const getLevelPurchasePrice = (level: CourseLevel) => (level.price > 0 ? level.price : course?.price || 0);

  const handleBuyLevel = async (level: CourseLevel) => {
    if (!user) {
      toast.error(t("courseDetails.loginRequired"));
      navigate("/auth");
      return;
    }
    // Require placement assessment FIRST whenever a level assessment is linked
    if (course?.level_assessment_id && !assessmentResult) {
      toast.error(t("courseDetails.assessmentRequiredDescription"));
      navigate(`/level-assessment/${course.level_assessment_id}?courseId=${course.id}`);
      return;
    }
    // Enforce purchasing only the recommended level
    if (assessmentResult?.recommended_level_id && assessmentResult.recommended_level_id !== level.id) {
      toast.error(t("courseDetails.unavailableWrongLevel"));
      return;
    }
    // Add this level to cart and go to checkout
    addToCart({
      id: `${course!.id}:${level.id}`,
      name: `${course!.title} - ${level.name}`,
      price: getLevelPurchasePrice(level),
      image_url: course!.thumbnail_url,
      stock_quantity: 1,
      type: "course",
    });
    toast.success(t("courseDetails.levelAddedToCart"));
    navigate("/checkout");
  };


  const handlePurchase = async () => {
    if (!user) {
      toast.error(t("courseDetails.loginRequired"));
      navigate("/auth");
      return;
    }

    if (!course) return;

    setIsPurchasing(true);
    try {
      if (course.price === 0) {
        const { error } = await supabase.from("course_purchases").insert({
          user_id: user.id,
          course_id: course.id,
          amount_paid: 0,
          payment_status: "completed",
          payment_method: "free",
        });

        if (error) throw error;
        toast.success(t("courseDetails.purchaseSuccess"));
        navigate("/dashboard/my-courses");
      } else {
        // Paid courses: add to cart and go to checkout
        const localizedTitle = getLocalizedCourseTitle(course, i18n.language, t);
        addToCart({
          id: course.id,
          name: localizedTitle,
          price: course.price,
          image_url: course.thumbnail_url,
          stock_quantity: 1,
          type: "course",
        });
        navigate("/checkout");
      }
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        toast.error(t("courseDetails.alreadySubscribed"));
      } else {
        toast.error(t("courseDetails.purchaseError"));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleAddToCart = () => {
    if (!course) return;
    const localizedTitle = getLocalizedCourseTitle(course, i18n.language, t);
    addToCart({
      id: course.id,
      name: localizedTitle,
      price: course.price,
      image_url: course.thumbnail_url,
      stock_quantity: 1,
      type: "course",
    });
    toast.success(t("courseDetails.courseAddedToCart"));
  };

  const totalLessons = sections?.reduce((acc, section) => acc + section.lessons.length, 0) || 0;
  const totalDuration = sections?.reduce(
    (acc, section) => acc + section.lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0),
    0
  ) || 0;
  const legacyCourseTitle = course ? getLocalizedCourseTitle(course, i18n.language, t) : "";
  const legacyCourseDescription = course ? getLocalizedCourseDescription(course, i18n.language, t) : "";
  const hasLegacyCourseOverride = !!course && legacyCourseTitle !== course.title;
  const { translated: autoCourseTranslated } = useCourseTranslation(
    course?.id,
    [course?.title || "", course?.description || ""],
    "ar",
    String((course as any)?.updated_at || ""),
  );
  const courseTitle = hasLegacyCourseOverride ? legacyCourseTitle : (autoCourseTranslated[0] || legacyCourseTitle);
  const courseDescription = hasLegacyCourseOverride ? legacyCourseDescription : (autoCourseTranslated[1] || legacyCourseDescription);
  const isRtl = i18n.dir() === "rtl";
  const safeCourseDescription = fixTrailingPunctuation(courseDescription, isRtl);

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shell py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 mt-6" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shell py-12 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("courseDetails.notFoundTitle")}</h1>
          <p className="text-muted-foreground mb-6">{t("courseDetails.notFoundDescription")}</p>
          <Button onClick={() => navigate("/courses")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            {t("courseDetails.backToCourses")}
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {course && (
        <Helmet>
          <title>{course.title} — رواسخ</title>
          <meta name="description" content={(course.description || "").replace(/<[^>]+>/g, " ").slice(0, 160)} />
          <link rel="canonical" href={`https://rawasikheg.com/courses/${course.id}`} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={course.title} />
          <meta property="og:description" content={(course.description || "").replace(/<[^>]+>/g, " ").slice(0, 200)} />
          <meta property="og:url" content={`https://rawasikheg.com/courses/${course.id}`} />
          {course.thumbnail_url && (
            <meta
              property="og:image"
              content={absoluteUrl(
                optimizedImage(course.thumbnail_url, { width: 1200, height: 630 }),
              )}
            />
          )}
          {course.thumbnail_url && (
            <meta
              property="og:image:secure_url"
              content={absoluteUrl(
                optimizedImage(course.thumbnail_url, { width: 1200, height: 630 }),
              )}
            />
          )}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={course.title} />
          {course.thumbnail_url && (
            <meta
              name="twitter:image"
              content={absoluteUrl(
                optimizedImage(course.thumbnail_url, { width: 1200, height: 630 }),
              )}
            />
          )}
          <meta name="robots" content="index, follow, max-image-preview:large" />
          <script type="application/ld+json">
            {JSON.stringify(
              courseJsonLd({
                name: course.title,
                description: course.description,
                image: course.thumbnail_url,
                url: `/courses/${course.id}`,
                price: typeof (course as { price?: number }).price === "number" ? (course as { price?: number }).price : null,
              }),
            )}
          </script>
        </Helmet>
      )}
      <Header />
      
      <main className="flex-1">
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

          <div className="shell relative py-8 lg:py-12">
            <nav
              className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground"
              aria-label="مسار التنقل"
            >
              <Link to="/" className="transition-colors hover:text-primary">
                {t("nav.home")}
              </Link>
              <span aria-hidden>/</span>
              <Link to="/courses" className="transition-colors hover:text-primary">
                {t("nav.courses")}
              </Link>
              <span aria-hidden>/</span>
              <span className="line-clamp-1 font-medium text-foreground">{courseTitle}</span>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-ink shadow-md">
                  {course.preview_video_url ? (
                    <VideoEmbed
                      url={course.preview_video_url}
                      title={courseTitle}
                      autoplay
                      captions={(course as any).captions}
                      captionsUrl={(course as any).captions_url}
                    />
                  ) : course.thumbnail_url ? (
                    <div className="aspect-video">
                      <SmartImage
                        src={course.thumbnail_url}
                        alt={courseTitle}
                        width={1280}
                        height={720}
                        sizes="(min-width: 1024px) 720px, 100vw"
                        quality={78}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full h-full flex items-center justify-center">
                      <BookOpen className="h-24 w-24 text-muted-foreground/50" />
                    </div>
                  )}

                  {course.is_featured && (
                    <span className="absolute start-4 top-4 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
                      {t("courseDetails.featuredCourse")}
                    </span>
                  )}
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h1 className="order-2 flex-1 text-[26px] font-bold leading-[1.3] text-foreground sm:order-1 sm:text-[32px] lg:text-[36px]">
                    {courseTitle}
                  </h1>
                  <div className="order-1 self-end sm:order-2 sm:self-auto">
                    <CourseShareButtons title={courseTitle} courseId={course.id} />
                  </div>
                </div>

                <div className="rule-gold" aria-hidden />

                {safeCourseDescription && (
                  <p
                    className="mt-4 text-[14.5px] leading-8 text-muted-foreground"
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    {safeCourseDescription}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-foreground/80">
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                    {t("courseDetails.lessonCount", { count: totalLessons })}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-foreground/80">
                    <Clock className="h-4 w-4 text-primary" aria-hidden />
                    {t("courseDetails.durationLabel", {
                      hours: Math.floor(totalDuration / 60),
                      minutes: totalDuration % 60,
                    })}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-foreground/80">
                    <User className="h-4 w-4 text-primary" aria-hidden />
                    {course.instructor_name?.trim() || t("courseDetails.instructorSpecialist")}
                  </span>
                </div>
              </div>

              {/* Purchase Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-28 overflow-hidden rounded-2xl border border-border bg-card shadow-md">
                  <div className="h-1 w-full bg-gradient-to-l from-gold via-gold/50 to-transparent" aria-hidden />
                  {course.has_levels ? (
                    <>
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">
                          {t("courseDetails.levelsAvailable")}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {t("courseDetails.chooseLevel")}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {course.level_assessment_id && !assessmentResult && (
                          <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm space-y-2">
                            <p className="font-medium">{t("courseDetails.assessmentRequiredTitle")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("courseDetails.assessmentRequiredDescription")}
                            </p>
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                if (!user) {
                                  toast.error(t("courseDetails.loginForAssessment"));
                                  navigate(`/auth?redirect=/courses/${course.id}`);
                                  return;
                                }
                                navigate(`/level-assessment/${course.level_assessment_id}?courseId=${course.id}`);
                              }}
                            >
                              {user ? t("courseDetails.startAssessment") : t("courseDetails.signInToStartAssessment")}
                            </Button>
                          </div>
                        )}

                        {assessmentResult && (
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                            <p className="font-medium text-primary">{t("courseDetails.assessmentResult", { score: assessmentResult.score })}</p>
                            {assessmentResult.recommended_level_id && courseLevels && (
                              <p className="text-muted-foreground mt-1">
                                {t("courseDetails.recommendedLevel", { level: courseLevels.find(l => l.id === assessmentResult.recommended_level_id)?.name })}
                              </p>
                            )}
                          </div>
                        )}

                        {courseLevels && courseLevels.length > 0 ? (
                          courseLevels.map((level) => {
                            const owned = purchasedLevelIds.has(level.id);
                            const pendingL = pendingLevelIds.has(level.id);
                            const isRecommended = assessmentResult?.recommended_level_id === level.id;
                            const levelPurchasePrice = getLevelPurchasePrice(level);
                            return (
                              <div
                                key={level.id}
                                className={`rounded-lg border p-3 ${isRecommended ? "border-primary bg-primary/5" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold">{level.name}</h4>
                                      {isRecommended && (
                                        <Badge variant="secondary" className="text-xs">{t("courseDetails.recommended")}</Badge>
                                      )}
                                    </div>
                                    {level.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{fixTrailingPunctuation(level.description, isRtl)}</p>
                                    )}
                                  </div>
                                  <div className="text-primary font-bold whitespace-nowrap">
                                    {formatPrice(resolvePrice((level as any).prices, levelPurchasePrice, i18n.language, (level as any).price_label), i18n.language)}
                                  </div>
                                </div>
                                {owned ? (
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={async () => {
                                      const { data: levelSections } = await supabase
                                        .from("course_sections")
                                        .select("id")
                                        .eq("course_id", course!.id)
                                        .eq("level_id", level.id)
                                        .order("order_index");
                                      if (levelSections && levelSections.length > 0) {
                                        const { data: firstLesson } = await supabase
                                          .from("course_lessons")
                                          .select("id")
                                          .eq("section_id", levelSections[0].id)
                                          .order("order_index")
                                          .limit(1)
                                          .maybeSingle();
                                        if (firstLesson) {
                                          navigate(`/courses/${course!.id}/lessons/${firstLesson.id}`);
                                          return;
                                        }
                                      }
                                      toast.error(t("courseDetails.noLessonsInLevel"));
                                    }}
                                  >
                                    <PlayCircle className="ml-2 h-4 w-4" />
                                    {t("courseDetails.startLearning")}
                                  </Button>
                                ) : pendingL ? (
                                  <Button size="sm" variant="outline" className="w-full" disabled>
                                    <Clock className="ml-2 h-4 w-4 text-yellow-600" />
                                    {t("courseDetails.pendingReview")}
                                  </Button>
                                ) : assessmentResult?.recommended_level_id && assessmentResult.recommended_level_id !== level.id ? (
                                  <Button size="sm" variant="outline" className="w-full" disabled>
                                    <Lock className="ml-2 h-4 w-4 text-muted-foreground" />
                                    {t("courseDetails.unavailableWrongLevel")}
                                  </Button>
                                ) : levelPurchasePrice === 0 ? (
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleBuyLevel(level)}
                                  >
                                    <PlayCircle className="ml-2 h-4 w-4" />
                                    {t("courseDetails.startLearning")}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleBuyLevel(level)}
                                  >
                                    <ShoppingCart className="ml-2 h-4 w-4" />
                                    {t("courseDetails.buyLevel")}
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {t("courseDetails.noLevels")}
                          </p>
                        )}
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <CardHeader className="gap-1">
                        <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("coursesPage.priceLabel")}
                        </span>
                        <CardTitle className="nums text-[30px] font-bold text-primary">
                          {formatPrice(resolvePrice(course.prices, course.price, i18n.language, course.price_label), i18n.language)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isPurchased ? (
                          <>
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span>{t("courseDetails.subscribed")}</span>
                            </div>
                            {sections && sections.length > 0 && sections[0].lessons.length > 0 ? (
                              <Button
                                className="w-full"
                                size="lg"
                                onClick={() => navigate(`/courses/${id}/lessons/${sections[0].lessons[0].id}`)}
                              >
                                <PlayCircle className="ml-2 h-5 w-5" />
                                {t("courseDetails.startLearning")}
                              </Button>
                            ) : (
                              <Button className="w-full" size="lg" onClick={() => navigate("/dashboard/my-courses")}>
                                {t("courseDetails.continueLearning")}
                              </Button>
                            )}
                          </>
                        ) : isPending ? (
                          <>
                            <div className="flex items-center gap-2 text-yellow-600">
                              <Clock className="h-5 w-5" />
                              <span>{t("courseDetails.requestPending")}</span>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                              {t("courseDetails.activationAfterAdminConfirm")}
                            </p>
                          </>
                        ) : (
                          <>
                            {course.price === 0 ? (
                              <Button
                                className="w-full"
                                size="lg"
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                              >
                                <ShoppingCart className="ml-2 h-5 w-5" />
                                {isPurchasing ? t("courseDetails.processing") : t("courseDetails.subscribeFree")}
                              </Button>
                            ) : (
                              <div className="space-y-3">
                                <Button
                                  className="w-full"
                                  size="lg"
                                  onClick={handlePurchase}
                                  disabled={isPurchasing}
                                >
                                  <ShoppingCart className="ml-2 h-5 w-5" />
                                  {isPurchasing ? t("courseDetails.processing") : t("courseDetails.buyNow")}
                                </Button>
                                <Button
                                  className="w-full"
                                  size="lg"
                                  variant="outline"
                                  onClick={handleAddToCart}
                                >
                                  <ShoppingCart className="ml-2 h-5 w-5" />
                                  {t("courseDetails.addToCart")}
                                </Button>
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground text-center">
                              {t("courseDetails.fullAccessAfterPayment")}
                            </p>
                          </>
                        )}

                        <div className="border-t pt-4 space-y-2">
                          <p className="font-medium">{t("courseDetails.courseIncludes")}</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {t("courseDetails.lifetimeAccess")}
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {t("courseDetails.completionCertificate")}
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {t("courseDetails.technicalSupport")}
                            </li>
                          </ul>
                        </div>
                      </CardContent>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin inline zoom manager */}
        <section className="py-4">
          <div className="shell">
            <ZoomLinksInlineManager courseId={id!} />
          </div>
        </section>

        {/* Zoom Sessions block */}
        <section className="py-4">
          <div className="shell">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  {t("courseDetails.zoomSessionsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!user ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-background border text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    {t("courseDetails.zoomLoginRequired")}
                  </div>
                ) : !hasCourseAccess ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-background border text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    {t("courseDetails.zoomAccessRestricted")}
                  </div>
                ) : zoomLoading ? (
                  <>
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </>
                ) : zoomError ? (
                  <div className="p-4 rounded-lg bg-background border text-sm text-destructive">
                    {t("courseDetails.zoomLoadError")}
                  </div>
                ) : !zoomLinks || zoomLinks.length === 0 ? (
                  <div className="p-4 rounded-lg bg-background border text-sm text-muted-foreground text-center">
                    {t("courseDetails.zoomEmpty")}
                  </div>
                ) : (
                  zoomLinks.map((z: any) => {
                    const when = z.scheduled_at ? new Date(z.scheduled_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : null;
                    return (
                      <div key={z.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{z.title}</span>
                            {z.lesson_id && (
                              <Badge variant="outline" className="text-xs shrink-0">{t("courseDetails.linkedToLesson")}</Badge>
                            )}
                          </div>
                          {when && (
                            <div className="text-xs text-muted-foreground pr-6">
                              🗓️ {when}{z.duration_minutes ? ` • ${t("courseDetails.minuteCount", { count: z.duration_minutes })}` : ""}
                            </div>
                          )}
                          {(z.meeting_id || z.passcode) && (
                            <div className="text-xs text-muted-foreground pr-6 flex items-center gap-3 flex-wrap" dir="ltr">
                              {z.meeting_id && <span>Meeting ID: {z.meeting_id}</span>}
                              {z.passcode && <span>Passcode: {z.passcode}</span>}
                            </div>
                          )}
                        </div>
                        <ZoomJoinButton url={z.url} title={z.title} zoomLinkId={z.id} courseId={id} lessonId={z.lesson_id} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final exam block */}
        {finalExam && hasCourseAccess && (
          <section className="py-4">
            <div className="shell">
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-amber-600" />
                    {t("courseDetails.finalExamTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allDone = totalLessonsCount > 0 && completedLessonIds.length >= totalLessonsCount;
                    return (
                      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-background border">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!allDone ? (
                              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : finalExamPassed ? (
                              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <FileQuestion className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <span className="font-medium">{finalExam.quiz?.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pr-6">
                            {!allDone
                              ? t("courseDetails.finalExamLockedProgress", { completed: completedLessonIds.length, total: totalLessonsCount })
                              : finalExamPassed
                              ? t("courseDetails.finalExamPassedLabel")
                              : t("courseDetails.finalExamPassingScore", { score: finalExam.quiz?.passing_score })}
                          </p>
                        </div>
                        <Button
                          disabled={!allDone}
                          onClick={() => navigate(`/courses/${id}/quiz/${finalExam.quiz_id}`)}
                        >
                          {finalExamPassed ? t("courseDetails.reviewResult") : t("courseDetails.startExam")}
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </section>
        )}


        {/* Course Content */}

        <section className="py-12 lg:py-16">
          <div className="shell">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-bold text-foreground sm:text-[28px]">
                  {t("courseDetails.courseContent")}
                </h2>
                <div className="rule-gold mt-3" aria-hidden />
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                {t("courseDetails.lessonCount", { count: totalLessons })}
              </p>
            </div>

            {sections && sections.length > 0 ? (
              course.has_levels && courseLevels && courseLevels.length > 0 ? (
                <div className="space-y-8">
                  {courseLevels.map((level) => {
                    const levelSections = sections.filter((s) => s.level_id === level.id);
                    const owned = purchasedLevelIds.has(level.id);
                    return (
                      <div key={level.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-foreground">{level.name}</h3>
                          {!owned && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 ml-1" />
                              {t("courseDetails.requiresSubscription")}
                            </Badge>
                          )}
                        </div>
                        {levelSections.length > 0 ? (
                          <Accordion type="multiple" className="space-y-3">
                            {levelSections.map((section) => (
                              <AccordionItem key={section.id} value={section.id} className="rounded-xl border border-border bg-card px-4 transition-colors hover:border-primary/25">
                                <AccordionTrigger className="text-[15px] font-semibold hover:no-underline">
                                  {section.title}
                                  <span className="me-2 text-[12.5px] font-normal text-muted-foreground">
                                    {t("courseDetails.lessonsCountParen", { count: section.lessons.length })}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ul className="space-y-2">
                                    {section.lessons.map((lesson) => {
                                      const canWatch = lesson.is_free || owned;
                                      return (
                                        <li
                                          key={lesson.id}
                                          onClick={() => canWatch && navigate(`/courses/${id}/lessons/${lesson.id}`)}
                                          className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors ${
                                            canWatch ? "cursor-pointer hover:bg-muted" : ""
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            {canWatch ? (
                                              <PlayCircle className="h-5 w-5 text-primary" />
                                            ) : (
                                              <Lock className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className="font-medium">{lesson.title}</span>
                                            {lesson.is_free && (
                                              <Badge variant="outline" className="text-xs">{t("courseDetails.free")}</Badge>
                                            )}
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            {t("courseDetails.minuteCount", { count: lesson.duration_minutes })}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <Card className="p-6 text-center">
                            <p className="text-sm text-muted-foreground">{t("courseDetails.noLevelContent")}</p>
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="rounded-xl border border-border bg-card px-4 transition-colors hover:border-primary/25">
                      <AccordionTrigger className="text-[15px] font-semibold hover:no-underline">
                        {section.title}
                        <span className="me-2 text-[12.5px] font-normal text-muted-foreground">
                          {t("courseDetails.lessonsCountParen", { count: section.lessons.length })}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {section.lessons.map((lesson) => {
                            const canWatch = lesson.is_free || isPurchased || course.price === 0;
                            return (
                              <li
                                key={lesson.id}
                                onClick={() => canWatch && navigate(`/courses/${id}/lessons/${lesson.id}`)}
                                className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors ${
                                  canWatch ? "cursor-pointer hover:bg-muted" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {canWatch ? (
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{lesson.title}</span>
                                  {lesson.is_free && (
                                    <Badge variant="outline" className="text-xs">{t("courseDetails.free")}</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {t("courseDetails.minuteCount", { count: lesson.duration_minutes })}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )
            ) : (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">{t("courseDetails.contentComingSoon")}</p>
              </Card>
            )}
          </div>
        </section>

        {/* Student reviews */}
        <CourseReviewsSection courseId={id!} isPurchased={hasCourseAccess} />
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetailsPage;
