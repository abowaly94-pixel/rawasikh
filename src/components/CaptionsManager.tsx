import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { uploadCaptionFile } from "@/lib/uploadCaptions";
import type { CaptionTrack } from "@/components/VideoEmbed";

export const CAPTION_LANGUAGES: { lang: string; label: string }[] = [
  { lang: "ar", label: "العربية" },
  { lang: "en", label: "English" },
  { lang: "fr", label: "Français" },
  { lang: "ur", label: "اردو" },
];

interface CaptionsManagerProps {
  value: CaptionTrack[];
  onChange: (next: CaptionTrack[]) => void;
  uploadPath: string; // storage key prefix e.g. "course/<id>"
  disabled?: boolean;
}

const CaptionsManager = ({ value, onChange, uploadPath, disabled }: CaptionsManagerProps) => {
  const [selectedLang, setSelectedLang] = useState<string>(
    CAPTION_LANGUAGES.find((l) => !value.some((v) => v.lang === l.lang))?.lang || "ar",
  );
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingLangs = CAPTION_LANGUAGES.filter(
    (l) => !value.some((v) => v.lang === l.lang),
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCaptionFile(file, `${uploadPath}/${selectedLang}`);
      const meta = CAPTION_LANGUAGES.find((l) => l.lang === selectedLang);
      const next = [
        ...value.filter((v) => v.lang !== selectedLang),
        { lang: selectedLang, label: meta?.label || selectedLang, url },
      ];
      onChange(next);
      const nextAvail = CAPTION_LANGUAGES.find((l) => !next.some((v) => v.lang === l.lang));
      if (nextAvail) setSelectedLang(nextAvail.lang);
      toast.success("تم رفع ملف الترجمة");
    } catch (err: any) {
      toast.error(err?.message || "خطأ في رفع الترجمة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeCaption = (lang: string) => {
    onChange(value.filter((v) => v.lang !== lang));
  };

  return (
    <div className="space-y-2">
      <Label>ملفات الترجمة (Captions) — اختياري</Label>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((c) => (
            <div key={c.lang} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium shrink-0">{c.label}</span>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline flex-1 truncate"
                dir="ltr"
              >
                {c.url.split("/").pop()}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => removeCaption(c.lang)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {remainingLangs.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">اللغة</Label>
            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {remainingLangs.map((l) => (
                  <SelectItem key={l.lang} value={l.lang}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            type="file"
            accept=".vtt,.srt,text/vtt,application/x-subrip"
            ref={inputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 ml-2" />
                رفع (.vtt / .srt)
              </>
            )}
          </Button>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          اختر اللغة أولاً ثم ارفع ملف الترجمة. يمكنك إضافة عدة لغات — الطالب سيختار اللغة من زر CC داخل المشغّل.
        </p>
      )}
    </div>
  );
};

export default CaptionsManager;
