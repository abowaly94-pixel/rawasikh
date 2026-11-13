import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// IMPORTANT: keep these class strings literal so Tailwind JIT includes them.
// Mobile always 1 column; tablet (sm) always 2; large screens use setting.
export const gridColsClass = (perRow: number): string => {
  switch (perRow) {
    case 1:
      return "grid grid-cols-1 gap-6";
    case 2:
      return "grid grid-cols-1 sm:grid-cols-2 gap-6";
    case 4:
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6";
    case 3:
    default:
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
  }
};

export const useCoursesPerRow = (fallback: number = 3) => {
  const { data } = useQuery({
    queryKey: ["site_setting", "courses_per_row"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "courses_per_row")
        .maybeSingle();
      const parsed = parseInt((data?.setting_value as string) || "", 10);
      return isNaN(parsed) ? fallback : parsed;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? fallback;
};
