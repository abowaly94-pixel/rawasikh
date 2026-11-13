import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Video, ExternalLink, Copy, Eye, EyeOff, ScrollText, RefreshCw, BookPlus, ListChecks } from "lucide-react";
import { logZoomAudit } from "@/lib/zoomAudit";

interface ZoomLink {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
  course_id: string | null;
  lesson_id: string | null;
  meeting_id: string | null;
  passcode: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseOpt { id: string; title: string }
interface LessonOpt { id: string; title: string; course_id: string | null }
interface SectionOpt { id: string; title: string; course_id: string; order_index: number }

const NONE = "__none__";

const emptyForm = {
  title: "",
  url: "",
  meeting_id: "",
  passcode: "",
  is_active: true,
  course_id: NONE as string,
  lesson_id: NONE as string,
  lessonMode: "existing" as "existing" | "new",
  newLessonTitle: "",
  newLessonSectionId: NONE as string,
};

const ManageZoomLinksPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const isAdmin = userRole === "admin";
  const canAccess = isAdmin || hasPermission("zoom_links");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [links, setLinks] = useState<ZoomLink[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [lessons, setLessons] = useState<LessonOpt[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    // انتظر لحد ما userRole يتحمل فعلاً قبل ما نقرر إعادة التوجيه
    if (!user) {
      navigate("/dashboard");
      return;
    }
    if (userRole === null) return;
    if (!canAccess) {
      navigate("/dashboard");
      return;
    }
    fetchAll();
    if (isAdmin) fetchAudit();
    // سجّل دخول الأدمن لصفحة إدارة روابط Zoom
    logZoomAudit({ action: "view_list", metadata: { page: "ManageZoomLinksPage" } });
  }, [user, userRole, isAdmin, canAccess, authLoading, navigate]);

  const fetchAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("zoom_audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setAuditLog((data as any) || []);
    setAuditLoading(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [linksRes, coursesRes, lessonsRes, sectionsRes] = await Promise.all([
      supabase.from("zoom_links" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("course_lessons").select("id, title, section_id, course_sections!inner(course_id)").order("title"),
      supabase.from("course_sections").select("id, title, course_id, order_index").order("order_index"),
    ]);

    if (linksRes.error) {
      toast({ title: "خطأ", description: linksRes.error.message, variant: "destructive" });
    } else {
      setLinks((linksRes.data as any) || []);
    }
    setCourses((coursesRes.data as any) || []);
    const normalizedLessons = ((lessonsRes.data as any[]) || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      course_id: l.course_sections?.course_id ?? null,
    }));
    setLessons(normalizedLessons);
    setSections((sectionsRes.data as any) || []);

    setLoading(false);
  };

