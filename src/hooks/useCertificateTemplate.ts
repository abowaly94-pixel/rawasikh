import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE } from "@/components/certificates/CertificateView";

const SETTING_KEY = "certificate_template";

/** Loads the admin-configured certificate template (background, colors, logo,
 * text) from site_settings. Falls back to the built-in default design when
 * nothing has been configured yet or the stored value can't be parsed. */
export function useCertificateTemplate() {
  return useQuery({
    queryKey: ["certificate_template"],
    queryFn: async (): Promise<CertificateTemplate> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.setting_value) return DEFAULT_CERTIFICATE_TEMPLATE;
      try {
        return { ...DEFAULT_CERTIFICATE_TEMPLATE, ...JSON.parse(data.setting_value) };
      } catch {
        return DEFAULT_CERTIFICATE_TEMPLATE;
      }
    },
    staleTime: 60_000,
  });
}

export async function saveCertificateTemplate(template: CertificateTemplate) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ setting_key: SETTING_KEY, setting_value: JSON.stringify(template) }, { onConflict: "setting_key" });
  if (error) throw error;
}
