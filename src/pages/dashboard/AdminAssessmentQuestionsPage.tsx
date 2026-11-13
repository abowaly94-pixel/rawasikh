import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, ArrowRight, CheckCircle } from "lucide-react";
import ExcelQuestionsUploader from "@/components/ExcelQuestionsUploader";
import MatchingPairsEditor, { MatchPair } from "@/components/MatchingPairsEditor";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number | null;
  correct_answer: string | null;
  weakness_feedback: string | null;
  explanation: string | null;
  options?: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean | null;
  order_index: number | null;
  match_text?: string | null;
}

const AdminAssessmentQuestionsPage = () => {
  const { assessmentId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    question_text: "",
    question_type: "multiple_choice",
    points: 1,
    correct_answer: "",
    weakness_feedback: "",
    explanation: "",
  });
  const [options, setOptions] = useState([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);

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
    try {
      const { data: assessment } = await supabase
        .from("school_level_assessments")
        .select("title")
        .eq("id", assessmentId)
        .single();

      if (assessment) {
        setAssessmentTitle(assessment.title);
      }

      const { data: questionsData } = await supabase
        .from("school_assessment_questions")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("order_index");

      if (questionsData) {
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (question) => {
            const { data: optionsData } = await supabase
              .from("school_assessment_options")
              .select("*")
              .eq("question_id", question.id)
              .order("order_index");

            return { ...question, options: optionsData || [] };
          })
        );
        setQuestions(questionsWithOptions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: "",
      question_type: "multiple_choice",
      points: 1,
      correct_answer: "",
      weakness_feedback: "",
      explanation: "",
    });
    setOptions([
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
    setMatchPairs([
      { left: "", right: "" },
      { left: "", right: "" },
    ]);
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleSubmit = async () => {

    try {
      const questionData = {
        assessment_id: assessmentId,
        question_text: formData.question_text,
        question_type: formData.question_type,
        points: formData.points,
        correct_answer: formData.question_type === "true_false" ? formData.correct_answer : null,
        weakness_feedback: formData.weakness_feedback || null,
        explanation: formData.explanation || null,
        order_index: questions.length,
      };

      if (editingId) {
        const { error } = await supabase
          .from("school_assessment_questions")
          .update(questionData)
          .eq("id", editingId);

        if (error) throw error;

        // Delete old options first
        await supabase
          .from("school_assessment_options")
          .delete()
          .eq("question_id", editingId);

        if (formData.question_type === "multiple_choice") {
          const validOptions = options.filter((opt) => opt.text.trim());
          if (validOptions.length > 0) {
            const optionsToInsert = validOptions.map((opt, index) => ({
              question_id: editingId,
              option_text: opt.text,
              is_correct: opt.is_correct,
              order_index: index,
            }));

            await supabase.from("school_assessment_options").insert(optionsToInsert);
          }
        } else if (formData.question_type === "true_false") {
          // Auto-create "صح" and "خطأ" options for true/false questions
          const trueFalseOptions = [
            { question_id: editingId, option_text: "صح", is_correct: formData.correct_answer === "true", order_index: 0 },
            { question_id: editingId, option_text: "خطأ", is_correct: formData.correct_answer === "false", order_index: 1 },
          ];
          await supabase.from("school_assessment_options").insert(trueFalseOptions);
        } else if (formData.question_type === "matching") {
          const pairs = matchPairs
            .filter((p) => p.left.trim() && p.right.trim())
            .map((p, idx) => ({
              question_id: editingId,
              option_text: p.left,
              match_text: p.right,
              is_correct: true,
              order_index: idx,
            }));
          if (pairs.length > 0) {
            await (supabase as any).from("school_assessment_options").insert(pairs);
          }
        }

        toast({ title: "تم تعديل السؤال بنجاح" });
      } else {
        const { data: newQuestion, error } = await supabase
          .from("school_assessment_questions")
          .insert(questionData)
          .select()
          .single();

        if (error) throw error;

        if (newQuestion) {
          if (formData.question_type === "multiple_choice") {
            const validOptions = options.filter((opt) => opt.text.trim());
            if (validOptions.length > 0) {
              const optionsToInsert = validOptions.map((opt, index) => ({
                question_id: newQuestion.id,
                option_text: opt.text,
                is_correct: opt.is_correct,
                order_index: index,
              }));

              await supabase.from("school_assessment_options").insert(optionsToInsert);
            }
          } else if (formData.question_type === "true_false") {
            // Auto-create "صح" and "خطأ" options for true/false questions
            const trueFalseOptions = [
              { question_id: newQuestion.id, option_text: "صح", is_correct: formData.correct_answer === "true", order_index: 0 },
              { question_id: newQuestion.id, option_text: "خطأ", is_correct: formData.correct_answer === "false", order_index: 1 },
            ];
            await supabase.from("school_assessment_options").insert(trueFalseOptions);
          } else if (formData.question_type === "matching") {
            const pairs = matchPairs
              .filter((p) => p.left.trim() && p.right.trim())
              .map((p, idx) => ({
                question_id: newQuestion.id,
                option_text: p.left,
                match_text: p.right,
                is_correct: true,
                order_index: idx,
              }));
            if (pairs.length > 0) {
              await (supabase as any).from("school_assessment_options").insert(pairs);
            }
          }
        }

        toast({ title: "تم إضافة السؤال بنجاح" });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (question: Question) => {
    let correctAnswer = question.correct_answer || "";
    
    // For true_false questions, derive correct_answer from options if not set
    if (question.question_type === "true_false" && question.options) {
      const correctOption = question.options.find((opt) => opt.is_correct);
      if (correctOption) {
        correctAnswer = correctOption.option_text === "صح" ? "true" : "false";
      }
    }

    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      correct_answer: correctAnswer,
      weakness_feedback: question.weakness_feedback || "",
      explanation: question.explanation || "",
    });

    if (question.options && question.options.length > 0 && question.question_type === "multiple_choice") {
      const opts = question.options.map((opt) => ({
        text: opt.option_text,
        is_correct: opt.is_correct || false,
      }));
      while (opts.length < 4) {
        opts.push({ text: "", is_correct: false });
      }
      setOptions(opts);
    } else if (question.question_type === "matching" && question.options) {
      const pairs = question.options.map((o) => ({ left: o.option_text, right: o.match_text || "" }));
      setMatchPairs(pairs.length > 0 ? pairs : [{ left: "", right: "" }, { left: "", right: "" }]);
    }

    setEditingId(question.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;

    try {
      await supabase.from("school_assessment_options").delete().eq("question_id", id);
      const { error } = await supabase.from("school_assessment_questions").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف السؤال" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const setCorrectOption = (index: number) => {
    setOptions(options.map((opt, i) => ({ ...opt, is_correct: i === index })));
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/level-assessments")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">أسئلة الاختبار</h1>
              <p className="text-muted-foreground">{assessmentTitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
          <ExcelQuestionsUploader
            config={{ questionsTable: "school_assessment_questions", optionsTable: "school_assessment_options", parentField: "assessment_id", parentId: assessmentId! }}
            startOrderIndex={questions.length}
            onSuccess={fetchData}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة سؤال
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل سؤال" : "إضافة سؤال جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>نص السؤال (اختياري)</Label>
                  <Input
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="اكتب نص السؤال"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع السؤال</Label>
                    <Select
                      value={formData.question_type}
                      onValueChange={(value) => setFormData({ ...formData, question_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">اختيار من متعدد</SelectItem>
                        <SelectItem value="true_false">صح وخطأ</SelectItem>
                        <SelectItem value="matching">توصيل</SelectItem>
                        <SelectItem value="essay">مقالي (تصحيح يدوي)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الدرجة</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {formData.question_type === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>الخيارات (اختر الإجابة الصحيحة)</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={option.is_correct ? "default" : "outline"}
                          size="icon"
                          onClick={() => setCorrectOption(index)}
                          className="shrink-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Input
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...options];
                            newOptions[index].text = e.target.value;
                            setOptions(newOptions);
                          }}
                          placeholder={`الخيار ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {formData.question_type === "true_false" && (
                  <div className="space-y-2">
                    <Label>الإجابة الصحيحة</Label>
                    <Select
                      value={formData.correct_answer}
                      onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الإجابة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">صح</SelectItem>
                        <SelectItem value="false">خطأ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.question_type === "matching" && (
                  <MatchingPairsEditor pairs={matchPairs} onChange={setMatchPairs} />
                )}

                <div className="space-y-2">
                  <Label>السلبية (تظهر إذا أجاب الطالب خطأ)</Label>
                  <Input
                    value={formData.weakness_feedback}
                    onChange={(e) => setFormData({ ...formData, weakness_feedback: e.target.value })}
                    placeholder="مثال: الطالب يحتاج تحسين مهارات القراءة"
                  />
                  <p className="text-xs text-muted-foreground">
                    هذا التعليق سيظهر في تقرير نتيجة الطالب إذا أجاب خطأ
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>شرح الإجابة (يظهر للطالب بعد الانتهاء)</Label>
                  <Input
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="اكتب شرح للإجابة الصحيحة"
                  />
                  <p className="text-xs text-muted-foreground">
                    يظهر للطالب بعد إنهاء الاختبار سواء أجاب صح أو خطأ
                  </p>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingId ? "حفظ التعديلات" : "إضافة السؤال"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الأسئلة ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد أسئلة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>السؤال</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead className="w-[100px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question, index) => (
                    <TableRow key={question.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{question.question_text}</p>
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {question.options.map((opt) => (
                              <Badge
                                key={opt.id}
                                variant={opt.is_correct ? "default" : "outline"}
                                className="text-xs"
                              >
                                {opt.option_text}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {question.question_type === "multiple_choice" ? "اختيار من متعدد" : "صح وخطأ"}
                      </TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(question)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssessmentQuestionsPage;
