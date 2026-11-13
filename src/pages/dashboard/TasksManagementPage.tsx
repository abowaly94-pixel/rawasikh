import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Pencil,
  Search,
  Calendar,
  BookOpen,
  Layers,
  Users,
  FileText,
  Link as LinkIcon,
  Video,
  CheckSquare,
  Paperclip,
  ExternalLink,
} from "lucide-react";

interface CourseOpt {
  id: string;
  title: string;
}

interface LessonOpt {
  id: string;
  title: string;
  section_id: string;
  course_id: string | null;
}

type SubmissionType = "checkbox" | "text" | "file" | "link" | "video";

interface CourseTask {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  submission_type: SubmissionType;
  is_required: boolean;
  due_date: string | null;
  created_at: string;
}

interface TaskSubmission {
  id: string;
  task_id: string;
  student_id: string;
  status: string;
  text_content: string | null;
  file_url: string | null;
  link_url: string | null;
  video_url: string | null;
  submitted_at: string | null;
  student_name?: string;
}

const NONE = "__none__";

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  checkbox: "تأكيد إنجاز فقط (بدون تسليم)",
  text: "مقال / نص مكتوب",
  file: "رفع ملف (وورد / إكسيل / PDF)",
  link: "رابط",
  video: "رفع فيديو",
};

const SUBMISSION_TYPE_ICONS: Record<SubmissionType, JSX.Element> = {
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
  file: <Paperclip className="h-3.5 w-3.5" />,
  link: <LinkIcon className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
};

const emptyForm = {
  courseId: NONE,
  lessonId: NONE,
  title: "",
  description: "",
  submissionType: "checkbox" as SubmissionType,
  isRequired: false,
  dueDate: "",
};

