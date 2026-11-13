import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import QuestionImageUpload from "@/components/QuestionImageUpload";
import ExcelQuestionsUploader from "@/components/ExcelQuestionsUploader";
import MatchingPairsEditor, { MatchPair } from "@/components/MatchingPairsEditor";

type QuestionType = Database["public"]["Enums"]["question_type"];

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  correct_answer: string | null;
  order_index: number;
  image_url: string | null;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  match_text?: string | null;
}

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح أو خطأ",
  fill_blank: "أكمل الفراغ",
  short_answer: "إجابة قصيرة",
  matching: "توصيل",
  essay: "مقالي",
};

const QuizQuestionsPage = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "multiple_choice" as QuestionType,
    points: 1,
    correct_answer: "",
    image_url: null as string | null,
  });
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, navigate]);

  const { data: quiz } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quizzes")
        .select("*")
        .eq("id", quizId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });

  // A teacher may only manage the questions of a quiz they created
  // themselves. Mutations are already blocked at the database level, but
  // without this the page would still silently load another teacher's
  // quiz for viewing.
  useEffect(() => {
    if (!loading && quiz && userRole === "teacher" && quiz.created_by !== user?.id) {
      navigate("/dashboard/quizzes");
      toast.error("غير مصرح لك بالوصول لهذا الاختبار");
    }
  }, [loading, quiz, userRole, user?.id, navigate]);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz_questions", quizId],
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

  const { data: allOptions } = useQuery({
    queryKey: ["question_options", quizId],
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

  const createQuestionMutation = useMutation({
    mutationFn: async (data: typeof questionForm) => {
      const maxOrder = questions?.reduce((max, q) => Math.max(max, q.order_index), -1) ?? -1;
      
      const { data: questionData, error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question_text: data.question_text,
          question_type: data.question_type,
          points: data.points,
          correct_answer: data.question_type !== "multiple_choice" ? data.correct_answer : null,
          order_index: maxOrder + 1,
          image_url: data.image_url,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add options for multiple choice
      if (data.question_type === "multiple_choice" && options.length > 0) {
        const optionsToInsert = options
          .filter((opt) => opt.text.trim())
          .map((opt, idx) => ({
            question_id: questionData.id,
            option_text: opt.text,
            is_correct: opt.is_correct,
            order_index: idx,
          }));

        if (optionsToInsert.length > 0) {
          const { error: optError } = await supabase
            .from("question_options")
            .insert(optionsToInsert);
          if (optError) throw optError;
        }
      }

      // Add pairs for matching
      if (data.question_type === "matching") {
        const pairsToInsert = matchPairs
          .filter((p) => p.left.trim() && p.right.trim())
          .map((p, idx) => ({
            question_id: questionData.id,
            option_text: p.left,
            match_text: p.right,
            is_correct: true,
            order_index: idx,
          }));
        if (pairsToInsert.length > 0) {
          const { error: pErr } = await (supabase as any).from("question_options").insert(pairsToInsert);
          if (pErr) throw pErr;
        }
      }

      return questionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] });
      queryClient.invalidateQueries({ queryKey: ["question_options", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes"] });
      toast.success("تم إضافة السؤال بنجاح");
      resetForm();
      setQuestionDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof questionForm }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          question_text: data.question_text,
          question_type: data.question_type,
          points: data.points,
          correct_answer: data.question_type !== "multiple_choice" ? data.correct_answer : null,
          image_url: data.image_url,
        })
        .eq("id", id);
      
      if (error) throw error;

      // Delete old options and add new ones for multiple choice / matching
      if (data.question_type === "multiple_choice" || data.question_type === "matching") {
        await supabase.from("question_options").delete().eq("question_id", id);

        if (data.question_type === "multiple_choice") {
          const optionsToInsert = options
            .filter((opt) => opt.text.trim())
            .map((opt, idx) => ({
              question_id: id,
              option_text: opt.text,
              is_correct: opt.is_correct,
              order_index: idx,
            }));
          if (optionsToInsert.length > 0) {
            const { error: optError } = await supabase.from("question_options").insert(optionsToInsert);
            if (optError) throw optError;
          }
        } else {
          const pairs = matchPairs
            .filter((p) => p.left.trim() && p.right.trim())
            .map((p, idx) => ({
              question_id: id,
              option_text: p.left,
              match_text: p.right,
              is_correct: true,
              order_index: idx,
            }));
          if (pairs.length > 0) {
            const { error: pErr } = await (supabase as any).from("question_options").insert(pairs);
            if (pErr) throw pErr;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] });
      queryClient.invalidateQueries({ queryKey: ["question_options", quizId] });
      toast.success("تم تحديث السؤال");
      resetForm();
      setQuestionDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes"] });
      toast.success("تم حذف السؤال");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const resetForm = () => {
    setQuestionForm({
      question_text: "",
      question_type: "multiple_choice",
      points: 1,
      correct_answer: "",
      image_url: null,
    });
    setOptions([
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
    setMatchPairs([
      { left: "", right: "" },
      { left: "", right: "" },
    ]);
    setEditingQuestion(null);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      correct_answer: question.correct_answer || "",
      image_url: question.image_url,
    });
    
    if (question.question_type === "multiple_choice") {
      const questionOptions = allOptions?.filter((o) => o.question_id === question.id) || [];
      if (questionOptions.length > 0) {
        setOptions(questionOptions.map((o) => ({ text: o.option_text, is_correct: o.is_correct })));
      } else {
        setOptions([{ text: "", is_correct: false }, { text: "", is_correct: false }]);
      }
    } else if (question.question_type === "matching") {
      const opts = allOptions?.filter((o) => o.question_id === question.id) || [];
      if (opts.length > 0) {
        setMatchPairs(opts.map((o: any) => ({ left: o.option_text, right: o.match_text || "" })));
      }
    }

    setQuestionDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.question_text.trim() && !questionForm.image_url) {
      toast.error("يرجى إدخال نص السؤال أو إضافة صورة");
      return;
    }
    
    if (questionForm.question_type === "multiple_choice") {
      const validOptions = options.filter((o) => o.text.trim());
      if (validOptions.length < 2) {
        toast.error("يجب إضافة خيارين على الأقل");
        return;
      }
      if (!validOptions.some((o) => o.is_correct)) {
        toast.error("يجب تحديد إجابة صحيحة واحدة على الأقل");
        return;
      }
    } else if (questionForm.question_type === "true_false") {
      if (!questionForm.correct_answer.trim()) {
        toast.error("يرجى اختيار الإجابة الصحيحة");
        return;
      }
    } else if (questionForm.question_type === "matching") {
      const valid = matchPairs.filter((p) => p.left.trim() && p.right.trim());
      if (valid.length < 2) {
        toast.error("يجب إضافة زوجين على الأقل للتوصيل");
        return;
      }
    }
    // Note: fill_blank, short_answer, essay correct_answer is OPTIONAL (essay = manual grading)

    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionForm });
    } else {
      createQuestionMutation.mutate(questionForm);
    }
  };

  const addOption = () => {
    setOptions([...options, { text: "", is_correct: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: "text" | "is_correct", value: string | boolean) => {
    const newOptions = [...options];
    if (field === "is_correct" && value === true) {
      // For single choice, uncheck others
      newOptions.forEach((opt, i) => {
        opt.is_correct = i === index;
      });
    } else {
      (newOptions[index] as any)[field] = value;
    }
    setOptions(newOptions);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/quizzes")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              أسئلة الاختبار: {quiz?.title}
            </h1>
            <p className="text-muted-foreground">إدارة أسئلة الاختبار</p>
          </div>
          <div className="flex gap-2">
            <ExcelQuestionsUploader
              config={{ questionsTable: "quiz_questions", optionsTable: "question_options", parentField: "quiz_id", parentId: quizId! }}
              startOrderIndex={questions?.length ?? 0}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] })}
            />
            <Button onClick={() => { resetForm(); setQuestionDialogOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سؤال
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : questions && questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((question, idx) => {
              const questionOptions = allOptions?.filter((o) => o.question_id === question.id) || [];
              return (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-primary">س{idx + 1}.</span>
                          <span className="font-medium">{question.question_text}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {questionTypeLabels[question.question_type]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({question.points} نقطة)
                          </span>
                        </div>

                        {question.image_url && (
                          <img 
                            src={question.image_url} 
                            alt="صورة السؤال" 
                            className="mb-2 max-h-32 rounded-lg border object-contain"
                          />
                        )}
                        
                        {question.question_type === "multiple_choice" && questionOptions.length > 0 && (
                          <ul className="mr-6 space-y-1">
                            {questionOptions.map((opt) => (
                              <li key={opt.id} className="flex items-center gap-2 text-sm">
                                {opt.is_correct ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className={opt.is_correct ? "text-green-600 font-medium" : ""}>
                                  {opt.option_text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {question.question_type === "matching" && questionOptions.length > 0 && (
                          <ul className="mr-6 space-y-1 text-sm">
                            {questionOptions.map((opt: any) => (
                              <li key={opt.id} className="flex items-center gap-2">
                                <span>{opt.option_text}</span>
                                <span className="text-muted-foreground">↔</span>
                                <span className="text-primary">{opt.match_text}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {question.question_type === "essay" && (
                          <p className="mr-6 text-sm text-muted-foreground italic">سؤال مقالي - تصحيح يدوي</p>
                        )}
                        
                        {(question.question_type === "true_false" || question.question_type === "fill_blank") && (
                          <p className="mr-6 text-sm text-green-600">
                            الإجابة: {question.correct_answer}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditQuestion(question)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
                              deleteQuestionMutation.mutate(question.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد أسئلة
            </h3>
            <p className="text-muted-foreground mb-6">
              ابدأ بإضافة أسئلة للاختبار
            </p>
            <Button onClick={() => { resetForm(); setQuestionDialogOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سؤال
            </Button>
          </Card>
        )}

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={(open) => {
          setQuestionDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_type">نوع السؤال</Label>
                <Select
                  value={questionForm.question_type}
                  onValueChange={(value: QuestionType) => setQuestionForm({ ...questionForm, question_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">اختيار من متعدد</SelectItem>
                    <SelectItem value="true_false">صح أو خطأ</SelectItem>
                    <SelectItem value="fill_blank">أكمل الفراغ</SelectItem>
                    <SelectItem value="short_answer">إجابة قصيرة</SelectItem>
                    <SelectItem value="matching">توصيل</SelectItem>
                    <SelectItem value="essay">مقالي (تصحيح يدوي)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question_text">نص السؤال (اختياري)</Label>
                <Textarea
                  id="question_text"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="أدخل نص السؤال"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">عدد النقاط</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* Image Upload */}
              <QuestionImageUpload
                imageUrl={questionForm.image_url}
                onImageChange={(url) => setQuestionForm({ ...questionForm, image_url: url })}
              />

              {questionForm.question_type === "multiple_choice" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>الخيارات</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-3 w-3 ml-1" />
                      إضافة خيار
                    </Button>
                  </div>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={opt.is_correct ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => updateOption(idx, "is_correct", true)}
                      >
                        {opt.is_correct ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </Button>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(idx, "text", e.target.value)}
                        placeholder={`الخيار ${idx + 1}`}
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive"
                          onClick={() => removeOption(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">اضغط على الدائرة لتحديد الإجابة الصحيحة</p>
                </div>
              )}

              {questionForm.question_type === "true_false" && (
                <div className="space-y-2">
                  <Label>الإجابة الصحيحة</Label>
                  <Select
                    value={questionForm.correct_answer}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الإجابة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="صح">صح</SelectItem>
                      <SelectItem value="خطأ">خطأ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(questionForm.question_type === "fill_blank" || questionForm.question_type === "short_answer") && (
                <div className="space-y-2">
                  <Label htmlFor="correct_answer">الإجابة الصحيحة</Label>
                  <Input
                    id="correct_answer"
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    placeholder="أدخل الإجابة الصحيحة"
                  />
                </div>
              )}

              {questionForm.question_type === "matching" && (
                <MatchingPairsEditor pairs={matchPairs} onChange={setMatchPairs} />
              )}

              {questionForm.question_type === "essay" && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  سؤال مقالي — يُصحح يدوياً من المعلم/الأدمن من صفحة النتائج. لا توجد إجابة نموذجية مطلوبة.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  {editingQuestion ? "تحديث" : "إضافة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default QuizQuestionsPage;
