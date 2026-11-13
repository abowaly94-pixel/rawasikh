import arabicCurriculum from "@/assets/portfolio/portfolio-arabic-curriculum.jpg";
import teacherTraining from "@/assets/portfolio/portfolio-teacher-training.jpg";
import translation from "@/assets/portfolio/portfolio-translation.jpg";

const byTitle: Record<string, string> = {
  "تطوير منهج اللغة العربية": arabicCurriculum,
  "برنامج تدريب المعلمين": teacherTraining,
  "ترجمة المناهج الجامعية": translation,
};

/** Local artwork for seeded portfolio projects; a DB image_url always wins. */
export const portfolioFallbackImage = (title: string): string | undefined =>
  byTitle[title];