const TasksManagementPage = () => {
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher";
  const canManage = isAdmin || hasPermission("tasks");
  const canAccess = isAdmin || isTeacher || hasPermission("tasks");

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [submissionsTaskId, setSubmissionsTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !canAccess)) navigate("/dashboard");
  }, [user, loading, canAccess, navigate]);

  const { data: courses = [] } = useQuery({
    queryKey: ["course_tasks_courses", userRole, user?.id],
    queryFn: async () => {
      let query = supabase.from("courses").select("id, title").order("title");
      // A teacher should only see/filter by their OWN courses here, not
      // every course on the platform.
      if (isTeacher) {
        query = query.eq("instructor_id", user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as CourseOpt[]) || [];
    },
    enabled: !!user && canAccess,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["course_tasks_lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, section_id, course_sections!inner(course_id)")
        .order("title");
      if (error) throw error;
      return ((data as any[]) || []).map((l) => ({
        id: l.id,
        title: l.title,
        section_id: l.section_id,
        course_id: l.course_sections?.course_id ?? null,
      })) as LessonOpt[];
    },
    enabled: !!user && canAccess,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["course_tasks_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_tasks")
        .select("id, course_id, lesson_id, title, description, submission_type, is_required, due_date, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as CourseTask[]) || [];
    },
    enabled: !!user && canAccess,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["course_tasks_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_submissions")
        .select("id, task_id, student_id, status, text_content, file_url, link_url, video_url, submitted_at")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      const rows = (data as any[]) || [];
      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      const { data: profilesData } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        : { data: [] };
      return rows.map((r) => ({
        ...r,
        student_name: profilesData?.find((p) => p.id === r.student_id)?.full_name || "طالب",
      })) as TaskSubmission[];
    },
    enabled: !!user && canAccess,
  });

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const submissionsByTask = useMemo(() => {
    const map = new Map<string, TaskSubmission[]>();
    submissions.forEach((s) => {
      const arr = map.get(s.task_id) || [];
      arr.push(s);
      map.set(s.task_id, arr);
    });
    return map;
  }, [submissions]);

  const filteredLessonsForForm = useMemo(() => {
    if (form.courseId === NONE) return [];
    return lessons.filter((l) => l.course_id === form.courseId);
  }, [lessons, form.courseId]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const courseTitle = courseById.get(t.course_id)?.title || "";
      return t.title.toLowerCase().includes(q) || courseTitle.toLowerCase().includes(q);
    });
  }, [tasks, search, courseById]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (task: CourseTask) => {
    setEditingId(task.id);
    setForm({
      courseId: task.course_id,
      lessonId: task.lesson_id || NONE,
      title: task.title,
      description: task.description || "",
      submissionType: task.submission_type,
      isRequired: task.is_required,
      dueDate: task.due_date || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (form.courseId === NONE || !form.title.trim()) {
      toast({ title: "بيانات ناقصة", description: "اختر الدورة التدريبية واكتب عنوان المهمة", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      course_id: form.courseId,
      lesson_id: form.lessonId === NONE ? null : form.lessonId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      submission_type: form.submissionType,
      is_required: form.isRequired,
      due_date: form.dueDate || null,
    };

    const { error } = editingId
      ? await supabase.from("course_tasks").update(payload).eq("id", editingId)
      : await supabase.from("course_tasks").insert({ ...payload, created_by: user!.id });

    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "تم التعديل" : "تمت الإضافة", description: editingId ? "تم تعديل المهمة بنجاح" : "تمت إضافة المهمة الجديدة" });
    setOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["course_tasks_list"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه المهمة؟ سيتم حذف كل التسليمات المرتبطة بها أيضاً.")) return;
    const { error } = await supabase.from("course_tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["course_tasks_list"] });
    queryClient.invalidateQueries({ queryKey: ["course_tasks_submissions"] });
  };

  const submissionsTask = tasks.find((t) => t.id === submissionsTaskId) || null;
  const submissionsForDialog = submissionsTaskId ? submissionsByTask.get(submissionsTaskId) || [] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "teacher"} userName={profile?.full_name || "المستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6" />
              مهام الطلاب
            </h1>
            <p className="text-muted-foreground">
              {canManage
                ? "أضف مهام على أي دورة تدريبية (أو درس محدد منها)، وحدد إذا كانت لازمة للحصول على الشهادة، وتابع تسليمات الطلاب."
                : "عرض المهام المضافة على دوراتك التدريبية، وتسليمات طلابك."}
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              مهمة جديدة
            </Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بعنوان المهمة أو اسم الدورة التدريبية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">المهام ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
            ) : filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد مهام بعد</p>
            ) : (
              filteredTasks.map((t) => {
                const course = courseById.get(t.course_id);
                const lesson = t.lesson_id ? lessonById.get(t.lesson_id) : null;
                const submittedCount = (submissionsByTask.get(t.id) || []).length;
                return (
                  <div key={t.id} className="flex items-start justify-between gap-3 p-4 rounded-lg border bg-background">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.title}</span>
                        <Badge variant={t.is_required ? "default" : "secondary"} className="text-xs">
                          {t.is_required ? "لازمة للشهادة" : "اختيارية"}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {SUBMISSION_TYPE_ICONS[t.submission_type]}
                          {SUBMISSION_TYPE_LABELS[t.submission_type]}
                        </Badge>
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course?.title || "—"}
                        </span>
                        {lesson && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            درس: {lesson.title}
                          </span>
                        )}
                        {t.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(t.due_date).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 mt-1"
                        onClick={() => setSubmissionsTaskId(t.id)}
                      >
                        <Users className="h-3.5 w-3.5" />
                        التسليمات ({submittedCount})
                      </Button>
                    </div>
                    {canManage && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
            <DialogDescription>
              المهمة هتظهر تلقائياً لكل الطلاب المشتركين في الدورة التدريبية اللي هتختاريها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الدورة التدريبية *</Label>
              <SearchableSelect
                value={form.courseId}
                onValueChange={(v) => setForm({ ...form, courseId: v, lessonId: NONE })}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                placeholder="اختر الدورة التدريبية"
                searchPlaceholder="ابحثي عن دورة تدريبية..."
                emptyText="لا توجد دورات تدريبية مطابقة"
              />
            </div>
            <div className="space-y-2">
              <Label>الدرس (اختياري)</Label>
              <SearchableSelect
                value={form.lessonId}
                onValueChange={(v) => setForm({ ...form, lessonId: v })}
                options={[
                  { value: NONE, label: "كل الدورة التدريبية (بدون درس محدد)" },
                  ...filteredLessonsForForm.map((l) => ({ value: l.id, label: l.title })),
                ]}
                placeholder={form.courseId === NONE ? "اختر الدورة التدريبية أولاً" : "اختر الدرس"}
                searchPlaceholder="ابحثي عن درس..."
                emptyText="لا توجد دروس"
                disabled={form.courseId === NONE}
              />
            </div>
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: كتابة مقال عن الدرس"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>طريقة التسليم *</Label>
              <SearchableSelect
                value={form.submissionType}
                onValueChange={(v) => setForm({ ...form, submissionType: v as SubmissionType })}
                options={(Object.keys(SUBMISSION_TYPE_LABELS) as SubmissionType[]).map((k) => ({
                  value: k,
                  label: SUBMISSION_TYPE_LABELS[k],
                }))}
                placeholder="اختر طريقة التسليم"
                searchPlaceholder="بحث..."
                emptyText="—"
              />
              <p className="text-xs text-muted-foreground">
                اختر "تأكيد إنجاز فقط" لو المهمة مش محتاجة تسليم فعلي (زي مذاكرة درس مثلاً)، وأي نوع تاني هيفتح للطالب مساحة يسلّم فيها فعلياً.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>لازمة للحصول على الشهادة</Label>
                <p className="text-xs text-muted-foreground">
                  لو مفعّلة، مش هينفع الطالب ياخد شهادة الدورة التدريبية غير لما يخلّص المهمة دي.
                </p>
              </div>
              <Switch
                checked={form.isRequired}
                onCheckedChange={(v) => setForm({ ...form, isRequired: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>موعد التسليم (اختياري)</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المهمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions dialog */}
      <Dialog open={!!submissionsTaskId} onOpenChange={(v) => !v && setSubmissionsTaskId(null)}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>تسليمات: {submissionsTask?.title}</DialogTitle>
            <DialogDescription>
              {submissionsTask && (
                <>
                  الدورة التدريبية: {courseById.get(submissionsTask.course_id)?.title || "—"}
                  {submissionsTask.lesson_id && (
                    <> · الدرس: {lessonById.get(submissionsTask.lesson_id)?.title || "—"}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {submissionsForDialog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لسه محدش سلّم المهمة دي</p>
            ) : (
              submissionsForDialog.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium">{s.student_name}</span>
                    {s.submitted_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.submitted_at).toLocaleString("ar-EG")}
                      </span>
                    )}
                  </div>
                  {s.text_content && (
                    <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">{s.text_content}</p>
                  )}
                  {s.file_url && (
                    <a
                      href={s.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      تحميل الملف المرفوع
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.link_url && (
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {s.link_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.video_url && (
                    <a
                      href={s.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" />
                      مشاهدة الفيديو
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {!s.text_content && !s.file_url && !s.link_url && !s.video_url && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5" />
                      أكّد إنجاز المهمة
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TasksManagementPage;
