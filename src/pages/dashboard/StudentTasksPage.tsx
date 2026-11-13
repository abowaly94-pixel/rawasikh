import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  BookOpen,
  Layers,
  Loader2,
  Upload,
  Paperclip,
  ExternalLink,
} from "lucide-react";

type SubmissionType = "checkbox" | "text" | "file" | "link" | "video";

interface TaskRow {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  submission_type: SubmissionType;
  is_required: boolean;
  due_date: string | null;
  created_at: string;
  course_title?: string;
  lesson_title?: string;
  submission?: {
    id: string;
    status: string;
    text_content: string | null;
    file_url: string | null;
    link_url: string | null;
    video_url: string | null;
    submitted_at: string | null;
  } | null;
}

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  checkbox: "تأكيد إنجاز فقط",
  text: "مقال / نص مكتوب",
  file: "رفع ملف (وورد / إكسيل / PDF)",
  link: "رابط",
  video: "رفع فيديو",
};

const StudentTasksPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [drafts, setDrafts] = useState<Record<string, { text: string; link: string }>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ taskId: string; kind: "file" | "video" } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["my_course_tasks", user?.id],
    queryFn: async () => {
      const { data: taskRows, error } = await supabase
        .from("course_tasks")
        .select(
          "id, course_id, lesson_id, title, description, submission_type, is_required, due_date, created_at, courses(title), course_lessons(title)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const taskIds = (taskRows || []).map((t: any) => t.id);
      const { data: subs } = taskIds.length
        ? await supabase
            .from("task_submissions")
            .select("id, task_id, status, text_content, file_url, link_url, video_url, submitted_at")
            .eq("student_id", user!.id)
            .in("task_id", taskIds)
        : { data: [] };

      return ((taskRows as any[]) || []).map((t) => ({
        id: t.id,
        course_id: t.course_id,
        lesson_id: t.lesson_id,
        title: t.title,
        description: t.description,
        submission_type: t.submission_type,
        is_required: t.is_required,
        due_date: t.due_date,
        created_at: t.created_at,
        course_title: t.courses?.title || "—",
        lesson_title: t.course_lessons?.title || null,
        submission: (subs || []).find((s: any) => s.task_id === t.id) || null,
      })) as TaskRow[];
    },
    enabled: !!user,
  });

  const getDraft = (taskId: string) => drafts[taskId] || { text: "", link: "" };
  const setDraft = (taskId: string, patch: Partial<{ text: string; link: string }>) => {
    setDrafts((prev) => ({ ...prev, [taskId]: { ...getDraft(taskId), ...patch } }));
  };

  const submitPayload = async (task: TaskRow, payload: Record<string, any>) => {
    setSavingTaskId(task.id);
    try {
      const base = {
        task_id: task.id,
        student_id: user!.id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        ...payload,
      };
      const { error } = task.submission
        ? await supabase.from("task_submissions").update(base).eq("id", task.submission.id)
        : await supabase.from("task_submissions").insert(base);
      if (error) throw error;
      toast({ title: "تم التسليم", description: "تم تسجيل تسليمك للمهمة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["my_course_tasks", user?.id] });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleCheckboxComplete = (task: TaskRow) => submitPayload(task, {});

  const handleTextSubmit = (task: TaskRow) => {
    const draft = getDraft(task.id);
    if (!draft.text.trim()) {
      toast({ title: "اكتب المقال الأول", variant: "destructive" });
      return;
    }
    submitPayload(task, { text_content: draft.text.trim() });
  };

  const handleLinkSubmit = (task: TaskRow) => {
    const draft = getDraft(task.id);
    if (!draft.link.trim()) {
      toast({ title: "حط الرابط الأول", variant: "destructive" });
      return;
    }
    submitPayload(task, { link_url: draft.link.trim() });
  };

  const openFilePicker = (taskId: string, kind: "file" | "video") => {
    setActiveUploadTarget({ taskId, kind });
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = activeUploadTarget;
    e.target.value = "";
    if (!file || !target) return;
    const task = tasks?.find((t) => t.id === target.taskId);
    if (!task) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "خطأ", description: "الحد الأقصى لحجم الملف 50 ميجابايت", variant: "destructive" });
      return;
    }

    setUploadingTaskId(task.id);
    try {
      const { safeUploadName } = await import("@/lib/sanitizeUpload");
      const path = `${user!.id}/${task.id}/${safeUploadName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("task-submissions")
        .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: signed } = await supabase.storage
        .from("task-submissions")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);

      const url = signed?.signedUrl || path;
      await submitPayload(task, target.kind === "video" ? { video_url: url } : { file_url: url });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل رفع الملف", variant: "destructive" });
    } finally {
      setUploadingTaskId(null);
      setActiveUploadTarget(null);
    }
  };

  const pending = (tasks || []).filter((t) => t.submission?.status !== "submitted");
  const completed = (tasks || []).filter((t) => t.submission?.status === "submitted");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderSubmissionArea = (task: TaskRow) => {
    const isDone = task.submission?.status === "submitted";
    const draft = getDraft(task.id);
    const isUploading = uploadingTaskId === task.id;
    const isSaving = savingTaskId === task.id;

    if (task.submission_type === "checkbox") {
      return (
        <Button size="sm" variant={isDone ? "outline" : "default"} onClick={() => handleCheckboxComplete(task)} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDone ? "تم الإنجاز ✓" : "تحديد كمنجزة"}
        </Button>
      );
    }

    if (task.submission_type === "text") {
      return (
        <div className="space-y-2 w-full">
          {isDone && task.submission?.text_content && (
            <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">{task.submission.text_content}</p>
          )}
          <Textarea
            placeholder="اكتب المقال هنا..."
            defaultValue={task.submission?.text_content || ""}
            onChange={(e) => setDraft(task.id, { text: e.target.value })}
            rows={4}
          />
          <Button size="sm" onClick={() => handleTextSubmit(task)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDone ? "تحديث المقال" : "تسليم المقال"}
          </Button>
        </div>
      );
    }

    if (task.submission_type === "link") {
      return (
        <div className="space-y-2 w-full max-w-md">
          {isDone && task.submission?.link_url && (
            <a href={task.submission.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> {task.submission.link_url}
            </a>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              defaultValue={task.submission?.link_url || ""}
              onChange={(e) => setDraft(task.id, { link: e.target.value })}
            />
            <Button size="sm" onClick={() => handleLinkSubmit(task)} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDone ? "تحديث" : "تسليم"}
            </Button>
          </div>
        </div>
      );
    }

    if (task.submission_type === "file") {
      return (
        <div className="space-y-2">
          {isDone && task.submission?.file_url && (
            <a href={task.submission.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Paperclip className="h-3.5 w-3.5" /> عرض الملف المرفوع <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => openFilePicker(task.id, "file")} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "جاري الرفع..." : isDone ? "استبدال الملف" : "رفع ملف (وورد / إكسيل / PDF)"}
          </Button>
        </div>
      );
    }

    if (task.submission_type === "video") {
      return (
        <div className="space-y-2">
          {isDone && task.submission?.video_url && (
            <a href={task.submission.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> مشاهدة الفيديو المرفوع
            </a>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => openFilePicker(task.id, "video")} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "جاري الرفع..." : isDone ? "استبدال الفيديو" : "رفع فيديو"}
          </Button>
        </div>
      );
    }

    return null;
  };

  const renderTask = (task: TaskRow) => {
    const isDone = task.submission?.status === "submitted";
    const overdue = !isDone && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
    return (
      <Card key={task.id} className={isDone ? "opacity-90" : ""}>
        <CardContent className="pt-6 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isDone ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold ${isDone ? "text-foreground" : "text-foreground"}`}>{task.title}</h3>
              {task.is_required && (
                <Badge variant="default" className="text-xs">لازمة للشهادة</Badge>
              )}
              {overdue && <Badge variant="destructive" className="text-xs">متأخرة</Badge>}
            </div>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> {task.course_title}
              </span>
              {task.lesson_title && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> درس: {task.lesson_title}
                </span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> موعد التسليم: {new Date(task.due_date).toLocaleDateString("ar-EG")}
                </span>
              )}
            </div>
            <div className="pt-1">{renderSubmissionArea(task)}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "المستخدم"}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChosen} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            المهام
          </h1>
          <p className="text-muted-foreground mt-1">المهام المضافة على الدورات التدريبية اللي مشترك فيها</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد مهام حالياً</h3>
            <p className="text-muted-foreground">هتظهر هنا أي مهمة تتضاف على دوراتك التدريبية</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-muted-foreground">قيد الإنجاز ({pending.length})</h2>
                {pending.map(renderTask)}
              </div>
            )}
            {completed.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-muted-foreground">تم إنجازها ({completed.length})</h2>
                {completed.map(renderTask)}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentTasksPage;
