import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Download, Search, BarChart3, CheckCircle2, XCircle } from "lucide-react";

interface CourseOpt {
  id: string;
  title: string;
  instructor_id: string | null;
}

interface AttemptRow {
  id: string;
  user_id: string;
  quiz_id: string;
  course_id: string | null;
  completed_at: string | null;
  score: number | null;
  total_points: number | null;
  passed: boolean | null;
  course_quizzes: { title: string } | null;
  courses: { title: string } | null;
}

interface StudentInfo {
  id: string;
  full_name: string;
  email: string | null;
}

const NONE = "__all__";
const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const QuizResultsPage = () => {
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [courseId, setCourseId] = useState(NONE);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    const allowed = userRole === "admin" || userRole === "teacher" || hasPermission("quiz_results");
    if (!user || !allowed) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, hasPermission, navigate]);

  // Same "own courses only" scoping used everywhere else in the dashboard
  // for teacher accounts (courses/quizzes/tasks pages) — a teacher should
  // only ever see grades for their own courses.
  const { data: courses = [] } = useQuery({
    queryKey: ["quiz_results_courses", userRole, user?.id],
    queryFn: async () => {
      let query = supabase.from("courses").select("id, title, instructor_id").order("title");
      if (userRole === "teacher") query = query.eq("instructor_id", user?.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data as CourseOpt[]) || [];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher" || hasPermission("quiz_results")),
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["quiz_results_attempts", userRole, user?.id],
    queryFn: async () => {
      // RLS already scopes this correctly per role: admins and staff with
      // the "quiz_results" permission see every attempt, teachers only see
      // attempts belonging to quizzes they created — no extra client-side
      // filtering needed here beyond what the database already enforces.
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, user_id, quiz_id, course_id, completed_at, score, total_points, passed, course_quizzes(title), courses(title)")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as AttemptRow[];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher" || hasPermission("quiz_results")),
  });

  // quiz_attempts.user_id references auth.users, not profiles, so
  // PostgREST can't embed the student's name/email automatically — fetch
  // profiles separately for the distinct students who show up, same
  // pattern used in TasksManagementPage for submissions.
  const { data: students = [] } = useQuery({
    queryKey: ["quiz_results_students", attempts.map((a) => a.user_id).join(",")],
    queryFn: async () => {
      const ids = [...new Set(attempts.map((a) => a.user_id))];
      if (ids.length === 0) return [] as StudentInfo[];
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      if (error) throw error;
      return (data as StudentInfo[]) || [];
    },
    enabled: attempts.length > 0,
  });
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const rows = useMemo(() => {
    let list = attempts;
    if (courseId !== NONE) list = list.filter((a) => a.course_id === courseId);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const student = studentById.get(a.user_id);
        return (
          (student?.full_name || "").toLowerCase().includes(q) ||
          (student?.email || "").toLowerCase().includes(q) ||
          (a.course_quizzes?.title || "").toLowerCase().includes(q) ||
          (a.courses?.title || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [attempts, courseId, search, studentById]);

  const passedCount = rows.filter((r) => r.passed).length;
  const failedCount = rows.filter((r) => r.passed === false).length;
  const avgPercent = useMemo(() => {
    const withScores = rows.filter((r) => r.total_points && r.total_points > 0);
    if (withScores.length === 0) return 0;
    const sum = withScores.reduce((acc, r) => acc + ((r.score || 0) / (r.total_points || 1)) * 100, 0);
    return Math.round(sum / withScores.length);
  }, [rows]);

  const exportCsv = () => {
    const headers = ["اسم الطالب", "البريد الإلكتروني", "الدورة التدريبية", "الاختبار", "الدرجة", "من", "النسبة", "الحالة", "تاريخ الاختبار"];
    const csvRows = rows.map((r) => {
      const student = studentById.get(r.user_id);
      const percent = r.total_points ? Math.round(((r.score || 0) / r.total_points) * 100) : 0;
      return [
        student?.full_name || "",
        student?.email || "",
        r.courses?.title || "",
        r.course_quizzes?.title || "",
        String(r.score ?? ""),
        String(r.total_points ?? ""),
        r.total_points ? `${percent}%` : "",
        r.passed === true ? "ناجح" : r.passed === false ? "راسب" : "—",
        r.completed_at ? new Date(r.completed_at).toLocaleString("en-GB") : "",
      ]
        .map((c) => csvEscape(String(c)))
        .join(",");
    });
    const csv = "﻿" + [headers.map((h) => csvEscape(h)).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "درجات-الاختبارات.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            درجات الاختبارات
          </h1>
          <p className="text-muted-foreground mt-1">
            كل محاولات الطلاب في اختبارات الموقع، مع الدرجة والنتيجة وتاريخ الاختبار — في مكان واحد.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">إجمالي المحاولات</p>
              <p className="text-xl font-bold">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">ناجح</p>
              <p className="text-xl font-bold text-green-600">{passedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">راسب</p>
              <p className="text-xl font-bold text-destructive">{failedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">متوسط النسبة</p>
              <p className="text-xl font-bold">{avgPercent}%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الدورة التدريبية</label>
                <SearchableSelect
                  value={courseId}
                  onValueChange={setCourseId}
                  options={[
                    { value: NONE, label: "كل الدورات التدريبية" },
                    ...courses.map((c) => ({ value: c.id, label: c.title })),
                  ]}
                  placeholder="كل الدورات التدريبية"
                  searchPlaceholder="ابحثي باسم الدورة التدريبية..."
                  emptyText="لا توجد دورات تدريبية مطابقة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">بحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="اسم الطالب، الإيميل، أو اسم الاختبار..."
                    className="pr-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">نتائج الاختبارات</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0} className="gap-1.5">
              <Download className="h-4 w-4" />
              تصدير Excel/CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
            ) : rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد محاولات اختبار مطابقة.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الطالب</TableHead>
                      <TableHead>الدورة التدريبية</TableHead>
                      <TableHead>الاختبار</TableHead>
                      <TableHead className="text-center">الدرجة</TableHead>
                      <TableHead className="text-center">النسبة</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead>تاريخ الاختبار</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const student = studentById.get(r.user_id);
                      const percent = r.total_points ? Math.round(((r.score || 0) / r.total_points) * 100) : null;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div>{student?.full_name || "—"}</div>
                            {student?.email && (
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{r.courses?.title || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{r.course_quizzes?.title || "—"}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {r.score ?? "—"} / {r.total_points ?? "—"}
                          </TableCell>
                          <TableCell className="text-center">{percent !== null ? `${percent}%` : "—"}</TableCell>
                          <TableCell className="text-center">
                            {r.passed === true ? (
                              <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                ناجح
                              </Badge>
                            ) : r.passed === false ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                راسب
                              </Badge>
                            ) : (
                              <Badge variant="outline">—</Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {r.completed_at ? new Date(r.completed_at).toLocaleString("ar-EG") : "—"}
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
      </div>
    </DashboardLayout>
  );
};

export default QuizResultsPage;