  const coursesById = useMemo(() => {
    const m = new Map<string, string>();
    courses.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

  const lessonsById = useMemo(() => {
    const m = new Map<string, string>();
    lessons.forEach((l) => m.set(l.id, l.title));
    return m;
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    if (form.course_id === NONE) return lessons;
    return lessons.filter((l) => l.course_id === form.course_id);
  }, [lessons, form.course_id]);

  const filteredSections = useMemo(() => {
    if (form.course_id === NONE) return [];
    return sections.filter((s) => s.course_id === form.course_id);
  }, [sections, form.course_id]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (link: ZoomLink) => {
    setEditingId(link.id);
    setForm({
      title: link.title,
      url: link.url,
      meeting_id: link.meeting_id || "",
      passcode: link.passcode || "",
      is_active: link.is_active,
      course_id: link.course_id || NONE,
      lesson_id: link.lesson_id || NONE,
      lessonMode: "existing",
      newLessonTitle: "",
      newLessonSectionId: NONE,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ title: "بيانات ناقصة", description: "العنوان والرابط مطلوبين", variant: "destructive" });
      return;
    }
    if (form.lessonMode === "new" && !form.newLessonTitle.trim()) {
      toast({ title: "بيانات ناقصة", description: "اكتب اسم الدرس الجديد", variant: "destructive" });
      return;
    }
    if (form.lessonMode === "new" && form.course_id === NONE) {
      toast({ title: "بيانات ناقصة", description: "اختر الدورة التدريبية أولاً قبل إضافة درس جديد", variant: "destructive" });
      return;
    }

    setSaving(true);

    // If the admin is scheduling a live session for a lesson that doesn't
    // exist yet (not recorded/uploaded), create a lightweight lesson row now
    // (with no video/pdf) so it immediately shows up in "إدارة الكورسات"
    // ready for the recording + PDF to be uploaded after the session.
    let resolvedLessonId: string | null = form.lesson_id === NONE ? null : form.lesson_id;
    if (form.lessonMode === "new") {
      let sectionId = form.newLessonSectionId !== NONE ? form.newLessonSectionId : null;

      if (!sectionId) {
        const courseSections = sections.filter((s) => s.course_id === form.course_id);
        if (courseSections.length > 0) {
          sectionId = courseSections[0].id;
        } else {
          // No sections at all for this course yet — create a default one.
          const { data: newSection, error: sectionErr } = await supabase
            .from("course_sections")
            .insert({ course_id: form.course_id, title: "جلسات مباشرة", order_index: 0 })
            .select("id")
            .single();
          if (sectionErr || !newSection) {
            setSaving(false);
            toast({ title: "خطأ", description: sectionErr?.message || "فشل إنشاء قسم للدرس الجديد", variant: "destructive" });
            return;
          }
          sectionId = newSection.id;
        }
      }

      const sectionLessons = lessons.filter((l) => l.course_id === form.course_id);
      const newLessonTitleTrimmed = form.newLessonTitle.trim();

      // Guard against creating a duplicate lesson: if a lesson with this
      // exact title already exists in this course, reuse it instead of
      // inserting a new placeholder row (this was causing lectures to
      // show up twice whenever a Zoom link was re-saved in "new lesson"
      // mode with the same title).
      const existingMatch = sectionLessons.find(
        (l) => l.title.trim() === newLessonTitleTrimmed
      );

      if (existingMatch) {
        resolvedLessonId = existingMatch.id;
      } else {
        const { data: newLesson, error: lessonErr } = await supabase
          .from("course_lessons")
          .insert({
            section_id: sectionId,
            title: newLessonTitleTrimmed,
            order_index: sectionLessons.length,
            is_free: false,
          })
          .select("id")
          .single();

        if (lessonErr || !newLesson) {
          setSaving(false);
          toast({ title: "خطأ", description: lessonErr?.message || "فشل إنشاء الدرس الجديد", variant: "destructive" });
          return;
        }
        resolvedLessonId = newLesson.id;
      }
    }

    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      meeting_id: form.meeting_id.trim() || null,
      passcode: form.passcode.trim() || null,
      is_active: form.is_active,
      course_id: form.course_id === NONE ? null : form.course_id,
      lesson_id: resolvedLessonId,
    };
    let error;
    let savedId: string | null = editingId;
    if (editingId) {
      ({ error } = await supabase.from("zoom_links" as any).update(payload).eq("id", editingId));
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("zoom_links" as any)
        .insert({ ...payload, created_by: user?.id })
        .select("id")
        .single();
      error = insErr;
      savedId = (inserted as any)?.id ?? null;
    }
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    logZoomAudit({
      action: editingId ? "update" : "create",
      zoom_link_id: savedId,
      target_title: payload.title,
      target_url: payload.url,
      course_id: payload.course_id,
      lesson_id: payload.lesson_id,
      metadata: { is_active: payload.is_active },
    });
    toast({ title: editingId ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    fetchAll();
    fetchAudit();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الرابط؟")) return;
    const target = links.find((l) => l.id === id);
    const { error } = await supabase.from("zoom_links" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    logZoomAudit({
      action: "delete",
      zoom_link_id: id,
      target_title: target?.title,
      target_url: target?.url,
      course_id: target?.course_id,
      lesson_id: target?.lesson_id,
    });
    toast({ title: "تم الحذف" });
    fetchAll();
    fetchAudit();
  };

  const toggleActive = async (link: ZoomLink) => {
    const { error } = await supabase
      .from("zoom_links" as any)
      .update({ is_active: !link.is_active })
      .eq("id", link.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    logZoomAudit({
      action: "toggle_active",
      zoom_link_id: link.id,
      target_title: link.title,
      target_url: link.url,
      course_id: link.course_id,
      lesson_id: link.lesson_id,
      metadata: { from: link.is_active, to: !link.is_active },
    });
    fetchAll();
    fetchAudit();
  };

  const copyLink = (link: ZoomLink) => {
    navigator.clipboard.writeText(link.url);
    logZoomAudit({
      action: "copy_url",
      zoom_link_id: link.id,
      target_title: link.title,
      target_url: link.url,
    });
    toast({ title: "تم نسخ الرابط" });
  };

  const openLink = (link: ZoomLink) => {
    logZoomAudit({
      action: "open_url",
      zoom_link_id: link.id,
      target_title: link.title,
      target_url: link.url,
    });
  };

  const scopeLabel = (link: ZoomLink) => {
    if (link.lesson_id) return `درس: ${lessonsById.get(link.lesson_id) || "—"}`;
    if (link.course_id) return `دورة تدريبية: ${coursesById.get(link.course_id) || "—"}`;
    return "مستقلة";
  };

  // فحص تلقائي لسلامة IDs
  const validateLink = (link: ZoomLink): { ok: boolean; reason?: string } => {
    if (link.lesson_id && !lessonsById.has(link.lesson_id)) {
      return { ok: false, reason: "معرّف الدرس لا يطابق أي درس في course_lessons" };
    }
    if (link.course_id && !coursesById.has(link.course_id)) {
      return { ok: false, reason: "معرّف الدورة التدريبية لا يطابق أي دورة تدريبية" };
    }
    return { ok: true };
  };

  const brokenLinks = links.filter((l) => !validateLink(l).ok);


  // منع عرض المحتوى قبل التأكد إن المستخدم أدمن
  if (authLoading || userRole === null) {
    return (
      <DashboardLayout userRole={userRole} userName={profile?.full_name}>
        <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
      </DashboardLayout>
    );
  }
  if (!canAccess) {
    return (
      <DashboardLayout userRole={userRole} userName={profile?.full_name}>
        <div className="p-8 text-center text-muted-foreground">هذه الصفحة متاحة للأدمن فقط.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              روابط Zoom
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              أضف روابط جلسات Zoom واربطها بدورة تدريبية أو درس معين، أو خليها مستقلة.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة رابط جديد
          </Button>
        </div>

        {brokenLinks.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 text-sm">
              <p className="font-bold text-destructive mb-1">
                ⚠️ تنبيه: تم اكتشاف {brokenLinks.length} رابط بمعرّفات غير مطابقة
              </p>
              <p className="text-muted-foreground text-xs">
                عدّل هذه الروابط أو احذفها لتفادي مشاكل ظهورها في صفحات الدروس/الدورات التدريبية.
              </p>
            </CardContent>
          </Card>
        )}


        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
            ) : links.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد روابط Zoom بعد. اضغط "إضافة رابط جديد" للبدء.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">مرتبط بـ</TableHead>
                      <TableHead className="text-right">الرابط</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => {
                      const v = validateLink(link);
                      return (
                      <TableRow key={link.id} className={!v.ok ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {link.title}
                            {!v.ok && (
                              <Badge variant="destructive" className="text-[10px]" title={v.reason}>
                                معرّف غير صالح
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{scopeLabel(link)}</Badge>
                        </TableCell>

                        <TableCell className="max-w-[240px] truncate text-muted-foreground text-sm">
                          {link.url}
                        </TableCell>
                        <TableCell>
                          {link.is_active ? (
                            <Badge variant="default">مفعّل</Badge>
                          ) : (
                            <Badge variant="secondary">معطّل</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => copyLink(link)} title="نسخ">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" asChild title="فتح" onClick={() => openLink(link)}>
                              <a href={link.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleActive(link)}
                              title={link.is_active ? "تعطيل" : "تفعيل"}
                            >
                              {link.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(link)} title="تعديل">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(link.id)}
                              title="حذف"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}

                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>


        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل رابط Zoom" : "إضافة رابط Zoom"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="zoom-title">العنوان *</Label>
                <Input
                  id="zoom-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: جلسة مراجعة الفصل الأول"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoom-url">رابط Zoom *</Label>
                <Input
                  id="zoom-url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zoom-meeting-id">Meeting ID (اختياري)</Label>
                  <Input
                    id="zoom-meeting-id"
                    value={form.meeting_id}
                    onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
                    placeholder="123 4567 8901"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoom-passcode">Passcode (اختياري)</Label>
                  <Input
                    id="zoom-passcode"
                    value={form.passcode}
                    onChange={(e) => setForm({ ...form, passcode: e.target.value })}
                    placeholder="مثال: 123456"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الدورة التدريبية (اختياري)</Label>
                <SearchableSelect
                  value={form.course_id}
                  onValueChange={(v) => setForm({ ...form, course_id: v, lesson_id: NONE })}
                  options={[
                    { value: NONE, label: "— بدون (جلسة مستقلة) —" },
                    ...courses.map((c) => ({ value: c.id, label: c.title })),
                  ]}
                  placeholder="اختر دورة تدريبية"
                  searchPlaceholder="ابحث باسم الدورة التدريبية..."
                  emptyText="لا توجد دورات تدريبية مطابقة"
                />
              </div>

              <div className="space-y-2">
                <Label>الدرس (اختياري)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.lessonMode === "existing" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, lessonMode: "existing" })}
                    className="gap-1.5"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    من الدروس الموجودة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.lessonMode === "new" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, lessonMode: "new", lesson_id: NONE })}
                    className="gap-1.5"
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                    درس جديد (لسه هيتسجل)
                  </Button>
                </div>

                {form.lessonMode === "existing" ? (
                  <>
                    <Select
                      value={form.lesson_id}
                      onValueChange={(v) => setForm({ ...form, lesson_id: v })}
                      disabled={form.course_id === NONE && filteredLessons.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر درس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— بدون درس محدد —</SelectItem>
                        {filteredLessons.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.course_id === NONE && (
                      <p className="text-xs text-muted-foreground">
                        اختر دورة تدريبية أولاً عشان تظهر دروسها، أو سيبها بدون درس.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      هيتم إنشاء درس جديد بالاسم ده تحت الدورة التدريبية المختارة، وهيظهر بعدين في "إدارة الدورات التدريبية" عشان ترفعي التسجيل والـ PDF بعد الجلسة.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="new-lesson-title">اسم الدرس الجديد *</Label>
                      <Input
                        id="new-lesson-title"
                        value={form.newLessonTitle}
                        onChange={(e) => setForm({ ...form, newLessonTitle: e.target.value })}
                        placeholder="مثال: اللقاء التعريفي"
                        disabled={form.course_id === NONE}
                      />
                    </div>
                    {form.course_id !== NONE && filteredSections.length > 0 && (
                      <div className="space-y-2">
                        <Label>القسم (اختياري)</Label>
                        <Select
                          value={form.newLessonSectionId}
                          onValueChange={(v) => setForm({ ...form, newLessonSectionId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="أول قسم بالدورة التدريبية (تلقائي)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— أول قسم بالدورة التدريبية (تلقائي) —</SelectItem>
                            {filteredSections.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {form.course_id === NONE && (
                      <p className="text-xs text-destructive">
                        اختر الدورة التدريبية أولاً عشان نقدر نضيف الدرس الجديد جواها.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="zoom-active">مفعّل</Label>
                <Switch
                  id="zoom-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageZoomLinksPage;
