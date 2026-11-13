import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, Trophy, RefreshCw, BookOpen, LogIn, UserPlus, ClipboardCheck, School, User } from "lucide-react";
import rawasikhLogo from "@/assets/rawasikh-logo.png";

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
  school_id: string | null;
}

interface SchoolOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
}

interface GradeLevelOption {
  id: string;
  name: string;
  stage_id: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const AssessmentInvitePage = () => {
  const { assessmentId } = useParams();
  const { user, loading: authLoading, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Assessment info
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [assessmentNotFound, setAssessmentNotFound] = useState(false);

  // Auth states
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  // Student-specific fields (same as Auth.tsx)
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [isIndependent, setIsIndependent] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Options for dropdowns
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Exam states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isExamLoading, setIsExamLoading] = useState(false);
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

  // Fetch assessment info on mount
  useEffect(() => {
    if (assessmentId) {
      fetchAssessmentInfo();
    }
  }, [assessmentId]);

  // Load schools and stages for the signup form
  useEffect(() => {
    fetchSchools();
    fetchStages();
  }, []);

  // Auto-select school if assessment is linked to a school
  useEffect(() => {
    if (assessment?.school_id) {
      setIsIndependent(false);
      setSelectedSchoolId(assessment.school_id);
    }
  }, [assessment]);

  // Reset dependent fields when school changes
  useEffect(() => {
    if (selectedSchoolId) {
      setSelectedClassId("");
      fetchClasses(selectedSchoolId, selectedStageId || undefined);
    }
  }, [selectedSchoolId]);

  // Load grade levels when stage is selected
  useEffect(() => {
    if (selectedStageId) {
      fetchGradeLevels(selectedStageId);
      setSelectedGradeLevelId("");
      setSelectedClassId("");
    }
  }, [selectedStageId]);

  // Load classes when school and optionally stage is selected
  useEffect(() => {
    if (selectedSchoolId) {
      fetchClasses(selectedSchoolId, selectedStageId || undefined);
    }
  }, [selectedSchoolId, selectedStageId]);

  // When user is authenticated, fetch exam data
  useEffect(() => {
    if (user && assessment && !showResults) {
      fetchExamData();
    }
  }, [user, assessment]);

  const fetchSchools = async () => {
    const { data } = await supabase.rpc("list_active_schools_for_signup");
    if (data) setSchools(data);
  };

  const fetchStages = async () => {
    const { data } = await supabase
      .from("global_stages")
      .select("id, name")
      .order("order_index");
    if (data) setStages(data);
  };

  const fetchGradeLevels = async (stageId: string) => {
    const { data } = await supabase
      .from("grade_levels")
      .select("id, name, stage_id")
      .eq("stage_id", stageId)
      .order("order_index");
    if (data) setGradeLevels(data);
  };

  const fetchClasses = async (schoolId: string, stageId?: string) => {
    const { data } = await supabase.rpc("list_classes_for_signup", {
      _school_id: schoolId,
      _stage_id: stageId || null,
    });
    if (data) setClasses(data);
  };

  const fetchAssessmentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("school_level_assessments")
        .select("id, title, description, max_score, school_id")
        .eq("id", assessmentId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setAssessmentNotFound(true);
      } else {
        setAssessment(data);
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
      setAssessmentNotFound(true);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const fetchExamData = async () => {
    if (!user || !assessmentId) return;
    setIsExamLoading(true);

    try {
      // Get student record (should be created by trigger during signup)
      let { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!student) {
        // Fallback: Create student record if it wasn't created by the trigger
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert({ user_id: user.id, status: "active" })
          .select("id")
          .single();

        if (studentError) {
          console.error("Error creating student:", studentError);
          toast({ title: "خطأ", description: "فشل في إنشاء سجل الطالب", variant: "destructive" });
          return;
        }
        student = newStudent;
      }
      setStudentId(student.id);

      // Get previous attempt count
      const { count } = await supabase
        .from("school_assessment_attempts")
        .select("*", { count: "exact", head: true })
        .eq("assessment_id", assessmentId)
        .eq("student_id", student.id)
        .not("completed_at", "is", null);

      setAttemptCount(count || 0);

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
            max_score: assessment?.max_score || 100,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);
      } else {
        toast({ title: "خطأ", description: "لا توجد أسئلة في هذا الاختبار", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching exam data:", error);
    } finally {
      setIsExamLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);

    try {
      if (authMode === "register") {
        // Build extra data for student - same as Auth.tsx
        const extraData: Record<string, string> = {};
        if (studentPhone) extraData.phone = studentPhone;
        if (!isIndependent && selectedSchoolId) extraData.school_id = selectedSchoolId;
        if (selectedStageId) extraData.stage_id = selectedStageId;
        if (selectedGradeLevelId) extraData.grade_level_id = selectedGradeLevelId;
        if (selectedClassId && selectedClassId !== "none") extraData.class_id = selectedClassId;

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.full_name,
          "student",
          extraData
        );

        if (error) {
          let message = "فشل في إنشاء الحساب";
          if (error.message.includes("already registered")) {
            message = "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.";
          }
          toast({ title: "خطأ في التسجيل", description: message, variant: "destructive" });
        } else {
          toast({ title: "تم التسجيل بنجاح", description: "جاري تحميل الاختبار..." });
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({ title: "خطأ في تسجيل الدخول", description: error.message, variant: "destructive" });
        }
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setAuthSubmitting(false);
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
    fetchExamData();
  };

  // Loading state
  if (authLoading || assessmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Assessment not found
  if (assessmentNotFound || !assessment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <img src={rawasikhLogo} alt="رواسخ" className="h-16 mb-6" />
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">الاختبار غير موجود</h2>
            <p className="text-muted-foreground">هذا الرابط غير صالح أو أن الاختبار لم يعد متاحاً</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show results
  if (showResults && results) {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6 py-8">
          <div className="text-center mb-6">
            <img src={rawasikhLogo} alt="رواسخ" className="h-12 mx-auto" />
          </div>

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
                {assessment.title} - المحاولة رقم {attemptCount}
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

              <Button variant="outline" className="w-full" onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة الاختبار
              </Button>
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
      </div>
    );
  }

  // User not authenticated - show auth form with FULL student fields (same as Auth.tsx)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-background p-4 py-8" dir="rtl">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center">
            <img src={rawasikhLogo} alt="رواسخ" className="h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{assessment.title}</h1>
            {assessment.description && (
              <p className="text-muted-foreground mt-2">{assessment.description}</p>
            )}
          </div>

          {/* Auth Form */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {authMode === "register" ? (
                  <>
                    <UserPlus className="h-5 w-5" />
                    إنشاء حساب للبدء
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    تسجيل الدخول
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {authMode === "register"
                  ? "أنشئ حساباً جديداً لأداء الاختبار"
                  : "سجل دخولك لمتابعة الاختبار"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="full_name">الاسم الكامل *</Label>
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="أدخل اسمك الكامل"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6 أحرف على الأقل"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    dir="ltr"
                    minLength={6}
                  />
                </div>

                {/* Student-specific fields - same as Auth.tsx */}
                {authMode === "register" && (
                  <>
                    {/* Contact Info */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">بيانات التواصل</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-phone">رقم هاتف الطالب</Label>
                          <Input
                            id="student-phone"
                            type="tel"
                            placeholder="05xxxxxxxx"
                            value={studentPhone}
                            onChange={(e) => setStudentPhone(e.target.value)}
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parent-phone">رقم هاتف ولي الأمر</Label>
                          <Input
                            id="parent-phone"
                            type="tel"
                            placeholder="05xxxxxxxx"
                            value={parentPhone}
                            onChange={(e) => setParentPhone(e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    {/* School Assignment */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">الإسناد للمدرسة</h4>
                      <RadioGroup
                        value={isIndependent ? "independent" : "school"}
                        onValueChange={(value) => {
                          setIsIndependent(value === "independent");
                          if (value === "independent") {
                            setSelectedSchoolId("");
                            setSelectedStageId("");
                            setSelectedGradeLevelId("");
                            setSelectedClassId("");
                          }
                        }}
                        className="flex flex-wrap gap-4 mb-4"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="independent" id="independent" />
                          <Label htmlFor="independent" className="flex items-center gap-1 cursor-pointer">
                            <User className="h-4 w-4" />
                            طالب مستقل (بدون مدرسة)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="school" id="school" />
                          <Label htmlFor="school" className="flex items-center gap-1 cursor-pointer">
                            <School className="h-4 w-4" />
                            تابع لمدرسة
                          </Label>
                        </div>
                      </RadioGroup>

                      {!isIndependent && (
                        <>
                          <div className="space-y-2 mb-4">
                            <Label>اختر المدرسة</Label>
                            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المدرسة" />
                              </SelectTrigger>
                              <SelectContent>
                                {schools.map((school) => (
                                  <SelectItem key={school.id} value={school.id}>
                                    {school.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedSchoolId && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>المرحلة</Label>
                                <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر المرحلة" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stages.map((stage) => (
                                      <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>الصف</Label>
                                <Select
                                  value={selectedGradeLevelId}
                                  onValueChange={setSelectedGradeLevelId}
                                  disabled={!selectedStageId}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر الصف" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {gradeLevels.map((level) => (
                                      <SelectItem key={level.id} value={level.id}>
                                        {level.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>الفصل</Label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر الفصل" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">بدون فصل</SelectItem>
                                    {classes.map((cls) => (
                                      <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={authSubmitting}>
                  {authSubmitting ? (
                    "جاري المعالجة..."
                  ) : authMode === "register" ? (
                    <>
                      <ClipboardCheck className="h-4 w-4 ml-2" />
                      إنشاء حساب وبدء الاختبار
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 ml-2" />
                      تسجيل الدخول وبدء الاختبار
                    </>
                  )}
                </Button>

                <div className="text-center text-sm">
                  {authMode === "register" ? (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setAuthMode("login")}
                    >
                      لديك حساب؟ سجل دخولك
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setAuthMode("register")}
                    >
                      ليس لديك حساب؟ أنشئ حساباً جديداً
                    </button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading exam data
  if (isExamLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <img src={rawasikhLogo} alt="رواسخ" className="h-12 mb-6" />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">جاري تحميل الاختبار...</p>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <img src={rawasikhLogo} alt="رواسخ" className="h-12 mb-6" />
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">لا توجد أسئلة</h2>
            <p className="text-muted-foreground">هذا الاختبار لا يحتوي على أسئلة حالياً</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam Interface
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={rawasikhLogo} alt="رواسخ" className="h-10" />
            <div>
              <h1 className="font-bold">{assessment.title}</h1>
              {attemptCount > 0 && (
                <p className="text-xs text-muted-foreground">المحاولة رقم {attemptCount + 1}</p>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">
              السؤال {currentQuestionIndex + 1} من {questions.length}
            </p>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestionIndex + 1}. {currentQuestion.question_text}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentQuestion.points} نقطة</span>
            </div>
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
                      : "border-border hover:border-primary/50"
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

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            السابق
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "جاري الإرسال..." : "إرسال الإجابات"}
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
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={answers[q.id] ? "default" : "outline"}
                  size="sm"
                  className={`w-10 h-10 ${
                    idx === currentQuestionIndex ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssessmentInvitePage;
