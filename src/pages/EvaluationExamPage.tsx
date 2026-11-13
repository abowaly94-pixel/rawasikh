import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, RotateCcw, Home, AlertCircle } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  exam_type: string;
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

const EvaluationExamPage = () => {
  const { categoryId, examId } = useParams<{ categoryId: string; examId: string }>();
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) {
      fetchStudentId();
    }
    fetchExamData();
  }, [examId, user]);

  const fetchStudentId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setStudentId(data.id);
    }
  };

  const fetchExamData = async () => {
    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .eq("is_public", true)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) {
        toast({
          title: "خطأ",
          description: "الاختبار غير موجود أو غير متاح",
          variant: "destructive",
        });
        navigate(`/evaluation-tests/${categoryId}`);
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
          const selectedOption = currentOptions.find(o => o.id === answer?.selectedOptionId);
          const questionOpts = options[question.id] || [];
          const correctOption = questionOpts.find(o => o.is_correct);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto text-warning mb-4" />
              <h2 className="text-2xl font-bold mb-4">تسجيل الدخول مطلوب</h2>
              <p className="text-muted-foreground mb-6">
                يجب عليك تسجيل الدخول لحل اختبارات التقييم
              </p>
              <Button asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <div className={`mx-auto mb-4 p-4 rounded-full ${result.passed ? "bg-green-100" : "bg-red-100"}`}>
                {result.passed ? (
                  <Trophy className="h-16 w-16 text-green-600" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-600" />
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
                <Button asChild className="gap-2">
                  <Link to={`/evaluation-tests/${categoryId}`}>
                    <Home className="h-4 w-4" />
                    العودة للاختبارات
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">لا توجد أسئلة</h2>
              <p className="text-muted-foreground mb-6">
                هذا الاختبار لا يحتوي على أسئلة بعد
              </p>
              <Button asChild>
                <Link to={`/evaluation-tests/${categoryId}`}>العودة</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <main className="shell py-10 lg:py-12">
        <Card className="max-w-3xl mx-auto">
          {/* Exam Header */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{exam?.title}</CardTitle>
                <CardDescription>
                  السؤال {currentIndex + 1} من {questions.length}
                </CardDescription>
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
                onClick={() => setCurrentIndex(prev => prev - 1)}
                disabled={currentIndex === 0}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>

              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      idx === currentIndex
                        ? "bg-primary"
                        : answers.find(a => a.questionId === questions[idx].id)
                        ? "bg-primary/50"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="gap-2"
                >
                  التالي
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? "جاري الإرسال..." : "إنهاء الاختبار"}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions Overview */}
        <Card className="max-w-3xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="text-lg">نظرة عامة على الأسئلة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers.some(a => a.questionId === q.id);
                const isCurrent = idx === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-10 h-10 rounded-lg border font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary"
                        : isAnswered
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              تم الإجابة على {answers.length} من {questions.length} سؤال
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default EvaluationExamPage;
