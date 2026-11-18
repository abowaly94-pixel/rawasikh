import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { absoluteUrl, DEFAULT_IMAGE } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";
import { getBlogImageFallback, getBlogImageUrl } from "@/lib/blogImageFallbacks";
import { useBlogTranslation } from "@/hooks/useBlogTranslation";
import BlogShareButtons from "@/components/blog/BlogShareButtons";
import BlogLikeButton from "@/components/blog/BlogLikeButton";
import BlogComments from "@/components/blog/BlogComments";
import ArticleTable from "@/components/blog/ArticleTable";
import ArticleBlocks from "@/components/blog/ArticleBlocks";
import { firstArticleImage, parseArticleBlocks } from "@/lib/articleBlocks";
import { orderLegacyArticleSections } from "@/lib/articleLayout";


const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" || i18n.language === "ur" ? ar : i18n.language === "fr" ? fr : enUS;

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: category } = useQuery({
    queryKey: ["blog-category", post?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .eq("id", post!.category_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!post?.category_id,
  });

  // Track & display view count. Increments once per browser per post.
  const [viewCount, setViewCount] = useState<number | null>(null);
  useEffect(() => {
    if (!post?.id) return;
    setViewCount((post as { view_count?: number }).view_count ?? 0);
    const key = `blog-viewed:${post.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase
      .rpc("increment_blog_view", { _post_id: post.id })
      .then(({ data }) => {
        if (typeof data === "number") setViewCount(data);
      });
  }, [post?.id]);


  const imageSrc = post ? getBlogImageUrl(post) : null;
  const fallbackImageSrc = post ? getBlogImageFallback(post) : null;
  
  const articleBlocks = useMemo(
    () => parseArticleBlocks(post?.article_blocks),
    [post?.article_blocks],
  );

  // Resolve the poster for share previews: featured image first, then an
  // image inside the article, then the site social card.
  const posterImage = useMemo(() => {
    const explicitImage = (post?.image_url || "").trim();
    if (explicitImage && imageSrc && !explicitImage.includes("/wp-content/uploads/")) {
      return imageSrc;
    }
    return firstArticleImage(articleBlocks, post?.content) || imageSrc || fallbackImageSrc || DEFAULT_IMAGE;
  }, [articleBlocks, fallbackImageSrc, imageSrc, post?.content, post?.image_url]);

  // Auto-translate ONLY genuine prose content: [title, content, author_bio, excerpt].
  // Proper names (author_name) and category names are deliberately excluded —
  // see the comment on FIELD_ORDER in useBlogTranslation.ts for why.
  const { translated, loading: translating } = useBlogTranslation(
    post?.id,
    post ? [post.title, post.content, post.author_bio, post.excerpt] : [],
    "ar",
    String(post?.updated_at || ""),
  );
  const tTitle = translated[0] || post?.title || "";
  const tContent = translated[1] || post?.content || "";
  const tAuthorBio = translated[2] || post?.author_bio || "";
  // Legacy (pre-blocks) HTML can end with its summary after the references.
  // Normalise the reading order at display time without rewriting storage.
  const legacyContent = useMemo(() => orderLegacyArticleSections(tContent), [tContent]);
  // A person's name is an atomic value, never machine-translated — it always
  // renders exactly as stored, in every language, for every author.
  const tAuthorName = post?.author_name || "";
  // The structured blocks are authored in Arabic. Other languages keep
  // reading the translated HTML content that is generated when the post is
  // saved from the block editor.
  const showArticleBlocks = articleBlocks.length > 0 && (i18n.language || "").startsWith("ar");
  // Same shared, cached term-translation path the article list uses for
  // categories, so the category name is always worded identically in both
  // places instead of being translated twice, independently, by two systems.
  const { tt } = useTermsTranslation([category?.name]);
  const tCategoryName = tt(category?.name);

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {post && (
        <Helmet>
          <title>{post.title} — رواسخ</title>
          <meta name="description" content={((post.excerpt || post.content || "") as string).replace(/<[^>]+>/g, " ").slice(0, 160)} />
          <link rel="canonical" href={`https://rawasikheg.com/blog/${post.id}`} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={post.title} />
          <meta property="og:description" content={((post.excerpt || post.content || "") as string).replace(/<[^>]+>/g, " ").slice(0, 200)} />
          <meta property="og:url" content={`https://rawasikheg.com/blog/${post.id}`} />
          {posterImage && <meta property="og:image" content={absoluteUrl(posterImage)} />}
          {posterImage && <meta property="og:image:secure_url" content={absoluteUrl(posterImage)} />}
          {posterImage && <meta property="og:image:width" content="1200" />}
          {posterImage && <meta property="og:image:height" content="630" />}
          {posterImage && <meta property="og:image:alt" content={post.title} />}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={post.title} />
          <meta name="twitter:description" content={((post.excerpt || post.content || "") as string).replace(/<[^>]+>/g, " ").slice(0, 200)} />
          {posterImage && <meta name="twitter:image" content={absoluteUrl(posterImage)} />}
          {posterImage && <meta name="twitter:image:alt" content={post.title} />}
          <meta name="robots" content="index, follow, max-image-preview:large" />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: ((post.excerpt || post.content || "") as string)
                .replace(/<[^>]+>/g, " ")
                .slice(0, 200),
              image: posterImage ? [absoluteUrl(posterImage)] : undefined,
              datePublished: post.created_at,
              dateModified: post.updated_at || post.created_at,
              author: {
                "@type": post.author_name ? "Person" : "Organization",
                name: post.author_name || "رواسخ",
              },
              publisher: {
                "@type": "Organization",
                name: "رواسخ",
                logo: {
                  "@type": "ImageObject",
                  url: "https://rawasikheg.com/icon-512.png",
                },
              },
              mainEntityOfPage: `https://rawasikheg.com/blog/${post.id}`,
            })}
          </script>
        </Helmet>
      )}
      <Header />

      <div className="mx-auto w-full max-w-4xl px-5 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowRight className="h-4 w-4" />
          {t("blogPostPage.backToBlog")}
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : post ? (
          <article className="animate-fade-in">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {category && (
                <Badge
                  variant="outline"
                  className="border-primary/25 bg-primary/5 text-primary"
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block ml-1 bg-primary"
                  />
                  <span data-no-auto-translate>{tCategoryName}</span>
                </Badge>
              )}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.created_at), "d MMMM yyyy", { locale: dateLocale })}
              </span>
              {post.read_time && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.read_time}
                </span>
              )}

            </div>

            {/* Title */}
            {translating ? (
              <Skeleton className="h-10 w-3/4 mb-6" />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-[1.4]" data-no-auto-translate>
                {tTitle}
              </h1>
            )}

            {/* Featured image */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt={post.title}
                width={1280}
                height={720}
                className="mb-8 aspect-video w-full rounded-2xl bg-muted/30 object-cover object-center shadow-sm ring-1 ring-border/60"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (fallbackImageSrc && target.src !== fallbackImageSrc) {
                    target.src = fallbackImageSrc;
                    return;
                  }
                  target.style.display = "none";
                }}
              />
            )}

            {/* Actions: Like + Share + Views */}
            <div className="flex items-center gap-2 mb-6">
              <BlogLikeButton postId={post.id} />
              <BlogShareButtons title={post.title} postId={post.id} />
              {viewCount !== null && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-md px-3 h-9">
                  <Eye className="h-4 w-4" />
                  {viewCount.toLocaleString(i18n.language === "ar" ? "ar-EG" : i18n.language)}
                </span>
              )}
            </div>

            {/* Content
                Arabic readers get the structured blocks (footnote/reference
                links included). Other languages keep the translated HTML
                that is generated from those blocks on save. */}
            {translating ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : showArticleBlocks ? (
              <ArticleBlocks blocks={articleBlocks} className="mb-6" />
            ) : (
              <div
                className="article-rich prose prose-lg dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-line
                  prose-headings:text-foreground prose-p:text-muted-foreground
                  prose-a:text-primary prose-a:underline prose-a:cursor-pointer hover:prose-a:text-primary/80
                  prose-strong:text-foreground
                  prose-img:rounded-lg prose-img:mx-auto
                  [&_a]:pointer-events-auto [&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer"
                data-no-auto-translate
                dangerouslySetInnerHTML={{ __html: legacyContent || "" }}
              />
            )}

            {/* Optional legacy article table. Hidden when the structured
                editor is in use, because its own table blocks are already
                rendered above. */}
            {!showArticleBlocks && post.is_table_visible && (
              <ArticleTable data={post.table_data} />
            )}

            {/* Author info */}
            {post.author_name && (
              <div className="flex items-start gap-4 p-5 bg-muted/40 rounded-xl my-8 border border-border">
                {post.author_avatar_url ? (
                  <img
                    src={post.author_avatar_url}
                    alt={post.author_name}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xl">
                    {post.author_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">{t("blogPostPage.writtenBy")}</p>
                  <h3 className="text-base font-bold text-foreground mb-2" data-no-auto-translate>{tAuthorName}</h3>
                  {post.author_bio && (
                    <p className="text-sm text-muted-foreground leading-relaxed" data-no-auto-translate>{tAuthorBio}</p>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <BlogComments postId={post.id} />
          </article>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t("blogPostPage.articleNotFound")}</p>
            <Link to="/blog" className="text-primary mt-4 inline-block">
              {t("blogPostPage.backToBlog")}
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
