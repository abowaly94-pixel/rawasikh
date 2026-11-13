import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WhatsAppContactButton from "@/components/WhatsAppContactButton";
import { CalendarCheck, Download, CheckCircle2, XCircle, Loader2, AlertTriangle, ListChecks } from "lucide-react";

interface CourseOpt { id: string; title: string; instructor_id: string | null }
interface ZoomLinkOpt { id: string; title: string; scheduled_at: string | null; lesson_id: string | null }
interface StudentRow {
  user_id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  country_code: string | null;
}
interface AttendanceRow { student_id: string; status: string; joined_at: string; zoom_link_id: string }

const NONE = "__none__";
const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const DEFAULT_ALERT_MESSAGE =
  "مرحباً {name}، لاحظنا غياب متكرر عن محاضرات الدورة التدريبية ({absent} من {total}). يرجى التواصل معنا واستدراك المحاضرات الفائتة حتى لا يتأثر مستواك.";

const fillAlertTemplate = (template: string, vars: { name: string; absent: number; total: number }) =>
  template
    .replace(/\{name\}/g, vars.name || "")
    .replace(/\{absent\}/g, String(vars.absent))
    .replace(/\{total\}/g, String(vars.total));

const LectureAttendancePage = () => {
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [courseId, setCourseId] = useState(NONE);
  const [zoomLinkId, setZoomLinkId] = useState(NONE);
  const [viewMode, setViewMode] = useState<"single" | "overview">("single");
  const [absenceThreshold, setAbsenceThreshold] = useState(25);

  const { data: alertMessageSetting } = useQuery({
    queryKey: ["site_setting", "attendance_alert_message"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "attendance_alert_message")
        .maybeSingle();
      return (data?.setting_value as string) || DEFAULT_ALERT_MESSAGE;
    },
  });
  const [alertMessage, setAlertMessage] = useState<string>(DEFAULT_ALERT_MESSAGE);
  useEffect(() => {
    if (alertMessageSetting) setAlertMessage(alertMessageSetting);
  }, [alertMessageSetting]);

  const saveAlertMessage = async () => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ setting_key: "attendance_alert_message", setting_value: alertMessage }, { onConflict: "setting_key" });
    if (error) {
      toast({ title: "تعذّر حفظ نص الرسالة", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site_setting", "attendance_alert_message"] });
    toast({ title: "تم حفظ نص رسالة التنبيه" });
  };

  useEffect(() => {
    if (loading) return;
    const allowed = userRole === "teacher" || hasPermission("lecture_attendance");
    if (!user || !allowed) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, hasPermission, navigate]);

  const { data: courses = [] } = useQuery({
    queryKey: ["lecture_attendance_courses", userRole, user?.id],
    queryFn: async () => {
      let query = supabase.from("courses").select("id, title, instructor_id").order("title");
      if (userRole === "teacher") query = query.eq("instructor_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as CourseOpt[];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher"),
  });

  const { data: zoomLinks = [] } = useQuery({
    queryKey: ["lecture_attendance_zoom_links", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zoom_links" as any)
        .select("id, title, scheduled_at, lesson_id")
        .eq("course_id", courseId)
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as any[]) as ZoomLinkOpt[];
    },
    enabled: courseId !== NONE,
  });

  const { data: enrolledStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["lecture_attendance_enrolled", courseId],
    queryFn: async () => {
      const [{ data: fullPurchases }, { data: levelPurchases }] = await Promise.all([
        supabase.from("course_purchases").select("user_id").eq("course_id", courseId).eq("payment_status", "completed"),
        supabase.from("course_level_purchases").select("user_id").eq("course_id", courseId).eq("payment_status", "completed"),
      ]);
      const userIds = [...new Set([...(fullPurchases || []), ...(levelPurchases || [])].map((p: any) => p.user_id))];
      if (userIds.length === 0) return [];

      // Attendance is for students only — a teacher/admin can have a
      // completed purchase row for their own course (wallet grant, testing,
      // etc.) and must not be counted as an "enrolled student" here. Uses a
      // SECURITY DEFINER RPC because teachers/staff can't SELECT arbitrary
      // rows from user_roles directly under RLS.
      const { data: studentIdRows, error: rolesError } = await supabase.rpc(
        "filter_student_ids" as any,
        { _user_ids: userIds }
      );
      if (rolesError) throw rolesError;
      const studentIds = new Set(((studentIdRows as any[]) || []));
      const filteredIds = userIds.filter((id) => studentIds.has(id));
      if (filteredIds.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp, phone, country_code")
        .in("id", filteredIds);
      if (error) throw error;
      return (profiles || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        whatsapp: p.whatsapp || p.phone || null,
        country_code: p.country_code || null,
      })) as StudentRow[];
    },
    enabled: courseId !== NONE,
  });

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ["lecture_attendance_rows", zoomLinkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lecture_attendance" as any)
        .select("student_id, status, joined_at, zoom_link_id")
        .eq("zoom_link_id", zoomLinkId);
      if (error) throw error;
      return (data as any[]) as AttendanceRow[];
    },
    enabled: zoomLinkId !== NONE && viewMode === "single",
  });

  // Course-wide attendance, for the "track every lecture" overview.
  const { data: courseAttendanceRows = [] } = useQuery({
    queryKey: ["lecture_attendance_course_rows", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lecture_attendance" as any)
        .select("student_id, status, joined_at, zoom_link_id")
        .eq("course_id", courseId);
      if (error) throw error;
      return (data as any[]) as AttendanceRow[];
    },
    enabled: courseId !== NONE && viewMode === "overview",
  });

  // Lectures in chronological order (oldest first) — needed to detect
  // consecutive absences correctly.
  const chronologicalLectures = useMemo(
    () =>
      [...zoomLinks].sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return ta - tb;
      }),
    [zoomLinks]
  );

  const overviewRows = useMemo(() => {
    if (viewMode !== "overview" || chronologicalLectures.length === 0) return [];
    const byStudentByLecture = new Map<string, Set<string>>();
    for (const a of courseAttendanceRows) {
      if (!byStudentByLecture.has(a.student_id)) byStudentByLecture.set(a.student_id, new Set());
      byStudentByLecture.get(a.student_id)!.add(a.zoom_link_id);
    }

    return enrolledStudents
      .map((s) => {
        const presentSet = byStudentByLecture.get(s.user_id) || new Set<string>();
        const attendance = chronologicalLectures.map((l) => presentSet.has(l.id));
        const absencesCount = attendance.filter((present) => !present).length;
        const totalLectures = chronologicalLectures.length;
        const absenceRate = totalLectures > 0 ? Math.round((absencesCount / totalLectures) * 100) : 0;

        let maxConsecutiveAbsences = 0;
        let running = 0;
        for (const present of attendance) {
          running = present ? 0 : running + 1;
          maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, running);
        }

        const flagged = absenceRate > absenceThreshold || maxConsecutiveAbsences >= 2;

        return { ...s, attendance, absencesCount, totalLectures, absenceRate, maxConsecutiveAbsences, flagged };
      })
      .sort((a, b) => {
        if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
        return (a.full_name || "").localeCompare(b.full_name || "", "ar");
      });
  }, [viewMode, chronologicalLectures, courseAttendanceRows, enrolledStudents, absenceThreshold]);

  const flaggedCount = overviewRows.filter((r) => r.flagged).length;

  const setAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, present }: { studentId: string; present: boolean }) => {
      if (present) {
        // Manually mark present — e.g. the student had trouble joining
        // Zoom and was sent the link directly, so no automatic
        // "started the session" row exists for them.
        const selectedLecture = zoomLinks.find((z) => z.id === zoomLinkId);
        const { error } = await supabase.from("lecture_attendance" as any).upsert(
          {
            zoom_link_id: zoomLinkId,
            student_id: studentId,
            course_id: courseId,
            lesson_id: selectedLecture?.lesson_id || null,
            status: "present",
            joined_at: new Date().toISOString(),
          },
          { onConflict: "zoom_link_id,student_id" }
        );
        if (error) throw error;
      } else {
        // Revert to absent (no row = absent, matching how automatic
        // attendance already works on this page).
        const { error } = await supabase
          .from("lecture_attendance" as any)
          .delete()
          .eq("zoom_link_id", zoomLinkId)
          .eq("student_id", studentId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lecture_attendance_rows", zoomLinkId] });
      toast({
        title: variables.present ? "تم تسجيل الطالب حاضر" : "تم تسجيل الطالب غايب",
      });
    },
    onError: (error: any) => {
      toast({
        title: "حصل خطأ",
        description: error?.message || "تعذر تحديث حالة الحضور",
        variant: "destructive",
      });
    },
  });

  // Same idea as setAttendanceMutation, but for the "track every lecture"
  // overview table where each row x column cell is its own lecture, not a
  // single selected one.
  const setOverviewAttendanceMutation = useMutation({
    mutationFn: async ({
      studentId,
      lectureId,
      present,
    }: {
      studentId: string;
      lectureId: string;
      present: boolean;
    }) => {
      const lecture = chronologicalLectures.find((l) => l.id === lectureId);
      if (present) {
        const { error } = await supabase.from("lecture_attendance" as any).upsert(
          {
            zoom_link_id: lectureId,
            student_id: studentId,
            course_id: courseId,
            lesson_id: lecture?.lesson_id || null,
            status: "present",
            joined_at: new Date().toISOString(),
          },
          { onConflict: "zoom_link_id,student_id" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lecture_attendance" as any)
          .delete()
          .eq("zoom_link_id", lectureId)
          .eq("student_id", studentId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lecture_attendance_course_rows", courseId] });
      toast({
        title: variables.present ? "تم تسجيل الطالب حاضر" : "تم تسجيل الطالب غايب",
      });
    },
    onError: (error: any) => {
      toast({
        title: "حصل خطأ",
        description: error?.message || "تعذر تحديث حالة الحضور",
        variant: "destructive",
      });
    },
  });

  const rows = useMemo(() => {
    const byStudent = new Map(attendanceRows.map((a) => [a.student_id, a]));
    return enrolledStudents
      .map((s) => {
        const a = byStudent.get(s.user_id);
        return { ...s, present: !!a, joined_at: a?.joined_at || null };
      })
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "ar"));
  }, [enrolledStudents, attendanceRows]);

  const presentCount = rows.filter((r) => r.present).length;
  const absentCount = rows.length - presentCount;
  const selectedLecture = zoomLinks.find((z) => z.id === zoomLinkId);

  const exportOverviewCsv = () => {
    const selectedCourseTitle = courses.find((c) => c.id === courseId)?.title || "دورة تدريبية";
    const headers = [
      "اسم الطالب",
      "البريد الإلكتروني",
      ...chronologicalLectures.map((l) => l.title),
      "إجمالي الغياب",
      "عدد المحاضرات",
      "نسبة الغياب",
      "الحالة",
    ];
    const csvRows = overviewRows.map((r) =>
      [
        r.full_name || "",
        r.email || "",
        ...r.attendance.map((present) => (present ? "حاضر" : "غايب")),
        String(r.absencesCount),
        String(r.totalLectures),
        `${r.absenceRate}%`,
        r.flagged ? (r.maxConsecutiveAbsences >= 2 ? "غياب متتالي" : "تجاوز النسبة") : "منتظم",
      ]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
    const csv = "\ufeff" + [headers.map((h) => csvEscape(h)).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `الحضور-${selectedCourseTitle}-كل-المحاضرات.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const headers = ["اسم الطالب", "البريد الإلكتروني", "الحالة", "وقت الدخول"];
    const csvRows = rows.map((r) =>
      [
        r.full_name || "",
        r.email || "",
        r.present ? "حاضر" : "غايب",
        r.joined_at ? new Date(r.joined_at).toLocaleString("en-GB") : "",
      ]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
    const csv = "﻿" + [headers.map((h) => csvEscape(h)).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `الحضور-${selectedLecture?.title || "محاضرة"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            الحضور والغياب
          </h1>
          <p className="text-muted-foreground mt-1">
            بيتسجل حضور الطالب تلقائيًا لما يضغط "تشغيل الجلسة" في المحاضرة من خلال المنصة، وأي مشترك في الدورة التدريبية ما دخلش يظهر غايب.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الدورة التدريبية</label>
                <SearchableSelect
                  value={courseId}
                  onValueChange={(v) => { setCourseId(v); setZoomLinkId(NONE); }}
                  options={[
                    { value: NONE, label: "اختر الدورة التدريبية" },
                    ...courses.map((c) => ({ value: c.id, label: c.title })),
                  ]}
                  placeholder="اختر الدورة التدريبية"
                  searchPlaceholder="ابحثي باسم الدورة التدريبية..."
                  emptyText="لا توجد دورات تدريبية مطابقة"
                />
              </div>
              {viewMode === "single" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">المحاضرة (جلسة Zoom)</label>
                  <Select value={zoomLinkId} onValueChange={setZoomLinkId} disabled={courseId === NONE}>
                    <SelectTrigger><SelectValue placeholder="اختر المحاضرة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>اختر المحاضرة</SelectItem>
                      {zoomLinks.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.title}{z.scheduled_at ? ` — ${new Date(z.scheduled_at).toLocaleDateString("en-GB")}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {viewMode === "overview" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">نسبة الغياب المسموحة %</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={absenceThreshold}
                    onChange={(e) => setAbsenceThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 0)))}
                    disabled={courseId === NONE}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "single" ? "default" : "outline"}
                onClick={() => setViewMode("single")}
                className="gap-1.5"
              >
                <CalendarCheck className="h-4 w-4" />
                محاضرة واحدة
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "overview" ? "default" : "outline"}
                onClick={() => setViewMode("overview")}
                disabled={courseId === NONE}
                className="gap-1.5"
              >
                <ListChecks className="h-4 w-4" />
                تتبع كل المحاضرات
              </Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === "single" && zoomLinkId !== NONE && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المشتركين</p>
                    <p className="text-xl font-bold">{rows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">حاضر</p>
                    <p className="text-xl font-bold text-green-600">{presentCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">غايب</p>
                    <p className="text-xl font-bold text-destructive">{absentCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">قائمة الحضور — {selectedLecture?.title}</CardTitle>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  تصدير Excel/CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {studentsLoading ? (
                  <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                ) : rows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مشتركين في هذه الدورة التدريبية بعد.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الطالب</TableHead>
                          <TableHead className="text-right">البريد الإلكتروني</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">وقت الدخول</TableHead>
                          <TableHead className="text-right">تعديل يدوي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.user_id}>
                            <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground" dir="ltr">{r.email || "—"}</TableCell>
                            <TableCell>
                              {r.present ? (
                                <Badge className="gap-1 bg-green-500/10 text-green-700 hover:bg-green-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> حاضر
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" /> غايب
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" dir="ltr">
                              {r.joined_at ? new Date(r.joined_at).toLocaleString("en-GB") : "—"}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const isPending =
                                  setAttendanceMutation.isPending &&
                                  setAttendanceMutation.variables?.studentId === r.user_id;
                                return (
                                  <Button
                                    size="sm"
                                    variant={r.present ? "outline" : "secondary"}
                                    disabled={isPending}
                                    onClick={() =>
                                      setAttendanceMutation.mutate({ studentId: r.user_id, present: !r.present })
                                    }
                                    className="gap-1.5"
                                  >
                                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {r.present ? "تسجيل غايب" : "تسجيل حاضر"}
                                  </Button>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {viewMode === "overview" && courseId !== NONE && userRole === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نص رسالة تنبيه الغياب (واتساب)</CardTitle>
              <p className="text-sm text-muted-foreground">
                الرسالة اللي بتتبعت للطالب لما يكون متعلّم بالأحمر (غياب متتالي أو تجاوز نسبة الغياب). ممكن تستخدمي
                {" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">{"{name}"}</code>{" "}
                لاسم الطالب،{" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">{"{absent}"}</code>{" "}
                لعدد المحاضرات اللي غابها، و{" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">{"{total}"}</code>{" "}
                لإجمالي عدد المحاضرات.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                rows={3}
              />
              <Button type="button" size="sm" onClick={saveAlertMessage} disabled={!alertMessage.trim()}>
                حفظ نص الرسالة
              </Button>
            </CardContent>
          </Card>
        )}

        {viewMode === "overview" && courseId !== NONE && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">عدد المحاضرات</p>
                    <p className="text-xl font-bold">{chronologicalLectures.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الطلبة</p>
                    <p className="text-xl font-bold">{overviewRows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">محتاجين متابعة</p>
                    <p className="text-xl font-bold text-destructive">{flaggedCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">تتبع حضور الطلبة — كل محاضرات الدورة التدريبية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    الطلبة اللي تجاوزوا نسبة الغياب المسموحة أو غابوا محاضرتين ورا بعض متعلّمين باللون الأحمر أعلى القائمة،
                    وجنبهم زرار تنبيه واتساب جاهز برسالة تلقائية. اضغط على أي أيقونة تحت أي محاضرة عشان تغيّر حالة الطالب فيها (حاضر / غايب).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportOverviewCsv}
                  disabled={overviewRows.length === 0}
                  className="gap-1.5 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  تصدير Excel/CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {studentsLoading ? (
                  <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                ) : chronologicalLectures.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد محاضرات (جلسات Zoom) مسجلة لهذه الدورة التدريبية بعد.</p>
                ) : overviewRows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مشتركين في هذه الدورة التدريبية بعد.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right sticky right-0 bg-background">الطالب</TableHead>
                          {chronologicalLectures.map((l) => (
                            <TableHead key={l.id} className="text-center whitespace-nowrap">
                              {l.title}
                              {l.scheduled_at && (
                                <div className="text-xs font-normal text-muted-foreground">
                                  {new Date(l.scheduled_at).toLocaleDateString("en-GB")}
                                </div>
                              )}
                            </TableHead>
                          ))}
                          <TableHead className="text-center whitespace-nowrap">إجمالي الغياب</TableHead>
                          <TableHead className="text-center whitespace-nowrap">نسبة الغياب</TableHead>
                          <TableHead className="text-center whitespace-nowrap">الحالة</TableHead>
                          <TableHead className="text-center whitespace-nowrap">تنبيه</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewRows.map((r) => (
                          <TableRow key={r.user_id} className={r.flagged ? "bg-destructive/5" : ""}>
                            <TableCell className="font-medium whitespace-nowrap sticky right-0 bg-background">
                              {r.full_name || "—"}
                            </TableCell>
                            {r.attendance.map((present, i) => {
                              const lecture = chronologicalLectures[i];
                              const isCellPending =
                                setOverviewAttendanceMutation.isPending &&
                                setOverviewAttendanceMutation.variables?.studentId === r.user_id &&
                                setOverviewAttendanceMutation.variables?.lectureId === lecture.id;
                              return (
                                <TableCell key={lecture.id} className="text-center">
                                  <button
                                    type="button"
                                    disabled={isCellPending}
                                    onClick={() =>
                                      setOverviewAttendanceMutation.mutate({
                                        studentId: r.user_id,
                                        lectureId: lecture.id,
                                        present: !present,
                                      })
                                    }
                                    title={present ? "تسجيل غايب" : "تسجيل حاضر"}
                                    className="inline-flex items-center justify-center rounded p-1 hover:bg-muted transition-colors disabled:opacity-50"
                                  >
                                    {isCellPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : present ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                  </button>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">{r.absencesCount} / {r.totalLectures}</TableCell>
                            <TableCell className="text-center">{r.absenceRate}%</TableCell>
                            <TableCell className="text-center">
                              {r.flagged ? (
                                <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                                  <AlertTriangle className="h-3 w-3" />
                                  {r.maxConsecutiveAbsences >= 2 ? "غياب متتالي" : "تجاوز النسبة"}
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">منتظم</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <WhatsAppContactButton
                                phone={r.whatsapp}
                                countryDial={r.country_code}
                                message={
                                  r.flagged
                                    ? fillAlertTemplate(alertMessage || DEFAULT_ALERT_MESSAGE, {
                                        name: r.full_name || "",
                                        absent: r.absencesCount,
                                        total: r.totalLectures,
                                      })
                                    : undefined
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LectureAttendancePage;
