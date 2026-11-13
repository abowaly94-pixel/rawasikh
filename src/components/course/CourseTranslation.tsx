import { ReactNode } from "react";
import { useCourseTranslation } from "@/hooks/useCourseTranslation";
import { useTranslation } from "react-i18next";
import { fixTrailingPunctuation } from "@/lib/bidiText";

interface Props {
  id: string;
  title: string;
  description: string | null | undefined;
  updatedAt?: string | null;
  children: (title: string, description: string, translating: boolean) => ReactNode;
}

// Wraps a course card/header so its title + description auto-translate to
// the visitor's current site language (client-side, cached in
// `course_translations` for future visitors — same mechanism as blog posts).
// Kept as its own component (rather than calling the hook inline in a
// `.map()`) because each course needs its own hook instance.
const CourseTranslation = ({ id, title, description, updatedAt, children }: Props) => {
  const { translated, loading } = useCourseTranslation(
    id,
    [title, description || ""],
    "ar",
    String(updatedAt || ""),
  );
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const safeDescription = fixTrailingPunctuation(translated[1] || description || "", isRtl);
  return <>{children(translated[0] || title, safeDescription, loading)}</>;
};

export default CourseTranslation;
