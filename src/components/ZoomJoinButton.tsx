import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { parseZoomUrl } from "@/lib/zoomUrl";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  url: string;
  title?: string;
  size?: "sm" | "default" | "lg";
  // When provided, joining this button records the student's attendance for
  // this specific live lecture (present + join time), so admins can see who
  // actually showed up vs who didn't.
  zoomLinkId?: string;
  courseId?: string | null;
  lessonId?: string | null;
}

const ZoomJoinButton = ({ url, title, size = "sm", zoomLinkId, courseId, lessonId }: Props) => {
  const [open, setOpen] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const { user } = useAuth();
  const parsed = parseZoomUrl(url);

  const recordAttendance = () => {
    if (!zoomLinkId || !user) return;
    supabase
      .from("lecture_attendance" as any)
      .upsert(
        {
          zoom_link_id: zoomLinkId,
          course_id: courseId || null,
          lesson_id: lessonId || null,
          student_id: user.id,
          status: "present",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "zoom_link_id,student_id" }
      )
      .then(({ error }) => {
        // Attendance is a best-effort side-effect; failures shouldn't block
        // joining, but they must not be silently swallowed either — an RLS
        // denial or bad zoomLinkId would otherwise look identical to "the
        // student never joined" on the admin's attendance report.
        if (error) {
          console.error("Failed to record lecture attendance:", error);
        }
      });
  };

  if (!parsed) {
    return (
      <Button size={size} variant="outline" disabled title="رابط Zoom غير صالح">
        <AlertTriangle className="h-4 w-4 ml-1" />
        رابط غير صالح
      </Button>
    );
  }

  return (
    <>
      <Button size={size} onClick={() => { setIframeFailed(false); setOpen(true); recordAttendance(); }}>
        <PlayCircle className="h-4 w-4 ml-1" />
        تشغيل الجلسة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-5xl w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{title || "جلسة Zoom"}</span>
              <Button asChild size="sm" variant="outline">
                <a href={parsed.joinUrl} target="_blank" rel="noopener noreferrer" onClick={recordAttendance}>
                  <ExternalLink className="h-4 w-4 ml-1" />
                  فتح في نافذة جديدة
                </a>
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
            {!iframeFailed ? (
              <iframe
                src={parsed.embedUrl}
                title={title || "Zoom Meeting"}
                className="absolute inset-0 w-full h-full"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                allowFullScreen
                onError={() => setIframeFailed(true)}
              />
            ) : null}
          </div>

          <div className="p-4 text-xs text-muted-foreground bg-muted/30 border-t space-y-2">
            <p>
              لو الجلسة مش ظاهرة هنا، ده لأن Zoom بيمنع تشغيلها داخل بعض المتصفحات مباشرة.
              اضغط "فتح في نافذة جديدة" للانضمام عبر تطبيق Zoom أو المتصفح.
            </p>
            <p className="text-[10px] opacity-70" dir="ltr">Meeting ID: {parsed.meetingId}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ZoomJoinButton;
