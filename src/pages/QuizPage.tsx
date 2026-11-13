import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileQuestion,
  Trophy,
  RotateCcw
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "fill_blank" | "short_answer";
  points: number;
  correct_answer: string | null;
  order_index: number;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

interface UserAnswer {
  question_id: string;
  answer: string;
  selected_option_id?: string;
}

const QuizPage = () => {
  const { quizId, courseId } = useParams<{ quizId: string; courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    totalPoints: number;
    passed: boolean;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch quiz
  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz_details", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quizzes")
        .select("*")
        .eq("id", quizId)
        .single();
      if (error) throw error;
      return data as Quiz;
    },
    enabled: !!quizId,
  });

  // Fetch questions
  const { data: questions } = useQuery({
    queryKey: ["quiz_questions_take", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");
      if (error) throw error;
      return data as Question[];
    },
    enabled: !!quizId,
  });

  // Fetch options
  const { data: options } = useQuery({
    queryKey: ["question_options_take", quizId],
    queryFn: async () => {
      const questionIds = questions?.map((q) => q.id) || [];
      if (questionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("question_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index");
      if (error) throw error;
      return data as Option[];
    },
    enabled: !!questions && questions.length > 0,
  });

  // Check for existing passed attempt
  const { data: existingAttempt } = useQuery({
    queryKey: ["quiz_attempt_check", quizId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .eq("passed", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!quizId,
  });

  // Timer effect
  useEffect(() => {
    if (quiz?.time_limit_minutes && !quizResult && !existingAttempt) {
      setTimeLeft(quiz.time_limit_minutes * 60);
    }
  }, [quiz, quizResult, existingAttempt]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || quizResult) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const currentOptions = options?.filter((o) => o.question_id === currentQuestion?.id) || [];
  const currentAnswer = answers.find((a) => a.question_id === currentQuestion?.id);

  const setAnswer = (questionId: string, answer: string, optionId?: string) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.question_id === questionId);
      if (existing) {
        return prev.map((a) =>
          a.question_id === questionId
            ? { ...a, answer, selected_option_id: optionId }
            : a
        );
      }
      return [...prev, { question_id: questionId, answer, selected_option_id: optionId }];
    });
  };

  const handleSubmit = async () => {
    if (!user || !quiz || !questions) return;
    
    setIsSubmitting(true);
    try {
      let score = 0;
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      // Calculate score
      for (const question of questions) {
        const answer = answers.find((a) => a.question_id === question.id);
        if (!answer) continue;

        let isCorrect = false;

        if (question.question_type === "multiple_choice") {
          const correctOption = options?.find(
            (o) => o.question_id === question.id && o.is_correct
          );
          isCorrect = answer.selected_option_id === correctOption?.id;
        } else if (question.question_type === "true_false") {
          isCorrect = answer.answer.toLowerCase() === question.correct_answer?.toLowerCase();
        } else if (question.question_type === "fill_blank") {
          isCorrect = answer.answer.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase();
        }

        if (isCorrect) {
          score += question.points;
        }
      }

      const percentage = Math.round((score / totalPoints) * 100);
      const passed = percentage >= quiz.passing_score;

      // Save attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          course_id: courseId || null,
          score,
          total_points: totalPoints,
          passed,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Save answers
      const answersToInsert = answers.map((a) => {
        const question = questions.find((q) => q.id === a.question_id);
        let isCorrect = false;

        if (question?.question_type === "multiple_choice") {
          const correctOption = options?.find(
            (o) => o.question_id === question.id && o.is_correct
          );
          isCorrect = a.selected_option_id === correctOption?.id;
        } else if (question) {
          isCorrect = a.answer.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase();
        }

        return {
          attempt_id: attemptData.id,
          question_id: a.question_id,
          answer_text: a.answer,
          selected_option_id: a.selected_option_id || null,
          is_correct: isCorrect,
        };
      });

      if (answersToInsert.length > 0) {
        await supabase.from("quiz_answers").insert(answersToInsert);
      }

      setQuizResult({ score, totalPoints, passed });
      queryClient.invalidateQueries({ queryKey: ["quiz_attempt_check"] });
      queryClient.invalidateQueries({ queryKey: ["quiz_attempts"] });

      if (passed) {
        toast.success(t("quizPage.passedToast"));
      } else {
        toast.error(t("quizPage.failedToast"));
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error(t("quizPage.submitErrorToast"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setQuizResult(null);
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <div className="shell py-12 lg:py-16 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">{t("quizPage.loginRequiredTitle")}</h1>
          <Button onClick={() => navigate("/auth")}>{t("quizPage.signIn")}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <div className="shell py-12 lg:py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
        <Footer />
      </div>
    );
  }

  // Already passed
  if (existingAttempt) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <div className="shell py-12 lg:py-16 text-center max-w-md">
          <Card>
            <CardContent className="p-8">
              <Trophy className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">{t("quizPage.alreadyPassedTitle")}</h1>
              <p className="text-muted-foreground mb-4">
                {t("quizPage.alreadyPassedDescription")}
              </p>
              <p className="text-lg font-medium mb-6">
                {t("quizPage.scoreLabel", { score: existingAttempt.score, total: existingAttempt.total_points })}
              </p>
              <Button onClick={() => navigate(courseId ? `/courses/${courseId}` : "/dashboard/my-courses")}>
                <ArrowRight className="ml-2 h-4 w-4" />
                {t("quizPage.backToCourse")}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Show result
  if (quizResult) {
    const percentage = Math.round((quizResult.score / quizResult.totalPoints) * 100);
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <div className="shell py-12 lg:py-16 text-center max-w-md">
          <Card>
            <CardContent className="p-8">
              {quizResult.passed ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-green-600 mb-2">{t("quizPage.passedTitle")}</h1>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-red-600 mb-2">{t("quizPage.failedTitle")}</h1>
                </>
              )}
              <p className="text-muted-foreground mb-4">
                {t("quizPage.yourScore", { score: quizResult.score, total: quizResult.totalPoints, percent: percentage })}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {t("quizPage.requiredScore", { score: quiz?.passing_score })}
              </p>
              <div className="space-y-3">
                {quizResult.passed ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate(courseId ? `/courses/${courseId}` : "/dashboard/my-courses")}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                    {t("quizPage.continueCourse")}
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" onClick={resetQuiz}>
                      <RotateCcw className="ml-2 h-4 w-4" />
                      {t("quizPage.retry")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(courseId ? `/courses/${courseId}` : "/dashboard/my-courses")}
                    >
                      {t("quizPage.backToCourse")}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <div className="shell py-12 lg:py-16 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">{t("quizPage.noQuestionsTitle")}</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            {t("quizPage.back")}
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <main className="shell py-8 lg:py-10 max-w-3xl">
        {/* Quiz Header */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-xl font-bold">{quiz?.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("quizPage.questionCount", { current: currentQuestionIndex + 1, total: questions.length })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {timeLeft !== null && (
                  <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                    <Clock className="h-4 w-4 ml-1" />
                    {formatTime(timeLeft)}
                  </Badge>
                )}
              </div>
            </div>
            <Progress 
              value={((currentQuestionIndex + 1) / questions.length) * 100} 
              className="mt-4 h-2" 
            />
          </CardContent>
        </Card>

        {/* Question */}
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline">
                  {currentQuestion.points} {currentQuestion.points === 1 ? t("quizPage.point") : t("quizPage.points")}
                </Badge>
                <span>{currentQuestion.question_text}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.question_type === "multiple_choice" && (
                <RadioGroup
                  value={currentAnswer?.selected_option_id || ""}
                  onValueChange={(value) => {
                    const option = currentOptions.find((o) => o.id === value);
                    setAnswer(currentQuestion.id, option?.option_text || "", value);
                  }}
                >
                  {currentOptions.map((option) => (
                    <div key={option.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.question_type === "true_false" && (
                <RadioGroup
                  value={currentAnswer?.answer || ""}
                  onValueChange={(value) => setAnswer(currentQuestion.id, value)}
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    {/* value stays the literal Arabic "صح" — it's compared against
                        the quiz's stored correct_answer, not shown as-is to the user */}
                    <RadioGroupItem value="صح" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer">{t("quizPage.true")}</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="خطأ" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer">{t("quizPage.false")}</Label>
                  </div>
                </RadioGroup>
              )}

              {(currentQuestion.question_type === "fill_blank" || currentQuestion.question_type === "short_answer") && (
                <Input
                  value={currentAnswer?.answer || ""}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder={t("quizPage.answerPlaceholder")}
                  className="mt-2"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            {t("quizPage.previous")}
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || answers.length === 0}
            >
              {isSubmitting ? t("quizPage.submitting") : t("quizPage.submitAnswers")}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            >
              {t("quizPage.next")}
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Answered Questions Overview */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">{t("quizPage.answeredQuestions")}</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers.some((a) => a.question_id === q.id);
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isAnswered
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default QuizPage;
