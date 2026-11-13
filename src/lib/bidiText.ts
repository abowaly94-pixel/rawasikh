const RLM = "\u200f";
const LRM = "\u200e";

const TRAILING_PUNCT = /[.!؟?،:؛,]$/;

export function fixTrailingPunctuation(text: string, rtl: boolean): string {
  if (!text) return text;
  if (!TRAILING_PUNCT.test(text)) return text;
  return rtl ? text + RLM : text + LRM;
}