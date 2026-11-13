import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryIconUploadProps {
  iconUrl: string | null;
  onIconChange: (url: string | null) => void;
}

const PREDEFINED_ICONS = [
  "⚽", "🎵", "📊", "🎨", "🧪", "📐", "✏️", "📚",
  "🌍", "🧮", "💻", "🔬", "📖", "🎭", "🏛️", "💡",
];

const CategoryIconUpload = ({ iconUrl, onIconChange }: CategoryIconUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [customIcons, setCustomIcons] = useState<string[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmojiIcon = iconUrl && !iconUrl.startsWith("http");
  const isCustomIcon = iconUrl && iconUrl.startsWith("http");

  useEffect(() => {
    fetchCustomIcons();
  }, []);

  const fetchCustomIcons = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("category-icons")
        .list("icons", { limit: 50, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const urls = (data || [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => {
          const { data: { publicUrl } } = supabase.storage
            .from("category-icons")
            .getPublicUrl(`icons/${f.name}`);
          return publicUrl;
        });

      setCustomIcons(urls);
    } catch (e) {
      console.error("Error fetching custom icons:", e);
    } finally {
      setLoadingCustom(false);
    }
  };

  const uploadIcon = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return null;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الأيقونة يجب أن يكون أقل من 2 ميجابايت");
      return null;
    }

    setUploading(true);
    try {
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const fileExt = sanitizeExt(file.name, "png");
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      const { error } = await supabase.storage
        .from("category-icons")
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("category-icons")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("فشل في رفع الأيقونة");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadIcon(file);
    if (url) {
      setCustomIcons((prev) => [url, ...prev]);
      onIconChange(url);
      toast.success("تم رفع الأيقونة بنجاح");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    onIconChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Selected icon preview */}
      {iconUrl && (
        <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
          {isEmojiIcon ? (
            <span className="text-3xl">{iconUrl}</span>
          ) : (
            <img src={iconUrl} alt="أيقونة" className="h-10 w-10 rounded-md object-contain" />
          )}
          <span className="text-sm text-muted-foreground">الأيقونة المختارة</span>
          <Button type="button" variant="ghost" size="icon" className="mr-auto" onClick={handleRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {/* Predefined emoji icons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">أيقونات جاهزة</p>
        <div className="grid grid-cols-8 gap-1.5">
          {PREDEFINED_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onIconChange(emoji)}
              className={cn(
                "h-9 w-9 rounded-md border flex items-center justify-center text-lg transition-all hover:scale-110 hover:border-primary",
                iconUrl === emoji ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-background"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Custom uploaded icons */}
      {(customIcons.length > 0 || loadingCustom) && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">أيقونات مرفوعة</p>
          {loadingCustom ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              جاري التحميل...
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1.5">
              {customIcons.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onIconChange(url)}
                  className={cn(
                    "h-9 w-9 rounded-md border flex items-center justify-center p-1 transition-all hover:scale-110 hover:border-primary",
                    iconUrl === url ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-background"
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-contain rounded-sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">جاري الرفع...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">رفع أيقونة مخصصة</span>
          </>
        )}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
};

export default CategoryIconUpload;
