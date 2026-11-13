import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, Trophy, RefreshCw, BookOpen } from "lucide-react";
import { logActivity } from "@/lib/activityLogger";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  correct_answer: string | null;
  explanation: string | null;
  options: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface AnswerResult {
  questionId: string;
  questionText: string;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionId: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
  explanation: string | null;
  points: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  school_name: string;
}

const LevelAssessmentExamPage = () => {
  const { assessmentId } = useParams();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    answerDetails: AnswerResult[];
  } | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [linkedCourse, setLinkedCourse] = useState<{ id: string; title: string } | null>(null);
  const [recommendedLevel, setRecommendedLevel] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "لازم تسجل دخول الأول عشان تعمل اختبار تحديد المستوى",
        variant: "destructive",
      });
      navigate(`/auth?redirect=/level-assessment/${assessmentId || ""}`);
    }
  }, [user, loading, navigate, assessmentId, toast]);

  useEffect(() => {
    if (user && assessmentId) {
      fetchData();
    }
  }, [user, assessmentId]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 shell py-8" />
        <Footer />
      </div>
    );
  }

  const fetchData = async () => {
    try {
      // Get or auto-create student record (placement tests open to any signed-in user)
      let { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .limit(1)
        .maybeSingle();

      if (!student) {
        const { data: newStudent, error: createErr } = await supabase
          .from("students")
          .insert({
            user_id: user?.id,
          } as any)
          .select("id")
          .single();

        if (createErr || !newStudent) {
          console.error("Auto-create student failed:", createErr);
          toast({ title: "خطأ", description: "تعذر تجهيز حسابك لأداء الاختبار. حاول مجدداً.", variant: "destructive" });
          navigate("/level-assessment");
          return;
        }
        student = newStudent;
      }
      setStudentId(student.id);

      // Block re-attempts: if a courseId is provided, check per-course;
      // otherwise check per-assessment (legacy/standalone test).
      if (courseIdParam) {
        const { data: prior } = await supabase
          .from("course_level_assessments")
          .select("id")
          .eq("course_id", courseIdParam)
          .eq("user_id", user!.id)
          .maybeSingle();

        if (prior) {
          toast({
            title: "تم الاختبار من قبل",
            description: "لقد أديت اختبار تحديد المستوى لهذه الدورة التدريبية بالفعل ولا يمكن إعادته",
            variant: "destructive",
          });
          navigate(`/courses/${courseIdParam}`);
          return;
        }
      } else {
        const { count } = await supabase
          .from("school_assessment_attempts")
          .select("*", { count: "exact", head: true })
          .eq("assessment_id", assessmentId)
          .eq("student_id", student.id)
          .not("completed_at", "is", null);

        setAttemptCount(count || 0);

        if ((count || 0) > 0) {
          toast({
            title: "تم الاختبار من قبل",
            description: "لقد أديت هذا الاختبار بالفعل ولا يمكن إعادته",
            variant: "destructive",
          });
          navigate("/level-assessment");
          return;
        }
      }

      // Get assessment info
      const { data: assessmentData } = await supabase
        .from("school_level_assessments")
        .select("*")
        .eq("id", assessmentId)
        .eq("is_active", true)
        .single();

      if (!assessmentData) {
        toast({ title: "خطأ", description: "الاختبار غير موجود أو غير متاح", variant: "destructive" });
        navigate("/level-assessment");
        return;
      }

      // Get school name
      const { data: schoolData } = await supabase
        .from("schools")
        .select("name")
        .eq("id", assessmentData.school_id)
        .single();

      setAssessment({
        ...assessmentData,
        school_name: schoolData?.name || "غير محدد",
      });

      // Fetch questions with options
      const { data: questionsData } = await supabase
        .from("school_assessment_questions")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("order_index");

      if (questionsData && questionsData.length > 0) {
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (question) => {
            const { data: optionsData } = await supabase
              .from("school_assessment_options")
              .select("*")
              .eq("question_id", question.id)
              .order("order_index");

            return {
              ...question,
              options: optionsData || [],
            };
          })
        );
        setQuestions(questionsWithOptions);

        // Create attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("school_assessment_attempts")
          .insert({
            assessment_id: assessmentId,
            student_id: student.id,
            max_score: assessmentData.max_score,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);
      } else {
        toast({ title: "خطأ", description: "لا توجد أسئلة في هذا الاختبار", variant: "destructive" });
        navigate("/level-assessment");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || !studentId) return;

    setIsSubmitting(true);

    try {
      let totalScore = 0;
      let correctCount = 0;
      const answerDetails: AnswerResult[] = [];

      // Save answers and calculate score
      for (const question of questions) {
        const selectedOptionId = answers[question.id];
        let isCorrect = false;
        const correctOption = question.options.find((o) => o.is_correct);
        const selectedOption = selectedOptionId ? question.options.find((o) => o.id === selectedOptionId) : null;

        if (selectedOptionId && selectedOption?.is_correct) {
          isCorrect = true;
          totalScore += question.points;
          correctCount++;
        }

        answerDetails.push({
          questionId: question.id,
          questionText: question.question_text,
          selectedOptionId: selectedOptionId || null,
          selectedOptionText: selectedOption?.option_text || null,
          correctOptionId: correctOption?.id || null,
          correctOptionText: correctOption?.option_text || null,
          isCorrect,
          explanation: question.explanation,
          points: question.points,
        });

        // Save answer
        await supabase.from("school_assessment_answers").insert({
          attempt_id: attemptId,
          question_id: question.id,
          selected_option_id: selectedOptionId || null,
          is_correct: isCorrect,
        });
      }

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= 60;

      // Update attempt
      await supabase
        .from("school_assessment_attempts")
        .update({
          score: totalScore,
          percentage,
          passed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      setResults({
        score: totalScore,
        maxScore,
        percentage,
        passed,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        answerDetails,
      });
      setShowResults(true);
      setAttemptCount((prev) => prev + 1);

      // Find linked course (prefer the one passed via query param so the same
      // assessment can be reused across multiple courses)
      let linkedCourseData: { id: string; title: string } | null = null;
      if (courseIdParam) {
        const { data } = await supabase
          .from("courses")
          .select("id, title")
          .eq("id", courseIdParam)
          .maybeSingle();
        linkedCourseData = data;
      } else {
        const { data } = await supabase
          .from("courses")
          .select("id, title")
          .eq("level_assessment_id", assessmentId!)
          .eq("requires_level_assessment", true)
          .maybeSingle();
        linkedCourseData = data;
      }

      if (linkedCourseData) {
        setLinkedCourse(linkedCourseData);
        const { data: levels } = await supabase
          .from("course_levels")
          .select("id, name, min_score, max_score, order_index")
          .eq("course_id", linkedCourseData.id)
          .eq("is_active", true)
          .order("order_index");

        const matched = levels?.find((l) => {
          const min = l.min_score ?? 0;
          const max = l.max_score ?? 100;
          return percentage >= min && percentage <= max;
        });

        if (matched) {
          setRecommendedLevel({ id: matched.id, name: matched.name });
          // Save recommendation
          await supabase.from("course_level_assessments").upsert({
            course_id: linkedCourseData.id,
            user_id: user!.id,
            score: Math.round(percentage),
            recommended_level_id: matched.id,
          } as any, { onConflict: "course_id,user_id" });
        }
      }

      logActivity({
        actionType: "assessment_submitted",
        description: `تسليم تقييم - النتيجة: ${percentage.toFixed(0)}%`,
        entityType: "assessment",
        entityId: assessmentId,
      });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setShowResults(false);
    setResults(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setAttemptId(null);
    fetchData();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Score Card */}
            <Card>
              <CardHeader className="text-center">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    results.passed ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {results.passed ? (
                    <Trophy className="h-10 w-10 text-green-600" />
                  ) : (
                    <XCircle className="h-10 w-10 text-red-600" />
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {results.passed ? "مبروك! لقد اجتزت الاختبار" : "للأسف، لم تجتز الاختبار"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  المحاولة رقم {attemptCount}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold mb-2">
                    {results.score} / {results.maxScore}
                  </p>
                  <p className="text-xl text-muted-foreground">
                    النسبة: {results.percentage.toFixed(1)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{results.correctAnswers}</p>
                    <p className="text-sm text-muted-foreground">إجابة صحيحة</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {results.totalQuestions - results.correctAnswers}
                    </p>
                    <p className="text-sm text-muted-foreground">إجابة خاطئة</p>
                  </div>
                </div>

                <Progress value={results.percentage} className="h-3" />

                {recommendedLevel && linkedCourse && (
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">المستوى المناسب لك في دورة "{linkedCourse.title}" التدريبية</p>
                    <p className="text-2xl font-bold text-primary">{recommendedLevel.name}</p>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => navigate(`/courses/${linkedCourse.id}`)}
                    >
                      ابدأ الدورة التدريبية بالمستوى بتاعك
                      <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Answer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  مراجعة الإجابات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.answerDetails.map((answer, index) => (
                  <div
                    key={answer.questionId}
                    className={`p-4 rounded-lg border ${
                      answer.isCorrect
                        ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                        : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          answer.isCorrect ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {answer.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <XCircle className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">
                          {index + 1}. {answer.questionText}
                        </p>
                        <div className="text-sm space-y-1">
                          {answer.selectedOptionText ? (
                            <p className={answer.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                              إجابتك: {answer.selectedOptionText}
                            </p>
                          ) : (
                            <p className="text-red-700 dark:text-red-400">لم تجب على هذا السؤال</p>
                          )}
                          {!answer.isCorrect && answer.correctOptionText && (
                            <p className="text-green-700 dark:text-green-400">
                              الإجابة الصحيحة: {answer.correctOptionText}
                            </p>
                          )}
                        </div>
                        {answer.explanation && (
                          <div className="mt-3 p-3 bg-background rounded border">
                            <p className="text-xs text-muted-foreground mb-1">شرح الإجابة:</p>
                            <p className="text-sm">{answer.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <main className="shell py-8 lg:py-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{assessment?.title}</h1>
            <p className="text-muted-foreground">{assessment?.school_name}</p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>
                السؤال {currentQuestionIndex + 1} من {questions.length}
              </span>
              <span>
                تم الإجابة على {answeredCount} من {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          {currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-relaxed">
                  {currentQuestion.question_text}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentQuestion.points} درجة
                </p>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-center space-x-3 space-x-reverse p-4 rounded-lg border cursor-pointer transition-colors ${
                        answers[currentQuestion.id] === option.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              السابق
            </Button>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || answeredCount !== questions.length}
              >
                {isSubmitting ? "جاري الإرسال..." : "إنهاء الاختبار"}
                <CheckCircle className="h-4 w-4 mr-2" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                التالي
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            )}
          </div>

          {/* Question Navigation */}
          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-3">انتقل إلى سؤال:</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => (
                <Button
                  key={q.id}
                  variant={currentQuestionIndex === index ? "default" : answers[q.id] ? "secondary" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LevelAssessmentExamPage;
