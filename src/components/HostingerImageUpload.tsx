import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  folder?: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "default";
  label?: string;
}

const BUCKET = "site-assets";

const HostingerImageUpload = ({ folder = "general", onUploaded, size = "default", label = "رفع صورة" }: Props) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("الحد الأقصى 10 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const ext = sanitizeExt(file.name, "jpg");
      const safeFolder = (folder || "general").replace(/[^a-zA-Z0-9/_-]/g, "");
      const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!pub?.publicUrl) throw new Error("لم يتم استلام رابط الصورة");

      onUploaded(pub.publicUrl);
      toast.success("تم رفع الصورة بنجاح");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
        {uploading ? "جاري الرفع..." : label}
      </Button>
    </>
  );
};

export default HostingerImageUpload;
