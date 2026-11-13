import blogWaqfImage from "@/assets/blog-waqf.jpg";
import blogArabicIdentityImage from "@/assets/blog-arabic-identity-clean.jpg";
import expertTeacherImage from "@/assets/expert-teacher.jpg";
import individualLearningImage from "@/assets/individual-learning.jpg";

type BlogImageSource = {
  title?: string | null;
  image_url?: string | null;
  category?: string | null;
};

const brokenImageFileFallbacks: Record<string, string> = {
  Gemini_Generated_Image_kpna8jkpna8jkpna: individualLearningImage,
  "Gemini_Generated_Image_2y9mar2y9mar2y9m-1": blogWaqfImage,
  OL1V2K0: blogArabicIdentityImage,
};

const titleFallbacks: Array<[string, string]> = [
  ["هندسة السلوك النفسي", individualLearningImage],
  ["ألفاظ الوقف", blogWaqfImage],
  ["العربية والهوية الثقافية", blogArabicIdentityImage],
  ["شهرة الحديث", blogWaqfImage],
];

const categoryFallbacks: Record<string, string> = {
  "الصحة النفسية": individualLearningImage,
  "الفقه": blogWaqfImage,
  "علوم الحديث": blogWaqfImage,
  "اللغة العربية": blogArabicIdentityImage,
  "اللغات والثقافة": blogArabicIdentityImage,
  "مختصرات بحوث الدراسات العليا": blogWaqfImage,
  "أخبار رواسخ": expertTeacherImage,
  "الاستشارات والأبحاث": individualLearningImage,
  "التطوير المهني": expertTeacherImage,
  "التعليم والتدريب": individualLearningImage,
  "الجودة والإدارة": expertTeacherImage,
};

const getNormalizedUrl = (url?: string | null) => {
  if (!url) return "";
  try {
    return decodeURIComponent(url.trim());
  } catch {
    return url.trim();
  }
};

export const getBlogImageFallback = (post: BlogImageSource) => {
  const imageUrl = getNormalizedUrl(post.image_url);
  const title = post.title || "";

  for (const [fileName, fallback] of Object.entries(brokenImageFileFallbacks)) {
    if (imageUrl.includes(fileName)) return fallback;
  }

  const titleMatch = titleFallbacks.find(([text]) => title.includes(text));
  if (titleMatch) return titleMatch[1];

  if (post.category && categoryFallbacks[post.category]) {
    return categoryFallbacks[post.category];
  }

  return individualLearningImage;
};

export const getBlogImageUrl = (post: BlogImageSource) => {
  const imageUrl = getNormalizedUrl(post.image_url);
  const fallback = getBlogImageFallback(post);

  if (!imageUrl) return fallback;
  if (imageUrl.includes("/wp-content/uploads/")) return fallback;
  return imageUrl;
};
