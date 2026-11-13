import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, ArrowRight, GripVertical } from "lucide-react";
import QuestionImageUpload from "@/components/QuestionImageUpload";
import ExcelQuestionsUploader from "@/components/ExcelQuestionsUploader";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  image_url: string | null;
  options: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

const SchoolAssessmentQuestionsPage = () => {
  const { assessmentId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [points, setPoints] = useState(1);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school" && assessmentId) {
      fetchData();
    }
  }, [user, userRole, assessmentId]);

  const fetchData = async () => {
    try {
      // Get assessment info
      const { data: assessment } = await supabase
        .from("school_level_assessments")
        .select("title")
        .eq("id", assessmentId)
        .single();

      if (assessment) {
        setAssessmentTitle(assessment.title);
      }

      // Fetch questions with options
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

            return {
              ...question,
              options: optionsData || [],
            };
          })
        );
        setQuestions(questionsWithOptions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("multiple_choice");
    setPoints(1);
    setQuestionImageUrl(null);
    setOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setTrueFalseAnswer(null);
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!questionText.trim() && !questionImageUrl) {
      toast({ title: "يرجى إدخال نص السؤال أو إضافة صورة", variant: "destructive" });
      return;
    }

    try {
      const orderIndex = editingId ? undefined : questions.length + 1;

      if (editingId) {
        // Update question
        const { error: questionError } = await supabase
          .from("school_assessment_questions")
          .update({
            question_text: questionText,
            question_type: questionType,
            points,
            correct_answer: questionType === "true_false" ? (trueFalseAnswer ? "true" : "false") : null,
            image_url: questionImageUrl,
          })
          .eq("id", editingId);

        if (questionError) throw questionError;

        // Delete existing options and recreate
        await supabase
          .from("school_assessment_options")
          .delete()
          .eq("question_id", editingId);

        if (questionType === "multiple_choice") {
          const validOptions = options.filter((o) => o.text.trim());
          if (validOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from("school_assessment_options")
              .insert(
                validOptions.map((o, idx) => ({
                  question_id: editingId,
                  option_text: o.text,
                  is_correct: o.isCorrect,
                  order_index: idx + 1,
                }))
              );
            if (optionsError) throw optionsError;
          }
        } else if (questionType === "true_false") {
          const { error: optionsError } = await supabase
            .from("school_assessment_options")
            .insert([
              { question_id: editingId, option_text: "صح", is_correct: trueFalseAnswer === true, order_index: 1 },
              { question_id: editingId, option_text: "خطأ", is_correct: trueFalseAnswer === false, order_index: 2 },
            ]);
          if (optionsError) throw optionsError;
        }

        toast({ title: "تم تعديل السؤال بنجاح" });
      } else {
        // Create new question
        const { data: newQuestion, error: questionError } = await supabase
          .from("school_assessment_questions")
          .insert({
            assessment_id: assessmentId,
            question_text: questionText,
            question_type: questionType,
            points,
            order_index: orderIndex,
            correct_answer: questionType === "true_false" ? (trueFalseAnswer ? "true" : "false") : null,
            image_url: questionImageUrl,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        if (questionType === "multiple_choice") {
          const validOptions = options.filter((o) => o.text.trim());
          if (validOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from("school_assessment_options")
              .insert(
                validOptions.map((o, idx) => ({
                  question_id: newQuestion.id,
                  option_text: o.text,
                  is_correct: o.isCorrect,
                  order_index: idx + 1,
                }))
              );
            if (optionsError) throw optionsError;
          }
        } else if (questionType === "true_false") {
          const { error: optionsError } = await supabase
            .from("school_assessment_options")
            .insert([
              { question_id: newQuestion.id, option_text: "صح", is_correct: trueFalseAnswer === true, order_index: 1 },
              { question_id: newQuestion.id, option_text: "خطأ", is_correct: trueFalseAnswer === false, order_index: 2 },
            ]);
          if (optionsError) throw optionsError;
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
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setPoints(question.points);
    setQuestionImageUrl(question.image_url);

    if (question.question_type === "multiple_choice") {
      const opts = question.options.map((o) => ({
        text: o.option_text,
        isCorrect: o.is_correct,
      }));
      while (opts.length < 4) {
        opts.push({ text: "", isCorrect: false });
      }
      setOptions(opts);
    } else if (question.question_type === "true_false") {
      const correctOption = question.options.find((o) => o.is_correct);
      setTrueFalseAnswer(correctOption?.option_text === "صح");
    }

    setEditingId(question.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;

    try {
      const { error } = await supabase
        .from("school_assessment_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف السؤال" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const newOptions = [...options];
    if (field === "text") {
      newOptions[index].text = value as string;
    } else {
      // For single correct answer, uncheck others
      newOptions.forEach((o, i) => {
        o.isCorrect = i === index ? (value as boolean) : false;
      });
    }
    setOptions(newOptions);
  };

  const getQuestionTypeName = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "اختيار من متعدد";
      case "true_false":
        return "صح/خطأ";
      default:
        return type;
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/school/assessments")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-bold">أسئلة الاختبار</h1>
            <p className="text-muted-foreground">{assessmentTitle}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
                  <Textarea
                    placeholder="اكتب السؤال هنا..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع السؤال</Label>
                    <Select value={questionType} onValueChange={setQuestionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">اختيار من متعدد</SelectItem>
                        <SelectItem value="true_false">صح/خطأ</SelectItem>
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
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <QuestionImageUpload
                  imageUrl={questionImageUrl}
                  onImageChange={setQuestionImageUrl}
                />

                {questionType === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>الخيارات (حدد الإجابة الصحيحة)</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => updateOption(index, "isCorrect", checked as boolean)}
                        />
                        <Input
                          placeholder={`الخيار ${index + 1}`}
                          value={option.text}
                          onChange={(e) => updateOption(index, "text", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {questionType === "true_false" && (
                  <div className="space-y-2">
                    <Label>الإجابة الصحيحة</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={trueFalseAnswer === true ? "default" : "outline"}
                        onClick={() => setTrueFalseAnswer(true)}
                      >
                        صح
                      </Button>
                      <Button
                        type="button"
                        variant={trueFalseAnswer === false ? "default" : "outline"}
                        onClick={() => setTrueFalseAnswer(false)}
                      >
                        خطأ
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmit} className="w-full" disabled={!questionText.trim() && !questionImageUrl}>
                  {editingId ? "حفظ التعديلات" : "إضافة السؤال"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد أسئلة. أضف سؤالاً جديداً للبدء.
              </CardContent>
            </Card>
          ) : (
            questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{question.question_text}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getQuestionTypeName(question.question_type)} • {question.points} درجة
                        </p>
                        {question.image_url && (
                          <img 
                            src={question.image_url} 
                            alt="صورة السؤال" 
                            className="mt-2 max-h-24 rounded-lg border object-contain"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(question)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option) => (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border ${
                          option.is_correct
                            ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
                            : "bg-muted/50"
                        }`}
                      >
                        {option.option_text}
                        {option.is_correct && (
                          <span className="mr-2 text-green-600 text-sm">(✓)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </SchoolLayout>
  );
};

export default SchoolAssessmentQuestionsPage;
