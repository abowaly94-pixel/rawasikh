import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getActionTypeLabel, getActionTypeIcon } from "@/lib/activityLogger";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  student_name: string;
  class_name: string;
}

interface ExamResult {
  id: string;
  student_name: string;
  exam_title: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
}

interface AssessmentResult {
  id: string;
  student_name: string;
  assessment_title: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
}

const SchoolActivityPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && userRole !== "school") navigate("/dashboard");
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") fetchData();
  }, [user, userRole]);

  const fetchData = async () => {
    try {
      const { data: school } = await supabase
        .from("schools").select("id").eq("user_id", user?.id).single();

      if (!school) return;
      setSchoolId(school.id);

      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, user_id, class_id")
        .eq("school_id", school.id);

      if (!studentsData || studentsData.length === 0) {
        setIsLoading(false);
        return;
      }

      const studentIds = studentsData.map(s => s.id);
      const userIds = studentsData.map(s => s.user_id).filter(Boolean) as string[];

      // Fetch profiles for names
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
      const studentUserMap = new Map(studentsData.map(s => [s.id, s.user_id]));

      // 1. Recent attendance (last 30 records)
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("id, date, status, student_id, class_id")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(30);

      // Get class names
      const classIds = [...new Set((attendanceData || []).map(a => a.class_id))];
      const { data: classesData } = classIds.length > 0
        ? await supabase.from("classes").select("id, name").in("id", classIds)
        : { data: [] };
      const classMap = new Map((classesData || []).map(c => [c.id, c.name]));

      setAttendance((attendanceData || []).map(a => ({
        id: a.id,
        date: a.date,
        status: a.status,
        student_name: profileMap.get(studentUserMap.get(a.student_id) || "") || "غير محدد",
        class_name: classMap.get(a.class_id) || "-",
      })));

      // 2. Exam results
      const { data: examAttemptsData } = await supabase
        .from("exam_attempts")
        .select("id, student_id, exam_id, score, max_score, percentage, passed, completed_at")
        .in("student_id", studentIds)
        .order("completed_at", { ascending: false })
        .limit(30);

      if (examAttemptsData && examAttemptsData.length > 0) {
        const examIds = [...new Set(examAttemptsData.map(e => e.exam_id))];
        const { data: examsData } = await supabase.from("exams").select("id, title").in("id", examIds);
        const examMap = new Map((examsData || []).map(e => [e.id, e.title]));

        setExamResults(examAttemptsData.map(a => ({
          id: a.id,
          student_name: profileMap.get(studentUserMap.get(a.student_id) || "") || "غير محدد",
          exam_title: examMap.get(a.exam_id) || "-",
          score: a.score,
          max_score: a.max_score,
          percentage: a.percentage,
          passed: a.passed,
          completed_at: a.completed_at,
        })));
      }

      // 3. School assessment results
      const { data: assessmentAttemptsData } = await supabase
        .from("school_assessment_attempts")
        .select("id, student_id, assessment_id, score, max_score, percentage, passed, completed_at")
        .in("student_id", studentIds)
        .order("completed_at", { ascending: false })
        .limit(30);

      if (assessmentAttemptsData && assessmentAttemptsData.length > 0) {
        const assessmentIds = [...new Set(assessmentAttemptsData.map(a => a.assessment_id))];
        const { data: assessmentsData } = await supabase
          .from("school_level_assessments").select("id, title").in("id", assessmentIds);
        const assessmentMap = new Map((assessmentsData || []).map(a => [a.id, a.title]));

        setAssessmentResults(assessmentAttemptsData.map(a => ({
          id: a.id,
          student_name: profileMap.get(studentUserMap.get(a.student_id) || "") || "غير محدد",
          assessment_title: assessmentMap.get(a.assessment_id) || "-",
          score: a.score,
          max_score: a.max_score,
          percentage: a.percentage,
          passed: a.passed,
          completed_at: a.completed_at,
        })));
      }

      // Fetch activity logs for this school
      const { data: logsData } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsData) {
        const logUserIds = [...new Set(logsData.map(l => l.user_id))];
        const { data: logProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", logUserIds);
        const logProfileMap = new Map((logProfiles || []).map(p => [p.id, p.full_name]));
        setActivityLogs(logsData.map(l => ({ ...l, user_name: logProfileMap.get(l.user_id) || "غير محدد" })));
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      present: { label: "حاضر", variant: "default" },
      absent: { label: "غائب", variant: "destructive" },
      late: { label: "متأخر", variant: "secondary" },
      excused: { label: "بعذر", variant: "secondary" },
    };
    return map[status] || { label: status, variant: "secondary" as const };
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SchoolLayout schoolName={profile?.full_name || "مدرسة"}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">متابعة النشاطات</h1>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logs">سجل النشاطات</TabsTrigger>
            <TabsTrigger value="attendance">الحضور</TabsTrigger>
            <TabsTrigger value="exams">نتائج الاختبارات</TabsTrigger>
            <TabsTrigger value="assessments">نتائج التقييمات</TabsTrigger>
          </TabsList>

          {/* Activity Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>آخر النشاطات</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد نشاطات مسجلة</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-10"></TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>{getActionTypeIcon(log.action_type)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getActionTypeLabel(log.action_type)}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{log.user_name}</TableCell>
                          <TableCell>{log.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("ar")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور الأخير</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الطالب</TableHead>
                        <TableHead>الفصل</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => {
                        const s = statusLabel(record.status);
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.student_name}</TableCell>
                            <TableCell>{record.class_name}</TableCell>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>
                              <Badge variant={s.variant}>{s.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams">
            <Card>
              <CardHeader>
                <CardTitle>نتائج الاختبارات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                {examResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد نتائج اختبارات</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الطالب</TableHead>
                        <TableHead>الاختبار</TableHead>
                        <TableHead>الدرجة</TableHead>
                        <TableHead>النسبة</TableHead>
                        <TableHead>النتيجة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.student_name}</TableCell>
                          <TableCell>{result.exam_title}</TableCell>
                          <TableCell>{result.score ?? "-"} / {result.max_score ?? "-"}</TableCell>
                          <TableCell>{result.percentage != null ? `${Math.round(result.percentage)}%` : "-"}</TableCell>
                          <TableCell>
                            {result.passed != null && (
                              <Badge variant={result.passed ? "default" : "destructive"}>
                                {result.passed ? "ناجح" : "راسب"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>نتائج التقييمات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                {assessmentResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد نتائج تقييمات</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الطالب</TableHead>
                        <TableHead>التقييم</TableHead>
                        <TableHead>الدرجة</TableHead>
                        <TableHead>النسبة</TableHead>
                        <TableHead>النتيجة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessmentResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.student_name}</TableCell>
                          <TableCell>{result.assessment_title}</TableCell>
                          <TableCell>{result.score ?? "-"} / {result.max_score ?? "-"}</TableCell>
                          <TableCell>{result.percentage != null ? `${Math.round(Number(result.percentage))}%` : "-"}</TableCell>
                          <TableCell>
                            {result.passed != null && (
                              <Badge variant={result.passed ? "default" : "destructive"}>
                                {result.passed ? "ناجح" : "راسب"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SchoolLayout>
  );
};

export default SchoolActivityPage;
