import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, Users, Award, Trophy, FileDown, BarChart3, GraduationCap } from "lucide-react";
import * as XLSX from "xlsx";

interface ExamResult {
  id: string;
  studentName: string;
  studentNumber: string | null;
  examTitle: string;
  examType: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
  source: "exam" | "assessment";
}

interface StudentSummary {
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  totalExams: number;
  passedExams: number;
  averagePercentage: number;
}

const SchoolStudentResultsPage = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState<ExamResult[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttempts: 0,
    passRate: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && userRole !== "school") navigate("/dashboard");
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") fetchAllResults();
  }, [user, userRole]);

  const fetchAllResults = async () => {
    try {
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!school) return;

      // Fetch school students
      const { data: students } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .eq("school_id", school.id);
      if (!students || students.length === 0) {
        setIsLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);
      const userIds = students.filter(s => s.user_id).map(s => s.user_id!);

      // Fetch profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      // 1. Fetch exam attempts (lesson exams)
      const { data: examAttempts } = await supabase
        .from("exam_attempts")
        .select("id, score, max_score, percentage, passed, completed_at, exam_id, student_id")
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      // Get exam details
      const examIds = [...new Set((examAttempts || []).map(a => a.exam_id))];
      let examMap = new Map<string, { title: string; exam_type: string }>();
      if (examIds.length > 0) {
        const { data: exams } = await supabase
          .from("exams")
          .select("id, title, exam_type")
          .in("id", examIds);
        examMap = new Map((exams || []).map(e => [e.id, { title: e.title, exam_type: e.exam_type }]));
      }

      // 2. Fetch school assessment attempts
      const { data: assessmentAttempts } = await supabase
        .from("school_assessment_attempts")
        .select("id, score, max_score, percentage, passed, completed_at, assessment_id, student_id")
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      const assessmentIds = [...new Set((assessmentAttempts || []).map(a => a.assessment_id))];
      let assessmentMap = new Map<string, string>();
      if (assessmentIds.length > 0) {
        const { data: assessments } = await supabase
          .from("school_level_assessments")
          .select("id, title")
          .in("id", assessmentIds);
        assessmentMap = new Map((assessments || []).map(a => [a.id, a.title]));
      }

      // Build student lookup
      const studentMap = new Map(students.map(s => [s.id, s]));

      // Combine results
      const allResults: ExamResult[] = [];

      (examAttempts || []).forEach(a => {
        const student = studentMap.get(a.student_id);
        const exam = examMap.get(a.exam_id);
        allResults.push({
          id: a.id,
          studentName: student?.user_id ? profileMap.get(student.user_id) || "غير محدد" : "غير محدد",
          studentNumber: student?.student_number || null,
          examTitle: exam?.title || "اختبار محذوف",
          examType: exam?.exam_type || "quiz",
          score: a.score || 0,
          maxScore: a.max_score || 0,
          percentage: a.percentage || 0,
          passed: a.passed || false,
          completedAt: a.completed_at || "",
          source: "exam",
        });
      });

      (assessmentAttempts || []).forEach(a => {
        const student = studentMap.get(a.student_id);
        allResults.push({
          id: a.id,
          studentName: student?.user_id ? profileMap.get(student.user_id) || "غير محدد" : "غير محدد",
          studentNumber: student?.student_number || null,
          examTitle: assessmentMap.get(a.assessment_id) || "تقييم محذوف",
          examType: "assessment",
          score: a.score || 0,
          maxScore: a.max_score || 0,
          percentage: a.percentage || 0,
          passed: a.passed || false,
          completedAt: a.completed_at || "",
          source: "assessment",
        });
      });

      // Sort by date
      allResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setResults(allResults);

      // Build student summaries
      const summaryMap = new Map<string, StudentSummary>();
      allResults.forEach(r => {
        const key = r.studentName + "_" + (r.studentNumber || "");
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            studentId: key,
            studentName: r.studentName,
            studentNumber: r.studentNumber,
            totalExams: 0,
            passedExams: 0,
            averagePercentage: 0,
          });
        }
        const s = summaryMap.get(key)!;
        s.totalExams++;
        if (r.passed) s.passedExams++;
        s.averagePercentage += r.percentage;
      });
      const summaries = Array.from(summaryMap.values()).map(s => ({
        ...s,
        averagePercentage: s.totalExams > 0 ? s.averagePercentage / s.totalExams : 0,
      }));
      summaries.sort((a, b) => b.averagePercentage - a.averagePercentage);
      setStudentSummaries(summaries);

      // Stats
      const totalAttempts = allResults.length;
      const passedCount = allResults.filter(r => r.passed).length;
      const avgScore = totalAttempts > 0 ? allResults.reduce((s, r) => s + r.percentage, 0) / totalAttempts : 0;
      setStats({
        totalStudents: students.length,
        totalAttempts,
        passRate: totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0,
        averageScore: avgScore,
      });
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getExamTypeName = (type: string) => {
    const types: Record<string, string> = {
      quiz: "اختبار قصير",
      midterm: "اختبار نصفي",
      final: "اختبار نهائي",
      assignment: "واجب",
      project: "مشروع",
      evaluation: "تقييم",
      assessment: "تقييم مدرسي",
    };
    return types[type] || type;
  };

  const filteredResults = results.filter(r => {
    const matchesSearch = r.studentName.includes(searchTerm) || r.examTitle.includes(searchTerm) || (r.studentNumber || "").includes(searchTerm);
    const matchesType = filterType === "all" || (filterType === "exam" && r.source === "exam") || (filterType === "assessment" && r.source === "assessment");
    return matchesSearch && matchesType;
  });

  const filteredSummaries = studentSummaries.filter(s =>
    s.studentName.includes(searchTerm) || (s.studentNumber || "").includes(searchTerm)
  );

  const exportToExcel = () => {
    const data = filteredResults.map(r => ({
      "اسم الطالب": r.studentName,
      "رقم الطالب": r.studentNumber || "-",
      "الاختبار": r.examTitle,
      "النوع": getExamTypeName(r.examType),
      "الدرجة": r.score,
      "الدرجة العظمى": r.maxScore,
      "النسبة": `${r.percentage.toFixed(1)}%`,
      "الحالة": r.passed ? "ناجح" : "راسب",
      "التاريخ": r.completedAt ? new Date(r.completedAt).toLocaleDateString("ar") : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نتائج الطلاب");
    XLSX.writeFile(wb, "student-results.xlsx");
  };

  if (loading || isLoading) {
    return (
      <SchoolLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">متابعة نتائج الطلاب</h1>
            <p className="text-muted-foreground">تقارير شاملة لأداء الطلاب في جميع الاختبارات والتقييمات</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportToExcel}>
            <FileDown className="h-4 w-4" />
            تصدير Excel
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAttempts}</p>
                <p className="text-sm text-muted-foreground">إجمالي المحاولات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">نسبة النجاح</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الطالب أو الاختبار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="exam">اختبارات الحصص</SelectItem>
              <SelectItem value="assessment">التقييمات المدرسية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              تفاصيل النتائج
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <Trophy className="h-4 w-4" />
              ملخص الطلاب
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardContent className="p-0">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد نتائج بعد</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">الاختبار</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الدرجة</TableHead>
                        <TableHead className="text-right">النسبة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.slice(0, 100).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.studentName}</p>
                              {r.studentNumber && (
                                <p className="text-xs text-muted-foreground">{r.studentNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{r.examTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getExamTypeName(r.examType)}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{r.score}/{r.maxScore}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={r.percentage} className="w-16 h-2" />
                              <span className="text-sm">{r.percentage.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.passed ? "default" : "destructive"}>
                              {r.passed ? "ناجح" : "راسب"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.completedAt ? new Date(r.completedAt).toLocaleDateString("ar") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardContent className="p-0">
                {filteredSummaries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد بيانات</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">عدد الاختبارات</TableHead>
                        <TableHead className="text-right">ناجح</TableHead>
                        <TableHead className="text-right">نسبة النجاح</TableHead>
                        <TableHead className="text-right">متوسط الدرجات</TableHead>
                        <TableHead className="text-right">المستوى</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSummaries.map((s, idx) => {
                        const passRate = s.totalExams > 0 ? (s.passedExams / s.totalExams) * 100 : 0;
                        const level = s.averagePercentage >= 90 ? "ممتاز" : s.averagePercentage >= 75 ? "جيد جداً" : s.averagePercentage >= 60 ? "جيد" : s.averagePercentage >= 50 ? "مقبول" : "ضعيف";
                        const levelVariant = s.averagePercentage >= 75 ? "default" : s.averagePercentage >= 50 ? "secondary" : "destructive";
                        return (
                          <TableRow key={s.studentId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{s.studentName}</p>
                                {s.studentNumber && (
                                  <p className="text-xs text-muted-foreground">{s.studentNumber}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{s.totalExams}</TableCell>
                            <TableCell>{s.passedExams}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={passRate} className="w-16 h-2" />
                                <span className="text-sm">{passRate.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={s.averagePercentage} className="w-16 h-2" />
                                <span className="text-sm">{s.averagePercentage.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={levelVariant as any}>{level}</Badge>
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
        </Tabs>
      </div>
    </SchoolLayout>
  );
};

export default SchoolStudentResultsPage;
