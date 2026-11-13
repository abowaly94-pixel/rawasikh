import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  Percent,
  TrendingUp,
} from "lucide-react";

interface AttemptRow {
  id: string;
  student_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
  started_at: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
}

interface AnswerDetail {
  id: string;
  question_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  is_correct: boolean | null;
  question_text: string;
  selected_option_text: string | null;
  correct_option_text: string | null;
}

const AssessmentResultsPage = () => {
  const { assessmentId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedAttempt, setSelectedAttempt] = useState<AttemptRow | null>(
    null
  );
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "admin") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "admin" && assessmentId) {
      fetchData();
    }
  }, [user, userRole, assessmentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: assessment } = await supabase
        .from("school_level_assessments")
        .select("title")
        .eq("id", assessmentId!)
        .maybeSingle();
      if (assessment) setAssessmentTitle(assessment.title);

      const { data: attemptsData, error } = await supabase
        .from("school_assessment_attempts")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const studentIds = Array.from(
        new Set((attemptsData || []).map((a) => a.student_id))
      );

      let studentsMap: Record<string, { user_id: string }> = {};
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, user_id")
          .in("id", studentIds);
        (studentsData || []).forEach((s) => {
          studentsMap[s.id] = { user_id: s.user_id };
        });
      }

      const userIds = Array.from(
        new Set(Object.values(studentsMap).map((s) => s.user_id).filter(Boolean))
      );

      let profilesMap: Record<
        string,
        { full_name: string; email: string | null; phone: string | null }
      > = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        (profilesData || []).forEach((p) => {
          profilesMap[p.id] = {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
          };
        });
      }

      const rows: AttemptRow[] = (attemptsData || []).map((a) => {
        const userId = studentsMap[a.student_id]?.user_id;
        const prof = userId ? profilesMap[userId] : undefined;
        return {
          id: a.id,
          student_id: a.student_id,
          score: a.score,
          max_score: a.max_score,
          percentage: a.percentage,
          passed: a.passed,
          completed_at: a.completed_at,
          started_at: a.started_at,
          student_name: prof?.full_name || "غير معروف",
          student_email: prof?.email || "-",
          student_phone: prof?.phone || null,
        };
      });

      setAttempts(rows);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewDetails = async (attempt: AttemptRow) => {
    setSelectedAttempt(attempt);
    setDetailsOpen(true);
    setAnswerDetails([]);

    const { data: answers } = await supabase
      .from("school_assessment_answers")
      .select("*")
      .eq("attempt_id", attempt.id);

    if (!answers || answers.length === 0) return;

    const questionIds = answers.map((a) => a.question_id);
    const { data: questions } = await supabase
      .from("school_assessment_questions")
      .select("id, question_text")
      .in("id", questionIds);

    const optionIds = answers
      .map((a) => a.selected_option_id)
      .filter((id): id is string => Boolean(id));
    const { data: selectedOptions } =
      optionIds.length > 0
        ? await supabase
            .from("school_assessment_options")
            .select("id, option_text")
            .in("id", optionIds)
        : { data: [] };

    const { data: correctOptions } = await supabase
      .from("school_assessment_options")
      .select("question_id, option_text")
      .in("question_id", questionIds)
      .eq("is_correct", true);

    const qMap = new Map((questions || []).map((q) => [q.id, q.question_text]));
    const selMap = new Map(
      (selectedOptions || []).map((o) => [o.id, o.option_text])
    );
    const correctMap = new Map(
      (correctOptions || []).map((o) => [o.question_id, o.option_text])
    );

    setAnswerDetails(
      answers.map((a) => ({
        id: a.id,
        question_id: a.question_id,
        selected_option_id: a.selected_option_id,
        answer_text: a.answer_text,
        is_correct: a.is_correct,
        question_text: qMap.get(a.question_id) || "-",
        selected_option_text: a.selected_option_id
          ? selMap.get(a.selected_option_id) || a.answer_text
          : a.answer_text,
        correct_option_text: correctMap.get(a.question_id) || null,
      }))
    );
  };

  const filtered = attempts.filter(
    (a) =>
      a.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completed = attempts.filter((a) => a.completed_at);
  const passedCount = completed.filter((a) => a.passed).length;
  const avgPercentage =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, a) => sum + (a.percentage || 0), 0) /
            completed.length
        )
      : 0;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={userRole || "admin"}
      userName={profile?.full_name || "مدير"}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/level-assessments")}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">نتائج الاختبار</h1>
            <p className="text-muted-foreground">{assessmentTitle}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المحاولات</p>
                <p className="text-2xl font-bold">{attempts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مكتملة</p>
                <p className="text-2xl font-bold">{completed.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ناجحون</p>
                <p className="text-2xl font-bold">{passedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
                <p className="text-2xl font-bold">{avgPercentage}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة المحاولات</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الإيميل..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لم يقم أي متدرب بإرسال هذا الاختبار بعد
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المتدرب</TableHead>
                    <TableHead>الإيميل</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>النسبة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>عرض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student_name}
                      </TableCell>
                      <TableCell>{a.student_email}</TableCell>
                      <TableCell>{a.student_phone || "-"}</TableCell>
                      <TableCell>
                        {a.score ?? 0} / {a.max_score ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {a.percentage !== null ? `${Math.round(a.percentage)}%` : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.completed_at ? (
                          <Badge variant={a.passed ? "default" : "destructive"}>
                            {a.passed ? "ناجح" : "راسب"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">لم تكتمل</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.completed_at
                          ? new Date(a.completed_at).toLocaleDateString("ar-EG")
                          : new Date(a.started_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewDetails(a)}
                          title="عرض الإجابات"
                        >
                          <Eye className="h-4 w-4" />
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
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                إجابات {selectedAttempt?.student_name} —{" "}
                {selectedAttempt?.percentage !== null
                  ? `${Math.round(selectedAttempt?.percentage || 0)}%`
                  : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {answerDetails.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  لا توجد إجابات
                </p>
              ) : (
                answerDetails.map((a, idx) => (
                  <Card
                    key={a.id}
                    className={
                      a.is_correct
                        ? "border-green-500/40"
                        : "border-destructive/40"
                    }
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        {a.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">
                            {idx + 1}. {a.question_text}
                          </p>
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">
                              إجابة المتدرب:{" "}
                            </span>
                            <span
                              className={
                                a.is_correct
                                  ? "text-green-600"
                                  : "text-destructive"
                              }
                            >
                              {a.selected_option_text || "لم يجب"}
                            </span>
                          </p>
                          {!a.is_correct && a.correct_option_text && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                الإجابة الصحيحة:{" "}
                              </span>
                              <span className="text-green-600">
                                {a.correct_option_text}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AssessmentResultsPage;
