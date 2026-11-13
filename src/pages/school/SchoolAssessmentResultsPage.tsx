import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, Users, Award, Eye, AlertTriangle } from "lucide-react";

interface AttemptWithDetails {
  id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
  student_name: string;
  student_number: string | null;
  assessment_title: string;
  subject_name: string | null;
  assessment_id: string;
  attempt_number: number;
}

interface Assessment {
  id: string;
  title: string;
}

interface AnswerDetail {
  question_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  weakness_feedback: string | null;
  explanation: string | null;
}

const SchoolAssessmentResultsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [results, setResults] = useState<AttemptWithDetails[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [stats, setStats] = useState({
    totalAttempts: 0,
    passedCount: 0,
    averageScore: 0,
  });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithDetails | null>(null);
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchData();
    }
  }, [user, userRole]);

  const fetchData = async () => {
    try {
      // Get school ID
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!school) return;

      // Fetch assessments for filter
      const { data: assessmentsData } = await supabase
        .from("school_level_assessments")
        .select("id, title")
        .eq("school_id", school.id);
      setAssessments(assessmentsData || []);

      // Fetch all attempts with details
      const { data: attemptsData } = await supabase
        .from("school_assessment_attempts")
        .select(`
          id, score, max_score, percentage, passed, completed_at,
          assessment_id,
          students!inner(id, student_number, user_id, school_id)
        `)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (attemptsData) {
        // Filter to only school's students
        const schoolAttempts = attemptsData.filter(
          (a: any) => a.students?.school_id === school.id
        );

        // Group attempts by student and assessment to count attempts
        const attemptCountMap: Record<string, number> = {};
        schoolAttempts.forEach((a: any) => {
          const key = `${a.students?.id}_${a.assessment_id}`;
          attemptCountMap[key] = (attemptCountMap[key] || 0) + 1;
        });

        // Track current count per key
        const currentCount: Record<string, number> = {};

        // Fetch additional details
        const resultsWithDetails: AttemptWithDetails[] = await Promise.all(
          schoolAttempts.map(async (attempt: any) => {
            const key = `${attempt.students?.id}_${attempt.assessment_id}`;
            currentCount[key] = (currentCount[key] || 0) + 1;

            // Get student profile
            let studentName = "غير محدد";
            if (attempt.students?.user_id) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", attempt.students.user_id)
                .single();
              studentName = profileData?.full_name || "غير محدد";
            }

            // Get assessment details
            const { data: assessmentData } = await supabase
              .from("school_level_assessments")
              .select("title, subject_id")
              .eq("id", attempt.assessment_id)
              .single();

            let subjectName = null;
            if (assessmentData?.subject_id) {
              const { data: subjectData } = await supabase
                .from("subjects")
                .select("name")
                .eq("id", assessmentData.subject_id)
                .single();
              subjectName = subjectData?.name || null;
            }

            return {
              id: attempt.id,
              score: attempt.score,
              max_score: attempt.max_score,
              percentage: attempt.percentage,
              passed: attempt.passed,
              completed_at: attempt.completed_at,
              student_name: studentName,
              student_number: attempt.students?.student_number,
              assessment_title: assessmentData?.title || "غير محدد",
              subject_name: subjectName,
              assessment_id: attempt.assessment_id,
              attempt_number: attemptCountMap[key] - currentCount[key] + 1,
            };
          })
        );

        setResults(resultsWithDetails);

        // Calculate stats
        const totalAttempts = resultsWithDetails.length;
        const passedCount = resultsWithDetails.filter((r) => r.passed).length;
        const averageScore =
          totalAttempts > 0
            ? resultsWithDetails.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalAttempts
            : 0;

        setStats({
          totalAttempts,
          passedCount,
          averageScore: Math.round(averageScore * 100) / 100,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.assessment_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.student_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAssessment =
      !selectedAssessment ||
      results.some(
        (r) =>
          r.assessment_title ===
          assessments.find((a) => a.id === selectedAssessment)?.title
      );

    return matchesSearch;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const viewDetails = async (attempt: AttemptWithDetails) => {
    setSelectedAttempt(attempt);
    setDetailsDialogOpen(true);
    setLoadingDetails(true);
    setAnswerDetails([]);

    try {
      // Get all answers for this attempt
      const { data: answers } = await supabase
        .from("school_assessment_answers")
        .select("question_id, selected_option_id, is_correct")
        .eq("attempt_id", attempt.id);

      if (answers && answers.length > 0) {
        const details: AnswerDetail[] = await Promise.all(
          answers.map(async (answer) => {
            // Get question details
            const { data: question } = await supabase
              .from("school_assessment_questions")
              .select("question_text, weakness_feedback, explanation")
              .eq("id", answer.question_id)
              .single();

            // Get student's selected option text
            let studentAnswer = "-";
            if (answer.selected_option_id) {
              const { data: selectedOpt } = await supabase
                .from("school_assessment_options")
                .select("option_text")
                .eq("id", answer.selected_option_id)
                .single();
              studentAnswer = selectedOpt?.option_text || "-";
            }

            // Get correct option text
            const { data: correctOpt } = await supabase
              .from("school_assessment_options")
              .select("option_text")
              .eq("question_id", answer.question_id)
              .eq("is_correct", true)
              .single();

            return {
              question_text: question?.question_text || "",
              student_answer: studentAnswer,
              correct_answer: correctOpt?.option_text || "-",
              is_correct: answer.is_correct || false,
              weakness_feedback: !answer.is_correct ? question?.weakness_feedback : null,
              explanation: question?.explanation || null,
            };
          })
        );

        setAnswerDetails(details);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoadingDetails(false);
    }
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
        <div>
          <h1 className="text-2xl font-bold">نتائج اختبارات التقييم</h1>
          <p className="text-muted-foreground">عرض نتائج الطلاب في اختبارات تقييم المستوى</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي المحاولات
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الناجحون
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.passedCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAttempts > 0
                  ? `${Math.round((stats.passedCount / stats.totalAttempts) * 100)}%`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                متوسط الدرجات
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle>جميع النتائج</CardTitle>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="جميع الاختبارات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الاختبارات</SelectItem>
                    {assessments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    className="pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد نتائج
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>رقم الطالب</TableHead>
                    <TableHead>الاختبار</TableHead>
                    <TableHead>المحاولة</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>النسبة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.student_name}</TableCell>
                      <TableCell>{result.student_number || "-"}</TableCell>
                      <TableCell>{result.assessment_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">#{result.attempt_number}</Badge>
                      </TableCell>
                      <TableCell>
                        {result.score ?? "-"} / {result.max_score ?? "-"}
                      </TableCell>
                      <TableCell>{result.percentage?.toFixed(1) ?? "-"}%</TableCell>
                      <TableCell>
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "ناجح" : "راسب"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(result.completed_at)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => viewDetails(result)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <AlertTriangle className="h-4 w-4 ml-1" />
                          تقرير السلبيات
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                تقرير السلبيات والإجابات
              </DialogTitle>
            </DialogHeader>
            {selectedAttempt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">الطالب:</span>
                    <p className="font-medium">{selectedAttempt.student_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الاختبار:</span>
                    <p className="font-medium">{selectedAttempt.assessment_title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الدرجة:</span>
                    <p className="font-medium">{selectedAttempt.score} / {selectedAttempt.max_score} ({selectedAttempt.percentage?.toFixed(1)}%)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">النتيجة:</span>
                    <Badge variant={selectedAttempt.passed ? "default" : "destructive"}>
                      {selectedAttempt.passed ? "ناجح" : "راسب"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">الأسئلة والإجابات</h4>
                  {loadingDetails ? (
                    <p className="text-muted-foreground text-center py-4">جاري التحميل...</p>
                  ) : answerDetails.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      لا توجد بيانات
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {answerDetails.map((detail, index) => (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-4 ${
                            detail.is_correct 
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          }`}
                        >
                          <p className="font-medium mb-2">
                            <span className="text-muted-foreground">السؤال {index + 1}:</span> {detail.question_text}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-muted-foreground">إجابة الطالب:</span>
                              <p className={`font-medium ${detail.is_correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                                {detail.student_answer}
                              </p>
                            </div>
                            {!detail.is_correct && (
                              <div>
                                <span className="text-muted-foreground">الإجابة الصحيحة:</span>
                                <p className="font-medium text-green-700 dark:text-green-400">{detail.correct_answer}</p>
                              </div>
                            )}
                          </div>
                          {detail.explanation && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 mt-2">
                              <p className="text-xs text-muted-foreground mb-1">الشرح:</p>
                              <p className="text-sm text-blue-700 dark:text-blue-400">{detail.explanation}</p>
                            </div>
                          )}
                          {!detail.is_correct && detail.weakness_feedback && (
                            <div className="bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded p-2 mt-2">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-blue-500" />
                                نقطة ضعف:
                              </p>
                              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{detail.weakness_feedback}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary of Weaknesses */}
                {answerDetails.filter(d => !d.is_correct && d.weakness_feedback).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-600">
                      <AlertTriangle className="h-4 w-4" />
                      ملخص السلبيات في الطالب
                    </h4>
                    <div className="space-y-2">
                      {answerDetails
                        .filter(d => !d.is_correct && d.weakness_feedback)
                        .map((d, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-500">•</span>
                            <span className="text-blue-700 dark:text-blue-400">{d.weakness_feedback}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SchoolLayout>
  );
};

export default SchoolAssessmentResultsPage;
