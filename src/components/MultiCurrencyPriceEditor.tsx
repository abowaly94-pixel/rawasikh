import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SUPPORTED_LANGS,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY_BY_LANG,
  type PricesMap,
  type LangCode,
  type Currency,
} from "@/lib/coursePrice";

const LANG_LABEL: Record<LangCode, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  ur: "اردو",
};

interface Props {
  value: PricesMap;
  onChange: (next: PricesMap) => void;
  basePrice?: number;
}

export default function MultiCurrencyPriceEditor({ value, onChange, basePrice }: Props) {
  const update = (lang: LangCode, patch: Partial<{ amount: number; currency: Currency }>) => {
    const current = value[lang] ?? { amount: basePrice ?? 0, currency: DEFAULT_CURRENCY_BY_LANG[lang] };
    const next: PricesMap = { ...value, [lang]: { ...current, ...patch } };
    onChange(next);
  };

  const clear = (lang: LangCode) => {
    const next = { ...value };
    delete next[lang];
    onChange(next);
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/30">
      <div className="text-sm font-medium">الأسعار حسب اللغة (اختياري)</div>
      <p className="text-xs text-muted-foreground">
        اضبط سعر وعملة لكل لغة. أو اكتب نص حر بدل الرقم (مثلاً "150-300 ج.م" أو "حسب الباقة" أو "Contact us"). لو سيبت اللغة فاضية هيتم استخدام السعر الأساسي.
      </p>
      {SUPPORTED_LANGS.map((lang) => {
        const entry = value[lang];
        const currency = entry?.currency ?? DEFAULT_CURRENCY_BY_LANG[lang];
        return (
          <div key={lang} className="space-y-2 border-t pt-2 first:border-t-0 first:pt-0">
            <Label className="text-sm font-semibold">{LANG_LABEL[lang]}</Label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-7">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="السعر (رقم)"
                  value={entry?.amount ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" && !entry?.label) clear(lang);
                    else update(lang, { amount: raw === "" ? 0 : parseFloat(raw) || 0, currency });
                  }}
                />
              </div>
              <div className="col-span-5">
                <Select
                  value={currency}
                  onValueChange={(v) => update(lang, { currency: v as Currency, amount: entry?.amount ?? 0 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              type="text"
              placeholder='نص بديل (اختياري) — مثال: "150-300 EGP" أو "Contact us"'
              value={entry?.label ?? ""}
              onChange={(e) => {
                const label = e.target.value;
                if (!label && !entry?.amount) clear(lang);
                else
                  update(lang, {
                    label,
                    amount: entry?.amount ?? 0,
                    currency,
                  } as any);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
