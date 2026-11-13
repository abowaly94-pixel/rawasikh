/**
 * Shared SEO constants and Schema.org builders.
 * Kept free of React so it can be imported anywhere without breaking
 * fast-refresh boundaries.
 */

export const SITE_URL = "https://rawasikheg.com";
export const SITE_NAME = "رواسخ";
export const DEFAULT_DESCRIPTION =
  "رواسخ شركة مصرية متخصصة في التعليم والتدريب وتنمية المهارات، تقدم منظومة متكاملة من الخدمات التعليمية والأكاديمية.";
export const DEFAULT_IMAGE = `${SITE_URL}/social-share.webp`;

/** Turn a root-relative path into an absolute URL. */
export const absoluteUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

/** Schema.org Course, used on course detail and listing pages. */
export const courseJsonLd = (course: {
  name: string;
  description?: string | null;
  image?: string | null;
  url: string;
  price?: number | null;
  currency?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: course.name,
  description: course.description || undefined,
  image: course.image ? absoluteUrl(course.image) : undefined,
  url: absoluteUrl(course.url),
  provider: {
    "@type": "Organization",
    name: SITE_NAME,
    sameAs: SITE_URL,
  },
  ...(typeof course.price === "number"
    ? {
        offers: {
          "@type": "Offer",
          price: course.price,
          priceCurrency: course.currency || "EGP",
          availability: "https://schema.org/InStock",
          url: absoluteUrl(course.url),
        },
      }
    : {}),
});

/** Schema.org BreadcrumbList for nested pages. */
export const breadcrumbJsonLd = (items: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});
