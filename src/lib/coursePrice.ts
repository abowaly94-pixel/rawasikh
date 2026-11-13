// Per-language pricing helpers
export const SUPPORTED_LANGS = ["ar", "en", "fr", "ur"] as const;
export type LangCode = (typeof SUPPORTED_LANGS)[number];

export const SUPPORTED_CURRENCIES = ["EGP", "USD", "EUR", "SAR", "AED", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY_BY_LANG: Record<LangCode, Currency> = {
  ar: "EGP",
  en: "USD",
  fr: "EUR",
  ur: "USD",
};

export interface PriceEntry {
  amount: number;
  currency: Currency;
  /** Optional free-text label that overrides amount+currency display (e.g. "150-300 EGP", "Contact us"). */
  label?: string;
}

export type PricesMap = Partial<Record<LangCode, PriceEntry>>;

export const CURRENCY_LABEL: Record<Currency, { ar: string; en: string }> = {
  EGP: { ar: "ج.م", en: "EGP" },
  USD: { ar: "$", en: "$" },
  EUR: { ar: "€", en: "€" },
  SAR: { ar: "ر.س", en: "SAR" },
  AED: { ar: "د.إ", en: "AED" },
  GBP: { ar: "£", en: "£" },
};

/** Pick the best price entry for the active language, falling back to base price (EGP). */
function isValidEntry(entry: PriceEntry | undefined): entry is PriceEntry {
  if (!entry) return false;
  if (entry.label && entry.label.trim()) return true;
  return typeof entry.amount === "number" && entry.amount > 0;
}

export function resolvePrice(
  prices: PricesMap | null | undefined,
  basePrice: number,
  lang: string,
  baseLabel?: string | null
): PriceEntry {
  const code = (lang?.split("-")[0] || "ar") as LangCode;
  const entry = prices?.[code];
  if (isValidEntry(entry)) {
    return { ...entry, label: entry.label || baseLabel || undefined };
  }
  // Fallback: try the site's default-language entry (Arabic / EGP), then any other language entry
  const defaultEntry = prices?.ar;
  if (isValidEntry(defaultEntry)) {
    return { ...defaultEntry, label: defaultEntry.label || baseLabel || undefined };
  }
  for (const l of SUPPORTED_LANGS) {
    const e = prices?.[l];
    if (isValidEntry(e)) {
      return { ...e, label: e.label || baseLabel || undefined };
    }
  }
  // Final fallback to base price in EGP
  return { amount: Number(basePrice) || 0, currency: "EGP", label: baseLabel || undefined };
}

export function formatPrice(entry: PriceEntry, lang: string): string {
  if (entry.label && entry.label.trim()) return entry.label.trim();
  if (!entry.amount || entry.amount === 0) {
    return lang?.startsWith("ar") ? "مجاني" : "Free";
  }
  const labelLang = lang?.startsWith("ar") ? "ar" : "en";
  const symbol = CURRENCY_LABEL[entry.currency]?.[labelLang] ?? entry.currency;
  return labelLang === "ar"
    ? `${entry.amount} ${symbol}`
    : `${symbol}${entry.currency === "USD" || entry.currency === "EUR" || entry.currency === "GBP" ? "" : " "}${entry.amount}`;
}

/** Label shown for courses whose pricing depends on the selected level. */
export function perLevelLabel(lang: string): string {
  const code = lang?.startsWith("ar") ? "ar" : lang?.startsWith("fr") ? "fr" : lang?.startsWith("ur") ? "ur" : "en";
  return {
    ar: "حسب المستوى",
    en: "Price per level",
    fr: "Prix par niveau",
    ur: "ہر سطح کے مطابق",
  }[code];
}
