/**
 * Image delivery helpers.
 *
 * Supabase Storage exposes an on-the-fly render endpoint that can resize,
 * crop and re-encode images. Serving a 640px WebP instead of a 2MB original
 * is the single biggest win for page speed on this site, since almost every
 * course cover and blog hero lives in Supabase Storage.
 *
 * Every helper degrades gracefully: anything that is not a Supabase public
 * object URL is returned untouched, so local imports, data URLs and external
 * CDNs keep working exactly as before.
 */

const STORAGE_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

export type ImageResize = "cover" | "contain" | "fill";

export interface ImageOptions {
  /** Target width in CSS pixels (multiply by 2 for retina when needed). */
  width?: number;
  /** Target height. Omit to keep the intrinsic ratio. */
  height?: number;
  /** 1-100. 70-78 is the sweet spot for photographic content. */
  quality?: number;
  resize?: ImageResize;
  format?: "webp" | "avif" | "origin";
}

/** True when the URL can be transformed by Supabase's image renderer. */
export function isTransformableImage(src?: string | null): boolean {
  if (!src) return false;
  if (!src.includes(STORAGE_PUBLIC)) return false;
  // SVG and animated GIF keep their original bytes.
  return !/\.(svg|gif)(\?|$)/i.test(src);
}

/** Build an optimised URL for a Supabase-hosted image. */
export function optimizedImage(src?: string | null, options: ImageOptions = {}): string {
  if (!src) return "";
  if (!isTransformableImage(src)) return src;

  const { width, height, quality = 74, resize = "cover", format = "webp" } = options;

  let url = src;
  try {
    const parsed = new URL(src);
    parsed.pathname = parsed.pathname.replace(STORAGE_PUBLIC, RENDER_PUBLIC);

    if (width) parsed.searchParams.set("width", String(Math.round(width)));
    if (height) parsed.searchParams.set("height", String(Math.round(height)));
    // The resize mode only applies to a width+height box. Sending it with a
    // width alone makes Supabase keep the original height and distort the
    // image, so omit it for proportional resizing.
    if (width && height) parsed.searchParams.set("resize", resize);
    if (quality) parsed.searchParams.set("quality", String(quality));
    if (format !== "origin") parsed.searchParams.set("format", format);

    url = parsed.toString();
  } catch {
    return src;
  }

  return url;
}

/**
 * Build a `srcSet` for responsive images.
 * Every candidate gets the same aspect ratio as the rendered box, because
 * Supabase's renderer uses the original height when only `width` is supplied
 * and returns a narrow vertical crop. Passing width+height keeps the framing
 * consistent across breakpoints.
 */
export function imageSrcSet(
  src?: string | null,
  widths: number[] = [320, 480, 640, 800, 1024, 1280],
  options: Omit<ImageOptions, "width" | "height"> = {},
  aspectRatio = 16 / 9,
): string | undefined {
  if (!src || !isTransformableImage(src)) return undefined;
  return widths
    .map((width) => {
      const height = Math.max(1, Math.round(width / aspectRatio));
      return `${optimizedImage(src, { ...options, width, height })} ${width}w`;
    })
    .join(", ");
}

/** A sensible `sizes` value for a card that fills 1 / 2 / 3 / 4 columns. */
export const CARD_IMAGE_SIZES =
  "(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw";

/** Full-width editorial imagery (blog hero, course banner). */
export const WIDE_IMAGE_SIZES = "(min-width: 1024px) 960px, 100vw";
