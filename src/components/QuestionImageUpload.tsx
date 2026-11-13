import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, Pencil } from "lucide-react";

interface QuestionImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  className?: string;
}

const QuestionImageUpload = ({ imageUrl, onImageChange, className = "" }: QuestionImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار ملف صورة");
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return null;
    }

    setUploading(true);
    try {
      // Generate unique file name
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const fileExt = sanitizeExt(file.name, "jpg");
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `questions/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("فشل في رفع الصورة");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const publicUrl = await uploadImage(file);
    if (publicUrl) {
      onImageChange(publicUrl);
      toast.success("تم رفع الصورة بنجاح");
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReplaceImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Delete old image first (optional, but good for cleanup)
    if (imageUrl) {
      try {
        const urlParts = imageUrl.split('/question-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage
            .from('question-images')
            .remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing old image:", error);
      }
    }

    const publicUrl = await uploadImage(file);
    if (publicUrl) {
      onImageChange(publicUrl);
      toast.success("تم تحديث الصورة بنجاح");
    }
    
    // Reset input
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/question-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('question-images')
          .remove([filePath]);
      }
      
      onImageChange(null);
      toast.success("تم حذف الصورة");
    } catch (error) {
      console.error("Error removing image:", error);
      // Even if delete fails, clear the URL
      onImageChange(null);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>صورة السؤال (اختياري)</Label>
      
      {imageUrl ? (
        <div className="relative group">
          <img 
            src={imageUrl} 
            alt="صورة السؤال" 
            className="max-h-48 rounded-lg border object-contain w-full bg-muted"
          />
          <div className="absolute top-2 left-2 flex gap-2">
            {/* Edit/Replace Button */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="opacity-80 hover:opacity-100"
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
            {/* Delete Button */}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="opacity-80 hover:opacity-100"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {/* Hidden replace input */}
          <input
            type="file"
            ref={replaceInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleReplaceImage}
            disabled={uploading}
          />
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">جاري رفع الصورة...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">اضغط لإضافة صورة</p>
              <p className="text-xs text-muted-foreground">PNG, JPG حتى 5 ميجابايت</p>
            </div>
          )}
        </div>
      )}

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

export default QuestionImageUpload;