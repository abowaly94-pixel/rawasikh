import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

export const OVERRIDES_KEY = "i18n_overrides_ar";

// Deep merge for plain objects (arrays are replaced, not merged)
export const deepMerge = <T,>(target: any, source: any): T => {
  if (Array.isArray(source)) return source as T;
  if (source && typeof source === "object") {
    const out: any = { ...(target && typeof target === "object" ? target : {}) };
    for (const k of Object.keys(source)) {
      out[k] = deepMerge(out[k], source[k]);
    }
    return out;
  }
  return source as T;
};

export const loadAndApplyOverrides = async () => {
  try {
    const activeLanguage = i18n.resolvedLanguage || i18n.language;
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", OVERRIDES_KEY)
      .maybeSingle();
    const raw = data?.setting_value;
    if (!raw) return;
    const overrides = JSON.parse(raw);
    if (overrides && typeof overrides === "object") {
      i18n.addResourceBundle("ar", "translation", overrides, true, true);
      // Trigger re-render of consumers
      await i18n.reloadResources(["ar"], ["translation"]);
      if (activeLanguage && activeLanguage !== i18n.language) {
        await i18n.changeLanguage(activeLanguage);
      }
      try {
        localStorage.setItem(OVERRIDES_KEY, raw);
      } catch {}
    }
  } catch (e) {
    console.error("Failed to load i18n overrides", e);
  }
};

// Synchronous bootstrap from localStorage to avoid flash on reload
export const applyCachedOverrides = () => {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return;
    const overrides = JSON.parse(raw);
    if (overrides && typeof overrides === "object") {
      i18n.addResourceBundle("ar", "translation", overrides, true, true);
    }
  } catch {}
};
