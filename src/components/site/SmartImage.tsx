import { useMemo, useState } from "react";
import { optimizedImage, imageSrcSet, type ImageOptions } from "@/lib/image";
import { cn } from "@/lib/utils";

export interface SmartImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  src?: string | null;
  /** Rendered width in CSS pixels. Used for the intrinsic width/height. */
  width: number;
  /** Rendered height in CSS pixels. */
  height: number;
  /** Responsive widths to offer in the srcSet. */
  widths?: number[];
  /** Layout hint for the browser, e.g. "(min-width: 1024px) 30vw, 100vw". */
  sizes?: string;
  /** Transform quality, 1-100. */
  quality?: number;
  /** Used when both the optimised and the original URL fail. */
  fallbackSrc?: string | null;
  /** Aspect ratio class such as "aspect-[16/10]"; also reserves layout space. */
  ratioClassName?: string;
  /** Wrapper classes, applied only when a ratio/wrapper is requested. */
  wrapperClassName?: string;
  /** Class applied to the inner <img>. */
  className?: string;
}

/**
 * Responsive image that serves WebP derivatives from Supabase Storage and
 * degrades in three steps: optimised URL → original URL → local fallback.
 * That keeps cards intact even when a project has image transformations
 * disabled or a file was removed from storage.
 */
const SmartImage = ({
  src,
  width,
  height,
  widths,
  sizes,
  quality = 74,
  fallbackSrc,
  ratioClassName,
  wrapperClassName,
  className,
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImageProps) => {
  // 0 = optimised, 1 = original, 2 = local fallback, 3 = give up
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  const options = useMemo<Omit<ImageOptions, "width">>(
    () => ({ quality, resize: "cover" }),
    [quality],
  );

  const original = src || fallbackSrc || "";
  const current =
    stage === 0
      ? optimizedImage(src, { width, height, ...options })
      : stage === 1
        ? original
        : stage === 2
          ? fallbackSrc || ""
          : "";

  if (!current) return null;

  const useSrcSet = stage === 0 && Boolean(widths);
  const srcSet = useSrcSet
    ? imageSrcSet(src, widths, options, width / height)
    : undefined;

  const handleError = () => {
    setStage((previous) => {
      if (previous === 0) return 1;
      if (previous === 1 && fallbackSrc && fallbackSrc !== src) return 2;
      return 3;
    });
  };

  const image = (
    <img
      src={current}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      className={cn("h-full w-full object-cover", className)}
      {...rest}
    />
  );

  if (!ratioClassName && !wrapperClassName) return image;

  return (
    <div className={cn("relative overflow-hidden", ratioClassName, wrapperClassName)}>
      {image}
    </div>
  );
};

export default SmartImage;
