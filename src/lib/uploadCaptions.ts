import { supabase } from "@/integrations/supabase/client";

/**
 * Convert SRT to WebVTT (browsers only support VTT for <track>).
 * Prepends "WEBVTT" header and converts "," to "." in timestamps.
 */
const srtToVtt = (srt: string): string => {
  const body = srt
    .replace(/\r+/g, "")
    .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
  return `WEBVTT\n\n${body}`;
};

/**
 * Upload a caption file to Supabase Storage (site-assets/captions/*).
 * Accepts .vtt or .srt (srt is converted to vtt on-the-fly).
 * Returns the public URL of the uploaded .vtt file.
 */
export async function uploadCaptionFile(
  file: File,
  keyPrefix: string,
): Promise<string> {
  const isVtt = /\.vtt$/i.test(file.name) || file.type === "text/vtt";
  const isSrt = /\.srt$/i.test(file.name) || file.type === "application/x-subrip";
  if (!isVtt && !isSrt) {
    throw new Error("صيغة غير مدعومة — استخدم ملف .vtt أو .srt");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
  }

  let text = await file.text();
  if (isSrt) text = srtToVtt(text);
  if (!/^WEBVTT/.test(text.trim())) text = `WEBVTT\n\n${text.trim()}`;

  const blob = new Blob([text], { type: "text/vtt" });
  const fileName = `captions/${keyPrefix}/${Date.now()}.vtt`;

  const { data, error } = await supabase.storage
    .from("site-assets")
    .upload(fileName, blob, {
      contentType: "text/vtt",
      upsert: false,
    });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("site-assets")
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}
