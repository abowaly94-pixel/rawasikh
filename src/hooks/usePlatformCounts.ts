import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformCounts {
  courses: number;
  teachers: number;
  levels: number;
  articles: number;
}

const countCourses = async () => {
  const { count, error } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);
  if (error) throw error;
  return count ?? 0;
};

const countTeachers = async () => {
  const { count, error } = await supabase
    .from("public_teachers")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
};

const countLevels = async () => {
  const { count, error } = await supabase
    .from("course_levels")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
};

const countArticles = async () => {
  const { count, error } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);
  if (error) throw error;
  return count ?? 0;
};

/**
 * Real, public counters from the platform instead of invented marketing
 * numbers. Shared through React Query so Home and About reuse one request.
 */
export const usePlatformCounts = () =>
  useQuery<PlatformCounts>({
    queryKey: ["public-platform-counts"],
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const [courses, teachers, levels, articles] = await Promise.all([
        countCourses(),
        countTeachers(),
        countLevels(),
        countArticles(),
      ]);

      return { courses, teachers, levels, articles };
    },
  });
