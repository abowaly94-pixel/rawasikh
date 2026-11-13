import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Award, TrendingUp, FileText, BookOpen, CheckCircle, XCircle } from "lucide-react";

interface Child {
  id: string;
  student_number: string;
  user_id: string;
  class_id: string;
  status: string;
  profile?: {
    full_name: string;
  };
  class?: {
    name: string;
  };
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total_points: number;
  passed: boolean;
  completed_at: string;
  quiz?: {
    title: string;
  };
}

interface Grade {
  id: string;
  score: number;
  exam?: {
    title: string;
    exam_type: string;
    max_score: number;
  };
}

interface PerformanceNote {
  id: string;
  note: string;
  recommendation: string;
  created_at: string;
}

const examTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  midterm: "منتصف الفصل",
  final: "نهائي",
  assignment: "واجب",
  project: "مشروع",
  evaluation: "تقييم مستوى",
};

const ChildrenPerformancePage = () => {
  const { userRole, profile, user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [notes, setNotes] = useState<PerformanceNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          student_number,
          user_id,
          class_id,
          status,
          profiles!fk_students_user_id (full_name),
          classes!fk_students_class_id (name)
        `)
        .eq("parent_id", user?.id);

      if (error) throw error;

      const formattedChildren = (data || []).map((s: any) => ({
        id: s.id,
        student_number: s.student_number,
        user_id: s.user_id,
        class_id: s.class_id,
        status: s.status,
        profile: s.profiles,
        class: s.classes,
      }));

      setChildren(formattedChildren);
      
      if (formattedChildren.length > 0) {
        setSelectedChild(formattedChildren[0]);
        fetchChildDetails(formattedChildren[0]);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
      toast.error("حدث خطأ في تحميل بيانات الأبناء");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildDetails = async (child: Child) => {
    try {
      // Fetch quiz attempts
      if (child.user_id) {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            quiz_id,
            score,
            total_points,
            passed,
            completed_at,
            course_quizzes:quiz_id (title)
          `)
          .eq("user_id", child.user_id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false });

        setQuizAttempts(
          (attempts || []).map((a: any) => ({
            ...a,
            quiz: a.course_quizzes,
          }))
        );
      }

      // Fetch grades
      const { data: gradesData } = await supabase
        .from("grades")
        .select(`
          id,
          score,
          exams!fk_grades_exam_id (title, exam_type, max_score)
        `)
        .eq("student_id", child.id)
        .order("created_at", { ascending: false });

      setGrades(
        (gradesData || []).map((g: any) => ({
          ...g,
          exam: g.exams,
        }))
      );

      // Fetch shared performance notes
      const { data: notesData } = await supabase
        .from("student_performance_notes")
        .select("id, note, recommendation, created_at")
        .eq("student_id", child.id)
        .eq("shared_with_parent", true)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);
    } catch (error) {
      console.error("Error fetching child details:", error);
      toast.error("حدث خطأ في تحميل تفاصيل الطالب");
    }
  };

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    fetchChildDetails(child);
  };

  const calculateOverallPerformance = () => {
    let totalPercentage = 0;
    let count = 0;

    grades.forEach((g) => {
      if (g.exam?.max_score) {
        totalPercentage += (g.score / g.exam.max_score) * 100;
        count++;
      }
    });

    quizAttempts.forEach((a) => {
      if (a.total_points) {
        totalPercentage += (a.score / a.total_points) * 100;
        count++;
      }
    });

    return count > 0 ? Math.round(totalPercentage / count) : null;
  };

  const getPerformanceLevel = (percentage: number | null) => {
    if (percentage === null) return { label: "غير متوفر", color: "secondary" as const };
    if (percentage >= 90) return { label: "ممتاز", color: "default" as const };
    if (percentage >= 80) return { label: "جيد جداً", color: "default" as const };
    if (percentage >= 70) return { label: "جيد", color: "secondary" as const };
    if (percentage >= 60) return { label: "مقبول", color: "outline" as const };
    return { label: "ضعيف", color: "destructive" as const };
  };

  const overallPerformance = calculateOverallPerformance();
  const performanceLevel = getPerformanceLevel(overallPerformance);
  const passRate = quizAttempts.length > 0
    ? Math.round((quizAttempts.filter((a) => a.passed).length / quizAttempts.length) * 100)
    : 0;

  return (
    <DashboardLayout userRole={userRole || "parent"} userName={profile?.full_name || "ولي أمر"}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">أداء الأبناء</h1>
          <p className="text-muted-foreground">
            متابعة أداء أبنائك في الاختبارات والدورات التدريبية
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا يوجد أبناء مسجلين</h3>
              <p className="text-muted-foreground">
                لم يتم ربط أي طلاب بحسابك بعد. تواصل مع إدارة المنصة لربط حساب أبنائك.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Children Selection */}
            {children.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">اختر الابن/الابنة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleSelectChild(child)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          selectedChild?.id === child.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {child.profile?.full_name || "طالب"}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedChild && (
              <>
                {/* Student Info & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">الطالب</CardTitle>
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{selectedChild.profile?.full_name}</div>
                      <p className="text-xs text-muted-foreground">{selectedChild.class?.name || "غير مسجل بفصل"}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">المستوى العام</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {overallPerformance !== null ? `${overallPerformance}%` : "-"}
                        </span>
                        <Badge variant={performanceLevel.color}>{performanceLevel.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">نسبة النجاح</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{passRate}%</div>
                      <Progress value={passRate} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">الاختبارات</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{quizAttempts.length + grades.length}</div>
                      <p className="text-xs text-muted-foreground">إجمالي الاختبارات</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Details */}
                <Tabs defaultValue="quizzes" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="quizzes">اختبارات الدورات التدريبية</TabsTrigger>
                    <TabsTrigger value="exams">الاختبارات الأخرى</TabsTrigger>
                    <TabsTrigger value="notes">ملاحظات المعلمين</TabsTrigger>
                  </TabsList>

                  <TabsContent value="quizzes">
                    <Card>
                      <CardHeader>
                        <CardTitle>اختبارات الدورات التدريبية</CardTitle>
                        <CardDescription>نتائج الاختبارات في الدورات التدريبية المسجل بها</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {quizAttempts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>لا توجد اختبارات مكتملة بعد</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الاختبار</TableHead>
                                <TableHead>الدرجة</TableHead>
                                <TableHead>النسبة</TableHead>
                                <TableHead>النتيجة</TableHead>
                                <TableHead>التاريخ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {quizAttempts.map((attempt) => {
                                const percentage = attempt.total_points
                                  ? Math.round((attempt.score / attempt.total_points) * 100)
                                  : 0;
                                return (
                                  <TableRow key={attempt.id}>
                                    <TableCell className="font-medium">
                                      {attempt.quiz?.title || "اختبار"}
                                    </TableCell>
                                    <TableCell>
                                      {attempt.score} / {attempt.total_points}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress value={percentage} className="w-16" />
                                        <span className="text-sm">{percentage}%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {attempt.passed ? (
                                        <Badge variant="default" className="gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          ناجح
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="gap-1">
                                          <XCircle className="h-3 w-3" />
                                          راسب
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {new Date(attempt.completed_at).toLocaleDateString("ar-EG")}
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
                        <CardTitle>الاختبارات الأخرى</CardTitle>
                        <CardDescription>اختبارات التقييم والاختبارات الدورية</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {grades.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>لا توجد درجات مسجلة بعد</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الاختبار</TableHead>
                                <TableHead>النوع</TableHead>
                                <TableHead>الدرجة</TableHead>
                                <TableHead>النسبة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grades.map((grade) => {
                                const percentage = grade.exam?.max_score
                                  ? Math.round((grade.score / grade.exam.max_score) * 100)
                                  : 0;
                                return (
                                  <TableRow key={grade.id}>
                                    <TableCell className="font-medium">
                                      {grade.exam?.title || "اختبار"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {examTypeLabels[grade.exam?.exam_type || "quiz"]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {grade.score} / {grade.exam?.max_score || 100}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress value={percentage} className="w-16" />
                                        <span className="text-sm">{percentage}%</span>
                                      </div>
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

                  <TabsContent value="notes">
                    <Card>
                      <CardHeader>
                        <CardTitle>ملاحظات المعلمين</CardTitle>
                        <CardDescription>الملاحظات والتوصيات المشاركة من المعلمين</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {notes.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>لا توجد ملاحظات مشاركة بعد</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {notes.map((note) => (
                              <Card key={note.id} className="bg-muted/50">
                                <CardContent className="pt-4">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <FileText className="h-4 w-4" />
                                    <span>
                                      {new Date(note.created_at).toLocaleDateString("ar-EG", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <p className="mb-3">{note.note}</p>
                                  {note.recommendation && (
                                    <div className="bg-background p-3 rounded-lg border">
                                      <p className="text-sm font-medium mb-1 text-primary">التوصيات:</p>
                                      <p className="text-sm">{note.recommendation}</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ChildrenPerformancePage;
