import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SmartImage from "@/components/site/SmartImage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Newspaper, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ar, enUS, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { getBlogImageFallback, getBlogImageUrl } from "@/lib/blogImageFallbacks";
import { useBlogListTranslation } from "@/hooks/useBlogListTranslation";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";
import type { Database } from "@/integrations/supabase/types";

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

const BlogPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" || i18n.language === "ur" ? ar : i18n.language === "fr" ? fr : enUS;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));

  useEffect(() => {
    setSelectedCategory(searchParams.get("category"));
  }, [searchParams]);

  const updateCategory = (catId: string | null) => {
    setSelectedCategory(catId);
    if (catId) setSearchParams({ category: catId });
    else setSearchParams({});
  };

  const { data: categories } = useQuery({
    queryKey: ["blog-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_categories").select("*").eq("is_active", true).order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = selectedCategory ? posts?.filter((p) => p.category_id === selectedCategory) : posts;

  // Auto-translate post title/excerpt/author_bio to current language
  const { map: tMap } = useBlogListTranslation(
    (filteredPosts || []).map((p) => ({
      id: p.id,
      version: p.updated_at,
      fields: [p.title, p.excerpt, p.author_bio],
    })),
  );
  const tr = (post: BlogPost, idx: number, fallback: string | null | undefined) =>
    tMap[post.id]?.[idx] || fallback || "";

  const { tt } = useTermsTranslation((categories || []).map((c) => c.name));

  const getCategoryName = (post: BlogPost) => {
    if (post.category_id && categories) {
      const cat = categories.find((c) => c.id === post.category_id);
      if (cat) return tt(cat.name);
    }
    return post.category ? tt(post.category) : null;
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="المدونة — مقالات وأبحاث تعليمية"
        description="مقالات وأبحاث من فريق رواسخ في التعليم والتدريب واللغة العربية والخدمات الأكاديمية — محتوى عربي موثوق ومتجدد."
        path="/blog"
        keywords={["مدونة تعليمية", "مقالات أكاديمية", "بحث علمي", "اللغة العربية", "رواسخ"]}
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
        <div className="shell relative z-10 py-6 lg:py-8">
          <div className="mx-auto max-w-2xl text-center animate-fade-in">
            <h1 className="text-balance text-3xl leading-[1.25] md:text-5xl font-bold text-foreground mb-4">
              {t("blogPage.title1")} <span className="text-primary">{t("blogPage.title2")}</span>
            </h1>
            <p className="mx-auto max-w-xl text-base leading-8 text-foreground/70 font-medium md:text-lg">{t("blogPage.subtitle")}</p>
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="py-4 border-b border-border">
          <div className="shell">
            <div className="md:hidden">
              <Select value={selectedCategory || "all"} onValueChange={(v) => updateCategory(v === "all" ? null : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("blogPage.selectCategory")} />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">{t("blogPage.all")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span data-no-auto-translate>{tt(cat.name)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:flex items-center gap-2.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => updateCategory(null)}
                className="chip"
                data-active={!selectedCategory}
              >
                {t("blogPage.all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateCategory(selectedCategory === cat.id ? null : cat.id)}
                  className="chip"
                  data-active={selectedCategory === cat.id}
                >
                  <span data-no-auto-translate>{tt(cat.name)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-8 lg:py-12">
        <div className="shell">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-[400px] rounded-xl" />))}
            </div>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, index) => {
                const imageSrc = getBlogImageUrl(post);
                const fallbackImageSrc = getBlogImageFallback(post);

                return (
                <Card
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/blog/${post.id}`); }}
                  className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${0.15 * (index + 1)}s`, animationFillMode: "both" }}
                >

                  <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/10 transition-all duration-500 overflow-hidden">
                    {imageSrc ? (
                      <SmartImage
                        src={imageSrc}
                        fallbackSrc={fallbackImageSrc}
                        alt={post.title}
                        width={640}
                        height={360}
                        widths={[320, 480, 640, 800, 1024]}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 92vw"
                        quality={72}
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Newspaper className="h-16 w-16 text-primary/40 group-hover:scale-110 transition-transform duration-500" />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      {getCategoryName(post) && (
                        <Badge variant="outline" className="text-xs border-primary/25 bg-primary/5 text-primary">
                          <span className="w-2 h-2 rounded-full inline-block ml-1 bg-primary" />
                          <span data-no-auto-translate>{getCategoryName(post)}</span>
                        </Badge>
                      )}
                      {post.read_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.read_time}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300" data-no-auto-translate>
                      {tr(post, 0, post.title)}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-no-auto-translate>{tr(post, 1, post.excerpt)}</p>
                    )}
                    {post.author_name && (
                      <div className="flex items-start gap-3 mb-4 p-3 bg-muted/40 rounded-lg">
                        {post.author_avatar_url ? (
                          <img
                            src={post.author_avatar_url}
                            alt={post.author_name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                            {post.author_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{post.author_name}</p>
                          {post.author_bio && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed" data-no-auto-translate>{tr(post, 2, post.author_bio)}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.created_at), "d MMMM yyyy", { locale: dateLocale })}
                      </span>
                      <Link to={`/blog/${post.id}`} className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all duration-300">
                        {t("blogPage.readMore")}
                        <ArrowLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <Newspaper className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                {selectedCategory ? t("blogPage.noResultsCategory") : t("blogPage.noResults")}
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;
