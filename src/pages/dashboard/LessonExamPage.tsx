import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, RotateCcw, Home, AlertCircle } from "lucide-react";
import { logActivity } from "@/lib/activityLogger";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  exam_type: string;
  lesson_id: string | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer: string | null;
  points: number;
  order_index: number;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  answerText?: string;
}

interface ExamResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
}

const LessonExamPage = () => {
  const { lessonId, examId } = useParams<{ lessonId: string; examId: string }>();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStudentId();
      fetchExamData();
    }
  }, [examId, authLoading, user]);

  const fetchStudentId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setStudentId(data.id);
      // Fetch previous attempts
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId)
        .eq("student_id", data.id)
        .order("created_at", { ascending: false });
      
      setPreviousAttempts(attempts || []);
    }
  };

  const fetchExamData = async () => {
    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) {
        toast({
          title: "خطأ",
          description: "الاختبار غير موجود",
          variant: "destructive",
        });
        navigate(`/dashboard/lessons/${lessonId}`);
        return;
      }

      setExam(examData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", examId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch options for all questions
      if (questionsData && questionsData.length > 0) {
        const questionIds = questionsData.map(q => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("exam_question_options")
          .select("*")
          .in("question_id", questionIds)
          .order("order_index", { ascending: true });

        if (optionsError) throw optionsError;

        // Group options by question
        const groupedOptions: Record<string, Option[]> = {};
        (optionsData || []).forEach(opt => {
          if (!groupedOptions[opt.question_id]) {
            groupedOptions[opt.question_id] = [];
          }
          groupedOptions[opt.question_id].push(opt);
        });
        setOptions(groupedOptions);
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الاختبار",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const currentOptions = currentQuestion ? options[currentQuestion.id] || [] : [];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  const setAnswer = (questionId: string, optionId?: string, text?: string) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId);
      const newAnswer: Answer = {
        questionId,
        selectedOptionId: optionId,
        answerText: text,
      };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
  };

  const handleSubmit = async () => {
    if (!user || !studentId || !exam) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول كطالب لحل الاختبار",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Calculate score
      let totalScore = 0;
      let correctCount = 0;
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);

      const answerResults: { questionId: string; optionId?: string; text?: string; isCorrect: boolean }[] = [];

      for (const question of questions) {
        const answer = answers.find(a => a.questionId === question.id);
        let isCorrect = false;

        if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
          const questionOpts = options[question.id] || [];
          const selectedOption = questionOpts.find(o => o.id === answer?.selectedOptionId);
          isCorrect = selectedOption?.is_correct || false;
        } else if (question.question_type === "fill_blank" || question.question_type === "short_answer") {
          isCorrect = answer?.answerText?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase();
        }

        if (isCorrect) {
          totalScore += question.points || 1;
          correctCount++;
        }

        answerResults.push({
          questionId: question.id,
          optionId: answer?.selectedOptionId,
          text: answer?.answerText,
          isCorrect,
        });
      }

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= 60;

      // Save attempt
      const { data: attempt, error: attemptError } = await supabase
        .from("exam_attempts")
        .insert({
          exam_id: exam.id,
          student_id: studentId,
          score: totalScore,
          max_score: maxScore,
          percentage,
          passed,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Save answers
      const answersToInsert = answerResults.map(ar => ({
        attempt_id: attempt.id,
        question_id: ar.questionId,
        selected_option_id: ar.optionId || null,
        answer_text: ar.text || null,
        is_correct: ar.isCorrect,
      }));

      const { error: answersError } = await supabase
        .from("exam_answers")
        .insert(answersToInsert);

      if (answersError) throw answersError;

      // Also save to grades table for teacher visibility
      await supabase.from("grades").insert({
        exam_id: exam.id,
        student_id: studentId,
        score: totalScore,
        notes: `تم الإجابة على ${correctCount} من ${questions.length} سؤال بشكل صحيح`,
      });

      setResult({
        score: totalScore,
        maxScore,
        percentage,
        passed,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
      });

      logActivity({
        actionType: "exam_submitted",
        description: `تسليم اختبار: ${exam.title} - النتيجة: ${percentage.toFixed(0)}%`,
        entityType: "exam",
        entityId: exam.id,
      });

      toast({
        title: passed ? "أحسنت!" : "حاول مرة أخرى",
        description: passed 
          ? `لقد اجتزت الاختبار بنسبة ${percentage.toFixed(0)}%` 
          : `لم تجتز الاختبار، نسبتك ${percentage.toFixed(0)}%`,
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الإجابات",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetExam = () => {
    setAnswers([]);
    setCurrentIndex(0);
    setResult(null);
  };

  const getExamTypeName = (type: string) => {
    const types: Record<string, string> = {
      quiz: "اختبار قصير",
      midterm: "اختبار نصفي",
      final: "اختبار نهائي",
      assignment: "واجب",
      project: "مشروع",
      evaluation: "تقييم"
    };
    return types[type] || type;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Card className="max-w-lg mx-auto text-center py-12">
          <CardContent>
            <AlertCircle className="h-16 w-16 mx-auto text-warning mb-4" />
            <h2 className="text-2xl font-bold mb-4">تسجيل الدخول مطلوب</h2>
            <p className="text-muted-foreground mb-6">
              يجب عليك تسجيل الدخول لحل الاختبار
            </p>
            <Button onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Show result page
  if (result) {
    return (
      <DashboardLayout>
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader>
            <div className={`mx-auto mb-4 p-4 rounded-full ${result.passed ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              {result.passed ? (
                <Trophy className="h-16 w-16 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {result.passed ? "أحسنت! لقد نجحت" : "للأسف لم تنجح"}
            </CardTitle>
            <CardDescription>
              {exam?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-3xl font-bold text-primary">{result.percentage.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">النسبة المئوية</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-3xl font-bold">{result.score}/{result.maxScore}</p>
                <p className="text-sm text-muted-foreground">الدرجة</p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">الإجابات الصحيحة</span>
                <span className="font-bold">{result.correctAnswers}/{result.totalQuestions}</span>
              </div>
              <Progress value={(result.correctAnswers / result.totalQuestions) * 100} />
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={resetExam} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                إعادة الاختبار
              </Button>
              <Button onClick={() => navigate(`/dashboard/lessons/${lessonId}`)} className="gap-2">
                <Home className="h-4 w-4" />
                العودة للحصة
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <Card className="max-w-lg mx-auto text-center py-12">
          <CardContent>
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">لا توجد أسئلة</h2>
            <p className="text-muted-foreground mb-6">
              هذا الاختبار لا يحتوي على أسئلة بعد
            </p>
            <Button onClick={() => navigate(`/dashboard/lessons/${lessonId}`)}>العودة</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/lessons/${lessonId}`)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{exam?.title}</h1>
            <p className="text-sm text-muted-foreground">
              <Badge variant="secondary">{getExamTypeName(exam?.exam_type || "")}</Badge>
            </p>
          </div>
        </div>

        {/* Previous Attempts */}
        {previousAttempts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">محاولاتك السابقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {previousAttempts.slice(0, 3).map((attempt, index) => (
                  <div key={attempt.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <span className="text-sm">المحاولة {previousAttempts.length - index}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{attempt.score}/{attempt.max_score}</span>
                      <Badge variant={attempt.passed ? "default" : "destructive"}>
                        {attempt.percentage?.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Card */}
        <Card>
          {/* Exam Header */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>السؤال {currentIndex + 1} من {questions.length}</CardTitle>
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-4 w-4" />
                {currentQuestion?.points || 1} نقطة
              </Badge>
            </div>
            <Progress value={((currentIndex + 1) / questions.length) * 100} className="mt-4" />
          </CardHeader>

          <CardContent className="py-8">
            {/* Question */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">{currentQuestion?.question_text}</h3>

              {/* Answer Options */}
              {(currentQuestion?.question_type === "multiple_choice" || currentQuestion?.question_type === "true_false") && (
                <RadioGroup
                  value={currentAnswer?.selectedOptionId || ""}
                  onValueChange={(value) => setAnswer(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-center space-x-3 space-x-reverse p-4 border rounded-lg cursor-pointer transition-colors ${
                        currentAnswer?.selectedOptionId === option.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setAnswer(currentQuestion.id, option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {(currentQuestion?.question_type === "fill_blank" || currentQuestion?.question_type === "short_answer") && (
                <Input
                  value={currentAnswer?.answerText || ""}
                  onChange={(e) => setAnswer(currentQuestion.id, undefined, e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="text-lg"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                السابق
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || answers.length < questions.length}
                >
                  {submitting ? "جاري الإرسال..." : "إنهاء الاختبار"}
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                >
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              )}
            </div>

            {/* Question Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              {questions.map((_, index) => {
                const answered = answers.some(a => a.questionId === questions[index].id);
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      index === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : answered
                        ? "bg-green-500 text-white"
                        : "bg-muted hover:bg-muted-foreground/20"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LessonExamPage;
