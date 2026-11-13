type TranslateFn = (key: string, options?: { defaultValue?: string | null }) => string;

type TranslatableRecord = {
  title?: string | null;
  description?: string | null;
  name?: string | null;
  translations?: unknown;
};

const COURSE_TRANSLATION_KEYS = [
  {
    titleIncludes: ["كورس معلم اللغة العربية الرقمي", "معلم اللغة العربية الرقمي"],
    titleKey: "courseContent.items.digitalArabicTeacher.title",
    descriptionKey: "courseContent.items.digitalArabicTeacher.description",
  },
  {
    titleIncludes: ["دورة إعداد المدربين", "إعداد المدربين"],
    titleKey: "courseContent.items.trainerPreparation.title",
    descriptionKey: "courseContent.items.trainerPreparation.description",
  },
];

const getLocale = (language: string) => language.split("-")[0];

const getLocalizedField = (item: TranslatableRecord, field: "title" | "description" | "name", language: string) => {
  const locale = getLocale(language);
  const localizedValue = (item as Record<string, unknown>)[`${field}_${locale}`];
  if (typeof localizedValue === "string" && localizedValue.trim()) return localizedValue;

  if (item.translations && typeof item.translations === "object") {
    const translations = item.translations as Record<string, Record<string, unknown>>;
    const translatedValue = translations[locale]?.[field];
    if (typeof translatedValue === "string" && translatedValue.trim()) return translatedValue;
  }

  return null;
};

const findCourseTranslation = (title?: string | null) => {
  if (!title) return null;
  return COURSE_TRANSLATION_KEYS.find((entry) => entry.titleIncludes.some((part) => title.includes(part))) || null;
};

export const getLocalizedCourseTitle = (course: TranslatableRecord, language: string, t: TranslateFn) => {
  const fallback = course.title || course.name || "";
  const fieldValue = getLocalizedField(course, "title", language) || getLocalizedField(course, "name", language);
  if (fieldValue) return fieldValue;

  const entry = findCourseTranslation(fallback);
  return entry ? t(entry.titleKey, { defaultValue: fallback }) : fallback;
};

export const getLocalizedCourseDescription = (course: TranslatableRecord, language: string, t: TranslateFn) => {
  const fallback = course.description || "";
  const fieldValue = getLocalizedField(course, "description", language);
  if (fieldValue) return fieldValue;

  const entry = findCourseTranslation(course.title || course.name);
  return entry ? t(entry.descriptionKey, { defaultValue: fallback }) : fallback;
};