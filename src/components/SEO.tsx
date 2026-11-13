import { Helmet } from "react-helmet-async";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export interface SEOProps {
  /** Page title without the brand suffix. */
  title: string;
  description?: string;
  /** Route path beginning with "/" — used for the canonical URL. */
  path?: string;
  /** Absolute or root-relative preview image. */
  image?: string | null;
  type?: "website" | "article" | "course";
  noIndex?: boolean;
  keywords?: string[];
  /** Schema.org object(s) serialised as JSON-LD. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const jsonLdFor = (jsonLd?: SEOProps["jsonLd"]) => {
  if (!jsonLd) return null;
  const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return (
    <script type="application/ld+json">
      {JSON.stringify(items.length === 1 ? items[0] : items)}
    </script>
  );
};

/**
 * Per-page metadata. Rendered through react-helmet-async so it is replaced on
 * every navigation without leaking tags from the previous route.
 */
const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = "website",
  noIndex,
  keywords,
  jsonLd,
}: SEOProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = path ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : SITE_URL;
  const ogImage = image ? absoluteUrl(image) : DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      <link rel="canonical" href={canonical} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ar_EG" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={fullTitle} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@rawasikh" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdFor(jsonLd)}
    </Helmet>
  );
};

export default SEO;
