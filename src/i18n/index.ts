import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ur from './locales/ur.json';
import { siteContent } from './siteContent';

// Merge the 2026 marketing layer into each locale. Keeping it separate from
// the large product dictionaries makes copy changes easier to review.
const translations = {
  ar: { ...ar, ...siteContent.ar },
  en: { ...en, ...siteContent.en },
  fr: { ...fr, ...siteContent.fr },
  ur: { ...ur, ...siteContent.ur },
};


export const languages = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', dir: 'rtl' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

// One-time reset to force Arabic as default after language preference fix
if (typeof window !== 'undefined') {
  const RESET_KEY = 'i18n_default_ar_reset_v2';
  if (!localStorage.getItem(RESET_KEY)) {
    localStorage.removeItem('i18nextLng');
    localStorage.setItem(RESET_KEY, '1');
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: translations.ar },
      en: { translation: translations.en },
      fr: { translation: translations.fr },
      ur: { translation: translations.ur },
    },
    lng: typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'ar') : 'ar',
    fallbackLng: 'ar',
    supportedLngs: languages.map((language) => language.code),
    cleanCode: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// NOTE: dir/lang on <html>/<body> are intentionally NOT updated here via
// i18n.on('languageChanged', ...). That listener fires the instant i18next's
// internal state resolves, which is BEFORE react-i18next re-renders the actual
// translated text and before I18nAutoTranslator's DOM pass runs — causing a
// visible flash where the layout direction flips while the text is still in
// the old language. Instead, the dir/lang update is done inside
// I18nAutoTranslator's useLayoutEffect, in the same synchronous pass as the
// text translation, so both change together with zero perceptible delay.

// Set initial direction
const initialLang = languages.find(l => l.code === i18n.language);
if (initialLang) {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = initialLang.dir;
  document.body.dir = initialLang.dir;
}

export default i18n;
