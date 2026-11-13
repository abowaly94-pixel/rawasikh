// Country dial-code list + WhatsApp number normalization.
//
// The platform's phone numbers were entered in many inconsistent formats over
// time (+966xxxxxxxxx, 00966xxxxxxxxx, 01xxxxxxxxx with no country code at
// all, stray commas, etc). To build a reliable "wa.me" contact link we need
// an explicit country dial code stored alongside the number — we can't
// reliably guess the country from a bare local number. Going forward, every
// place a phone/whatsapp number is entered (signup, profile, admin student
// forms) should also collect a country from this list.

export interface CountryOption {
  code: string; // ISO-ish short code, used as the <Select> value
  label: string; // Arabic label
  dial: string; // dial code including "+"
}

export const COUNTRY_CODES: CountryOption[] = [
  { code: "EG", label: "مصر", dial: "+20" },
  { code: "SA", label: "السعودية", dial: "+966" },
  { code: "AE", label: "الإمارات", dial: "+971" },
  { code: "KW", label: "الكويت", dial: "+965" },
  { code: "QA", label: "قطر", dial: "+974" },
  { code: "BH", label: "البحرين", dial: "+973" },
  { code: "OM", label: "عمان", dial: "+968" },
  { code: "JO", label: "الأردن", dial: "+962" },
  { code: "IQ", label: "العراق", dial: "+964" },
  { code: "LB", label: "لبنان", dial: "+961" },
  { code: "SY", label: "سوريا", dial: "+963" },
  { code: "YE", label: "اليمن", dial: "+967" },
  { code: "LY", label: "ليبيا", dial: "+218" },
  { code: "SD", label: "السودان", dial: "+249" },
  { code: "DZ", label: "الجزائر", dial: "+213" },
  { code: "MA", label: "المغرب", dial: "+212" },
  { code: "TN", label: "تونس", dial: "+216" },
  { code: "PS", label: "فلسطين", dial: "+970" },
  { code: "PK", label: "باكستان", dial: "+92" },
  { code: "TR", label: "تركيا", dial: "+90" },
  { code: "US", label: "أمريكا / كندا", dial: "+1" },
  { code: "GB", label: "بريطانيا", dial: "+44" },
];

export const DEFAULT_COUNTRY_CODE = "EG";

export function getCountryByCode(code: string | null | undefined): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRY_CODES.find((c) => c.code === code || c.dial === code);
}

/**
 * Normalize a raw phone/whatsapp string (however it was typed) plus an
 * optional known dial code into digits-only international format suitable
 * for a wa.me link (no "+", no spaces, no leading zero).
 *
 * Returns null when the number can't be confidently resolved — e.g. it has
 * no "+"/"00" prefix and we don't know the country, or it's too short to be
 * a real phone number.
 */
export function toWhatsappDigits(
  rawPhone: string | null | undefined,
  countryDial?: string | null
): string | null {
  if (!rawPhone) return null;

  // Strip everything except digits and a leading +
  let clean = rawPhone.trim().replace(/[^\d+]/g, "");
  if (!clean) return null;

  if (clean.startsWith("+")) {
    const digits = clean.slice(1);
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  if (clean.startsWith("00")) {
    const digits = clean.slice(2);
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  if (countryDial) {
    const dialDigits = countryDial.replace("+", "");
    // Local numbers conventionally start with a trunk "0" (e.g. 01xxxxxxxxx
    // in Egypt, 05xxxxxxx in Saudi/Gulf) which must be dropped before
    // prefixing the country code.
    const local = clean.startsWith("0") ? clean.slice(1) : clean;
    const digits = `${dialDigits}${local}`;
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  // No "+"/"00" prefix and no explicit country supplied. Most numbers
  // recorded before the country-code field existed are Egyptian mobiles in
  // the bare local "01xxxxxxxxx" format (11 digits, starts with 01), so we
  // can safely infer Egypt for that one very specific, unambiguous shape
  // instead of leaving the contact button permanently disabled. Anything
  // that doesn't match this exact pattern is still left unresolved rather
  // than guessed at.
  if (/^01\d{9}$/.test(clean)) {
    return `20${clean.slice(1)}`;
  }

  return null;
}

export function buildWhatsappLink(
  rawPhone: string | null | undefined,
  countryDial?: string | null,
  message?: string
): string | null {
  const digits = toWhatsappDigits(rawPhone, countryDial);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
