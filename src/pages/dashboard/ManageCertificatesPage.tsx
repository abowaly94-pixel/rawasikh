import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import HostingerImageUpload from "@/components/HostingerImageUpload";
import CertificateView, {
  CertificateTemplate,
  DEFAULT_CERTIFICATE_TEMPLATE,
  CertificateFieldKey,
  CERTIFICATE_FIELD_ORDER,
  CERTIFICATE_FIELD_LABELS,
  CERTIFICATE_FONT_OPTIONS,
  resolveCertificateFieldLayout,
} from "@/components/certificates/CertificateView";
import { useCertificateTemplate, saveCertificateTemplate } from "@/hooks/useCertificateTemplate";
import {
  Award,
  Search,
  Pencil,
  Trash2,
  Plus,
  Eye,
  RotateCcw,
  Save,
  ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MousePointerClick,
} from "lucide-react";

interface CertificateRow {
  id: string;
  student_id: string;
  course_id: string;
  certificate_number: string;
  student_name: string;
  honorific: string | null;
  course_title: string;
  issued_at: string;
}

interface ProfileOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

const genCertificateNumber = () =>
  `RWK-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const emptyEditForm = {
  id: "",
  certificate_number: "",
  student_name: "",
  honorific: "",
  course_title: "",
};

const ManageCertificatesPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canAccess = userRole === "admin" || hasPermission("certificates");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !canAccess) navigate("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, userRole]);

  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");

  // ===== Certificates list =====
  const { data: certificates, isLoading } = useQuery({
    queryKey: ["all_certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, student_id, course_id, certificate_number, student_name, honorific, course_title, issued_at")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as CertificateRow[];
    },
    enabled: !!user && canAccess,
  });

  const filtered = useMemo(() => {
    if (!certificates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        c.student_name.toLowerCase().includes(q) ||
        c.course_title.toLowerCase().includes(q) ||
        c.certificate_number.toLowerCase().includes(q),
    );
  }, [certificates, search]);

  // ===== Manual issue dialog =====
  const [issueOpen, setIssueOpen] = useState(false);
  const [students, setStudents] = useState<ProfileOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [issueStudentId, setIssueStudentId] = useState("");
  const [issueCourseId, setIssueCourseId] = useState("");
  const [issueNumber, setIssueNumber] = useState(genCertificateNumber());
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const openIssueDialog = async () => {
    setIssueStudentId("");
    setIssueCourseId("");
    setIssueNumber(genCertificateNumber());
    setIssueOpen(true);
    if (students.length === 0) {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      setStudents((data || []) as ProfileOption[]);
    }
    if (courses.length === 0) {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      setCourses((data || []) as CourseOption[]);
    }
  };

  const submitIssue = async () => {
    if (!issueStudentId || !issueCourseId) {
      toast({ title: "بيانات ناقصة", description: "اختر الطالب والدورة التدريبية", variant: "destructive" });
      return;
    }
    const student = students.find((s) => s.id === issueStudentId);
    const course = courses.find((c) => c.id === issueCourseId);

    setIssueSubmitting(true);
    const { data: existing } = await supabase
      .from("certificates")
      .select("id")
      .eq("student_id", issueStudentId)
      .eq("course_id", issueCourseId)
      .maybeSingle();

    if (existing) {
      setIssueSubmitting(false);
      toast({
        title: "الشهادة موجودة بالفعل",
        description: "هذا الطالب عنده شهادة لهذه الدورة التدريبية بالفعل — عدّلها بدل ما تصدر واحدة جديدة",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("certificates").insert({
      student_id: issueStudentId,
      course_id: issueCourseId,
      certificate_number: issueNumber.trim(),
      student_name: student?.full_name || "",
      course_title: course?.title || "",
    });
    setIssueSubmitting(false);

    if (error) {
      const isDuplicateNumber = (error as any).code === "23505" && error.message.includes("certificate_number");
      toast({
        title: "خطأ",
        description: isDuplicateNumber ? "رقم الشهادة ده مستخدم بالفعل، جرّبي رقم تاني" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "تم الإصدار 🎓", description: `اتصدرت الشهادة لـ ${student?.full_name}` });
    setIssueOpen(false);
    queryClient.invalidateQueries({ queryKey: ["all_certificates"] });
  };

  // ===== Edit dialog =====
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEdit = (cert: CertificateRow) => {
    setEditForm({
      id: cert.id,
      certificate_number: cert.certificate_number,
      student_name: cert.student_name,
      honorific: cert.honorific || "",
      course_title: cert.course_title,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editForm.certificate_number.trim() || !editForm.student_name.trim() || !editForm.course_title.trim()) {
      toast({ title: "بيانات ناقصة", description: "من فضلك أكمل كل الحقول", variant: "destructive" });
      return;
    }
    setEditSubmitting(true);
    const { error } = await supabase
      .from("certificates")
      .update({
        certificate_number: editForm.certificate_number.trim(),
        student_name: editForm.student_name.trim(),
        honorific: editForm.honorific.trim() || null,
        course_title: editForm.course_title.trim(),
      })
      .eq("id", editForm.id);
    setEditSubmitting(false);

    if (error) {
      const isDuplicateNumber = (error as any).code === "23505" && error.message.includes("certificate_number");
      toast({
        title: "خطأ",
        description: isDuplicateNumber ? "رقم الشهادة ده مستخدم بالفعل، جرّبي رقم تاني" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "تم الحفظ", description: "اتعدّلت بيانات الشهادة" });
    setEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ["all_certificates"] });
  };

  const handleDelete = async (cert: CertificateRow) => {
    if (!confirm(`هل أنت متأكد من حذف شهادة "${cert.student_name}"؟ الإجراء ده مش هيتراجع فيه.`)) return;
    const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف", description: "اتحذفت الشهادة" });
    queryClient.invalidateQueries({ queryKey: ["all_certificates"] });
  };

  // ===== Template designer =====
  const { data: savedTemplate } = useCertificateTemplate();
  const [draftTemplate, setDraftTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    if (savedTemplate) setDraftTemplate(savedTemplate);
  }, [savedTemplate]);

  const updateTemplate = (patch: Partial<CertificateTemplate>) =>
    setDraftTemplate((prev) => ({ ...prev, ...patch }));

  const saveTemplate = async () => {
    setTemplateSaving(true);
    try {
      await saveCertificateTemplate(draftTemplate);
      toast({ title: "تم الحفظ", description: "تصميم الشهادة اتحفظ وهيتطبق على كل الشهادات الجديدة والحالية" });
      queryClient.invalidateQueries({ queryKey: ["certificate_template"] });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل حفظ التصميم", variant: "destructive" });
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetTemplate = () => {
    setDraftTemplate(DEFAULT_CERTIFICATE_TEMPLATE);
    setSelectedField(null);
  };

  // ===== Per-field position/size/font/color designer =====
  const [selectedField, setSelectedField] = useState<CertificateFieldKey | null>(null);

  const updateFieldLayout = (key: CertificateFieldKey, patch: Partial<Record<string, unknown>>) => {
    setDraftTemplate((prev) => {
      const current = resolveCertificateFieldLayout(prev, key);
      return {
        ...prev,
        layout: {
          ...prev.layout,
          [key]: { ...current, ...patch },
        },
      };
    });
  };

  const nudgeField = (key: CertificateFieldKey, dx: number, dy: number) => {
    const current = resolveCertificateFieldLayout(draftTemplate, key);
    updateFieldLayout(key, {
      x: Math.min(100, Math.max(0, Math.round((current.x + dx) * 10) / 10)),
      y: Math.min(100, Math.max(0, Math.round((current.y + dy) * 10) / 10)),
    });
  };

  const resetFieldLayout = (key: CertificateFieldKey) => {
    setDraftTemplate((prev) => {
      const layout = { ...prev.layout };
      delete (layout as Record<string, unknown>)[key];
      return { ...prev, layout };
    });
  };

  const clampPercent = (value: string) => {
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "الأدمن"}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الشهادات</h1>
              <p className="text-muted-foreground text-sm">
                إدارة كل شهادات إتمام الدورات التدريبية، وتصميم شكل الشهادة اللي بتتصدر للطلاب
              </p>
            </div>
          </div>
          {activeTab === "list" && (
            <Button onClick={openIssueDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              إصدار شهادة يدويًا
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <Award className="h-4 w-4" />
              الشهادات
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              تصميم الشهادة
            </TabsTrigger>
          </TabsList>

          {/* ================= LIST TAB ================= */}
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو الدورة التدريبية أو رقم الشهادة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{certificates && certificates.length > 0 ? "مفيش نتائج مطابقة للبحث" : "لسه مفيش شهادات اتصدرت"}</p>
                  </div>
                ) : (
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">الدورة التدريبية</TableHead>
                        <TableHead className="text-right">رقم الشهادة</TableHead>
                        <TableHead className="text-right">تاريخ الإصدار</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="text-right font-medium max-w-[220px] truncate">
                            {cert.student_name}
                          </TableCell>
                          <TableCell className="text-right max-w-[260px] truncate">{cert.course_title}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground" dir="ltr">
                            {cert.certificate_number}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                            {new Date(cert.issued_at).toLocaleDateString("en-GB")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" asChild title="عرض / طباعة">
                                <Link to={`/certificate/${cert.id}`} target="_blank">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(cert)} title="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(cert)}
                                className="text-destructive"
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TEMPLATE TAB ================= */}
          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">إعدادات التصميم</CardTitle>
                  <CardDescription>
                    ارفعي خلفية جاهزة لو عندك تصميم خاص، أو خصّص الألوان والنصوص واستخدم التصميم الافتراضي
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>خلفية الشهادة (اختياري)</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <HostingerImageUpload
                        folder="certificates"
                        label={draftTemplate.backgroundUrl ? "تغيير الخلفية" : "رفع خلفية مخصصة"}
                        onUploaded={(url) => updateTemplate({ backgroundUrl: url })}
                      />
                      {draftTemplate.backgroundUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => updateTemplate({ backgroundUrl: "" })}
                        >
                          إزالة الخلفية
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      لو رفعتِ خلفية، هتتشال الحدود الافتراضية (الأزرق والذهبي) وهيتظبق اسم الطالب واسم الدورة التدريبية فوقها تلقائيًا
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>إظهار الشعار واسم المنصة</Label>
                      <p className="text-xs text-muted-foreground mt-1">لو الخلفية المرفوعة فيها شعار بالفعل، سيبيه مقفول</p>
                    </div>
                    <Switch
                      checked={draftTemplate.showBrandHeader ?? true}
                      onCheckedChange={(v) => updateTemplate({ showBrandHeader: v })}
                    />
                  </div>

                  {draftTemplate.showBrandHeader && (
                    <div className="space-y-2">
                      <Label>شعار مخصص (اختياري)</Label>
                      <div className="flex items-center gap-3 flex-wrap">
                        <HostingerImageUpload
                          folder="certificates"
                          label={draftTemplate.logoUrl ? "تغيير الشعار" : "رفع شعار"}
                          onUploaded={(url) => updateTemplate({ logoUrl: url })}
                        />
                        {draftTemplate.logoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => updateTemplate({ logoUrl: "" })}
                          >
                            استخدام شعار رواسخ الافتراضي
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اللون الأساسي</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTemplate.primaryColor || DEFAULT_CERTIFICATE_TEMPLATE.primaryColor}
                          onChange={(e) => updateTemplate({ primaryColor: e.target.value })}
                          className="h-9 w-12 rounded border cursor-pointer"
                        />
                        <Input
                          value={draftTemplate.primaryColor || ""}
                          onChange={(e) => updateTemplate({ primaryColor: e.target.value })}
                          dir="ltr"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>لون التمييز (الإطار الذهبي)</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTemplate.accentColor || DEFAULT_CERTIFICATE_TEMPLATE.accentColor}
                          onChange={(e) => updateTemplate({ accentColor: e.target.value })}
                          className="h-9 w-12 rounded border cursor-pointer"
                        />
                        <Input
                          value={draftTemplate.accentColor || ""}
                          onChange={(e) => updateTemplate({ accentColor: e.target.value })}
                          dir="ltr"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>اسم المنصة</Label>
                    <Input
                      value={draftTemplate.orgName || ""}
                      onChange={(e) => updateTemplate({ orgName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>عنوان الشهادة</Label>
                    <Input
                      value={draftTemplate.titleText || ""}
                      onChange={(e) => updateTemplate({ titleText: e.target.value })}
                    />
                </div>
                  <div className="space-y-2">
                    <Label>نص "تُمنح هذه الشهادة إلى"</Label>
                    <Input
                      value={draftTemplate.introText || ""}
                      onChange={(e) => updateTemplate({ introText: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نص "لإتمامه بنجاح دورة"</Label>
                    <Input
                      value={draftTemplate.completionText || ""}
                      onChange={(e) => updateTemplate({ completionText: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button onClick={saveTemplate} disabled={templateSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {templateSaving ? "جاري الحفظ..." : "حفظ التصميم"}
                    </Button>
                    <Button variant="outline" onClick={resetTemplate} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      استعادة الافتراضي
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    معاينة حية — اضغطي على أي جزء من النص واسحبيه لتحريكه لأي مكان
                  </Label>
                </div>
                <div className="overflow-auto rounded-lg border bg-muted/30 p-4">
                  <div className="scale-[0.7] origin-top-right lg:scale-100">
                    <CertificateView
                      studentName="أحمد محمد"
                      courseTitle="اسم الدورة التدريبية هيظهر هنا"
                      certificateNumber="RWK-2026-XXXXXXXX"
                      issuedAt={new Date().toISOString()}
                      template={draftTemplate}
                      editable
                      selectedField={selectedField}
                      onSelectField={setSelectedField}
                      onFieldPositionChange={(key, x, y) => updateFieldLayout(key, { x, y })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CERTIFICATE_FIELD_ORDER.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant={selectedField === key ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setSelectedField(key)}
                    >
                      {CERTIFICATE_FIELD_LABELS[key]}
                    </Button>
                  ))}
                </div>

                {selectedField ? (
                  (() => {
                    const layout = resolveCertificateFieldLayout(draftTemplate, selectedField);
                    return (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between gap-2">
                            <span>{CERTIFICATE_FIELD_LABELS[selectedField]}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => resetFieldLayout(selectedField)}
                                title="إعادة هذا العنصر للوضع الافتراضي"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                افتراضي
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedField(null)}>
                                إغلاق
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs">الموضع (استخدمي الأسهم أو اسحبي في المعاينة)</Label>
                            <div className="flex items-center justify-center py-1">
                              <div className="grid grid-cols-3 gap-1 w-28">
                                <div />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => nudgeField(selectedField, 0, -1)}>
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <div />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => nudgeField(selectedField, -1, 0)}>
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                                <div />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => nudgeField(selectedField, 1, 0)}>
                                  <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => nudgeField(selectedField, 0, 1)}>
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <div />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">يمين / شمال (%)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={layout.x}
                                  onChange={(e) => updateFieldLayout(selectedField, { x: clampPercent(e.target.value) })}
                                  dir="ltr"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">فوق / تحت (%)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={layout.y}
                                  onChange={(e) => updateFieldLayout(selectedField, { y: clampPercent(e.target.value) })}
                                  dir="ltr"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">حجم الخط ({layout.fontSize}px)</Label>
                            <Slider
                              min={8}
                              max={72}
                              step={1}
                              value={[layout.fontSize]}
                              onValueChange={([v]) => updateFieldLayout(selectedField, { fontSize: v })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">نوع الخط</Label>
                              <Select
                                value={layout.fontFamily || "__default__"}
                                onValueChange={(v) => updateFieldLayout(selectedField, { fontFamily: v === "__default__" ? "" : v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CERTIFICATE_FONT_OPTIONS.map((f) => (
                                    <SelectItem key={f.value || "__default__"} value={f.value || "__default__"}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">اللون</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={layout.color}
                                  onChange={(e) => updateFieldLayout(selectedField, { color: e.target.value })}
                                  className="h-9 w-10 rounded border cursor-pointer shrink-0"
                                />
                                <Input
                                  value={layout.color}
                                  onChange={(e) => updateFieldLayout(selectedField, { color: e.target.value })}
                                  dir="ltr"
                                  className="font-mono text-xs h-9"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-xs">خط عريض (Bold)</Label>
                            <Switch
                              checked={layout.bold}
                              onCheckedChange={(v) => updateFieldLayout(selectedField, { bold: v })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">محاذاة النص</Label>
                            <ToggleGroup
                              type="single"
                              value={layout.align}
                              onValueChange={(v) => v && updateFieldLayout(selectedField, { align: v as "right" | "center" | "left" })}
                              className="justify-start"
                            >
                              <ToggleGroupItem value="right" className="text-xs px-3">يمين</ToggleGroupItem>
                              <ToggleGroupItem value="center" className="text-xs px-3">وسط</ToggleGroupItem>
                              <ToggleGroupItem value="left" className="text-xs px-3">شمال</ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    اضغطي على أي عنصر (اسم الطالب، اسم الدورة التدريبية، التاريخ...) في الشهادة فوق، أو من الأزرار اللي فوق، عشان تحركيه أو تغيّري شكله
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Issue certificate dialog ===== */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إصدار شهادة يدويًا</DialogTitle>
            <DialogDescription>لإصدار شهادة لطالب بدون الانتظار لإتمام الدورة التدريبية تلقائيًا</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الطالب</Label>
              <SearchableSelect
                value={issueStudentId}
                onValueChange={setIssueStudentId}
                options={students.map((s) => ({
                  value: s.id,
                  label: s.full_name,
                  keywords: s.email ? [s.email] : [],
                }))}
                placeholder="اختر الطالب..."
                searchPlaceholder="ابحث بالاسم أو الإيميل..."
              />
            </div>
            <div className="space-y-2">
              <Label>الدورة التدريبية</Label>
              <SearchableSelect
                value={issueCourseId}
                onValueChange={setIssueCourseId}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                placeholder="اختر الدورة التدريبية..."
                searchPlaceholder="ابحث عن دورة تدريبية..."
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الشهادة</Label>
              <div className="flex items-center gap-2">
                <Input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} dir="ltr" className="font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={() => setIssueNumber(genCertificateNumber())} title="توليد رقم جديد">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>إلغاء</Button>
            <Button onClick={submitIssue} disabled={issueSubmitting}>
              {issueSubmitting ? "جاري الإصدار..." : "إصدار الشهادة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit certificate dialog ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الشهادة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الطالب</Label>
              <Input
                value={editForm.student_name}
                onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>اللقب (اختياري، مثل: المهندس / د. / أ.)</Label>
              <Input
                placeholder="مثال: المهندس"
                value={editForm.honorific}
                onChange={(e) => setEditForm({ ...editForm, honorific: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                يظهر اللقب قبل اسم الطالب مباشرة على الشهادة. يمكن للطالب نفسه أيضاً تعديل لقبه من صفحة "شهاداتي".
              </p>
            </div>
            <div className="space-y-2">
              <Label>اسم الدورة التدريبية</Label>
              <Input
                value={editForm.course_title}
                onChange={(e) => setEditForm({ ...editForm, course_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الشهادة</Label>
              <Input
                value={editForm.certificate_number}
                onChange={(e) => setEditForm({ ...editForm, certificate_number: e.target.value })}
                dir="ltr"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ManageCertificatesPage;
