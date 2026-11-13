import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Link2, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface ExamShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  examType: "evaluation" | "quiz" | "school-assessment" | "lesson-exam";
  lessonId?: string;
}

const ExamShareDialog = ({ open, onOpenChange, examId, examTitle, examType, lessonId }: ExamShareDialogProps) => {
  const [copied, setCopied] = useState(false);

  // Generate the appropriate link based on exam type
  const baseUrl = window.location.origin;
  const examLink = examType === "evaluation" 
    ? `${baseUrl}/evaluation/${examId}`
    : examType === "school-assessment"
    ? `${baseUrl}/assessment/${examId}`
    : examType === "lesson-exam"
    ? `${baseUrl}/dashboard/lessons/${lessonId}/exam/${examId}`
    : `${baseUrl}/quiz/${examId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examLink);
      setCopied(true);
      toast.success("تم نسخ الرابط بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("فشل في نسخ الرابط");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("exam-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-${examTitle.replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("تم تحميل QR Code بنجاح");
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            مشاركة الاختبار
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {examTitle}
          </p>

          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="gap-2">
                <Link2 className="h-4 w-4" />
                الرابط
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>رابط الاختبار</Label>
                <div className="flex gap-2">
                  <Input 
                    value={examLink} 
                    readOnly 
                    className="text-sm"
                    dir="ltr"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button onClick={handleCopy} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ!" : "نسخ الرابط"}
              </Button>
            </TabsContent>
            
            <TabsContent value="qr" className="space-y-4 mt-4">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-background rounded-lg border">
                  <QRCodeSVG
                    id="exam-qr-code"
                    value={examLink}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  امسح هذا الكود للوصول للاختبار مباشرة
                </p>
                
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadQR}
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل الصورة
                  </Button>
                  <Button 
                    onClick={handleCopy}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    نسخ الرابط
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamShareDialog;