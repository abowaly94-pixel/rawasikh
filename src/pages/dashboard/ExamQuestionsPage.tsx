import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowRight, GripVertical, CheckCircle2, Share2 } from "lucide-react";
import QuestionImageUpload from "@/components/QuestionImageUpload";
import ExamShareDialog from "@/components/ExamShareDialog";
import ExcelQuestionsUploader from "@/components/ExcelQuestionsUploader";

interface Exam {
  id: string;
  title: string;
  max_score: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer: string | null;
  points: number;
  order_index: number;
  image_url: string | null;
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح أو خطأ",
  fill_blank: "ملء الفراغات",
  short_answer: "إجابة قصيرة",
};

const ExamQuestionsPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [formData, setFormData] = useState({
    question_text: "",
    question_type: "multiple_choice",
    correct_answer: "",
    points: 1,
    image_url: null as string | null,
  });

  const [formOptions, setFormOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard");
    } else {
      fetchData();
    }
  }, [user, userRole, authLoading, navigate, examId]);

  const fetchData = async () => {
    try {
      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("id, title, max_score")
        .eq("id", examId)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) {
        toast({ title: "الاختبار غير موجود", variant: "destructive" });
        navigate("/dashboard/evaluation-exams");
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

        const grouped: Record<string, Option[]> = {};
        (optionsData || []).forEach(opt => {
          if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
          grouped[opt.question_id].push(opt);
        });
        setOptions(grouped);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.question_text.trim() && !formData.image_url) {
      toast({ title: "يرجى إدخال نص السؤال أو إضافة صورة", variant: "destructive" });
      return;
    }

    try {
      const questionData = {
        exam_id: examId,
        question_text: formData.question_text,
        question_type: formData.question_type,
        correct_answer: formData.question_type === "fill_blank" || formData.question_type === "short_answer" 
          ? formData.correct_answer 
          : null,
        points: formData.points,
        order_index: editingQuestion?.order_index ?? questions.length,
        image_url: formData.image_url,
      };

      let questionId = editingQuestion?.id;

      if (editingQuestion) {
        const { error } = await supabase
          .from("exam_questions")
          .update(questionData)
          .eq("id", editingQuestion.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("exam_questions")
          .insert(questionData)
          .select()
          .single();
        if (error) throw error;
        questionId = data.id;
      }

      // Handle options for multiple choice and true/false
      if (formData.question_type === "multiple_choice" || formData.question_type === "true_false") {
        // Delete existing options if editing
        if (editingQuestion) {
          await supabase
            .from("exam_question_options")
            .delete()
            .eq("question_id", editingQuestion.id);
        }

        // Insert new options
        const validOptions = formOptions.filter(opt => opt.text.trim());
        if (validOptions.length > 0) {
          const optionsToInsert = validOptions.map((opt, idx) => ({
            question_id: questionId,
            option_text: opt.text,
            is_correct: opt.is_correct,
            order_index: idx,
          }));

          const { error: optionsError } = await supabase
            .from("exam_question_options")
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      toast({ title: editingQuestion ? "تم تحديث السؤال" : "تم إضافة السؤال" });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving question:", error);
      toast({ title: "خطأ في حفظ السؤال", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;

    try {
      const { error } = await supabase
        .from("exam_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف السؤال" });
      fetchData();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({ title: "خطأ في حذف السؤال", variant: "destructive" });
    }
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      correct_answer: question.correct_answer || "",
      points: question.points,
      image_url: question.image_url,
    });

    // Load options
    const questionOptions = options[question.id] || [];
    if (question.question_type === "true_false") {
      // For true/false, ensure we have the correct format
      if (questionOptions.length >= 2) {
        setFormOptions(
          questionOptions.map(opt => ({ text: opt.option_text, is_correct: opt.is_correct }))
        );
      } else {
        setFormOptions([
          { text: "صح", is_correct: true },
          { text: "خطأ", is_correct: false },
        ]);
      }
    } else if (questionOptions.length > 0) {
      setFormOptions(
        questionOptions.map(opt => ({ text: opt.option_text, is_correct: opt.is_correct }))
      );
    } else {
      setFormOptions([
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ]);
    }

    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      question_text: "",
      question_type: "multiple_choice",
      correct_answer: "",
      points: 1,
      image_url: null,
    });
    setFormOptions([
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
  };

  const handleOptionChange = (index: number, field: "text" | "is_correct", value: string | boolean) => {
    setFormOptions(prev => {
      const updated = [...prev];
      if (field === "is_correct" && value === true) {
        // Only one correct answer for multiple choice
        updated.forEach((opt, i) => {
          opt.is_correct = i === index;
        });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addOption = () => {
    setFormOptions(prev => [...prev, { text: "", is_correct: false }]);
  };

  const removeOption = (index: number) => {
    if (formOptions.length > 2) {
      setFormOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Link to="/dashboard/evaluation-exams" className="hover:text-primary transition-colors">
            اختبارات التقييم
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{exam?.title}</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">أسئلة الاختبار</h1>
            <p className="text-muted-foreground">
              {questions.length} سؤال - مجموع النقاط: {totalPoints}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
            <ExcelQuestionsUploader
              config={{ questionsTable: "exam_questions", optionsTable: "exam_question_options", parentField: "exam_id", parentId: examId! }}
              startOrderIndex={questions.length}
              onSuccess={fetchData}
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة سؤال
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>نص السؤال (اختياري)</Label>
                  <Textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع السؤال</Label>
                    <Select
                      value={formData.question_type}
                      onValueChange={(value) => {
                        setFormData({ ...formData, question_type: value });
                        // Auto-set options for true/false
                        if (value === "true_false") {
                          setFormOptions([
                            { text: "صح", is_correct: true },
                            { text: "خطأ", is_correct: false },
                          ]);
                        } else if (value === "multiple_choice" && formOptions.length === 2 && formOptions[0].text === "صح") {
                          // Reset to 4 empty options when switching from true/false to multiple choice
                          setFormOptions([
                            { text: "", is_correct: false },
                            { text: "", is_correct: false },
                            { text: "", is_correct: false },
                            { text: "", is_correct: false },
                          ]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(questionTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>النقاط</Label>
                    <Input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                      min={1}
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <QuestionImageUpload
                  imageUrl={formData.image_url}
                  onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                />

                {/* Options for multiple choice */}
                {formData.question_type === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>الخيارات</Label>
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox
                          checked={opt.is_correct}
                          onCheckedChange={(checked) => handleOptionChange(idx, "is_correct", checked as boolean)}
                        />
                        <Input
                          value={opt.text}
                          onChange={(e) => handleOptionChange(idx, "text", e.target.value)}
                          placeholder={`الخيار ${idx + 1}`}
                          className="flex-1"
                        />
                        {formOptions.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة خيار
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      حدد الإجابة الصحيحة بالضغط على المربع
                    </p>
                  </div>
                )}

                {/* Options for true/false - simplified UI */}
                {formData.question_type === "true_false" && (
                  <div className="space-y-3">
                    <Label>الإجابة الصحيحة</Label>
                    <div className="flex gap-4">
                      <div 
                        className={`flex-1 p-4 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                          formOptions[0]?.is_correct 
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setFormOptions([
                          { text: "صح", is_correct: true },
                          { text: "خطأ", is_correct: false },
                        ])}
                      >
                        <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${formOptions[0]?.is_correct ? "text-green-500" : "text-muted-foreground"}`} />
                        <span className="font-medium">صح</span>
                      </div>
                      <div 
                        className={`flex-1 p-4 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                          formOptions[1]?.is_correct 
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20" 
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setFormOptions([
                          { text: "صح", is_correct: false },
                          { text: "خطأ", is_correct: true },
                        ])}
                      >
                        <Trash2 className={`h-8 w-8 mx-auto mb-2 ${formOptions[1]?.is_correct ? "text-red-500" : "text-muted-foreground"}`} />
                        <span className="font-medium">خطأ</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Correct answer for fill blank / short answer */}
                {(formData.question_type === "fill_blank" || formData.question_type === "short_answer") && (
                  <div className="space-y-2">
                    <Label>الإجابة الصحيحة</Label>
                    <Input
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      placeholder="اكتب الإجابة الصحيحة"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>
                  {editingQuestion ? "تحديث" : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">لا توجد أسئلة بعد</p>
                <p className="text-sm text-muted-foreground">ابدأ بإضافة سؤال جديد</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, idx) => (
              <Card key={question.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{question.question_text}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {questionTypeLabels[question.question_type]}
                          </Badge>
                          <span>{question.points} نقطة</span>
                        </CardDescription>
                        {question.image_url && (
                          <img 
                            src={question.image_url} 
                            alt="صورة السؤال" 
                            className="mt-2 max-h-32 rounded-lg border object-contain"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(question.question_type === "multiple_choice" || question.question_type === "true_false") && (
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {(options[question.id] || []).map((opt) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                            opt.is_correct ? "bg-green-100 text-green-800" : "bg-muted"
                          }`}
                        >
                          {opt.is_correct && <CheckCircle2 className="h-4 w-4" />}
                          {opt.option_text}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {(question.question_type === "fill_blank" || question.question_type === "short_answer") && question.correct_answer && (
                  <CardContent>
                    <div className="bg-green-100 text-green-800 p-2 rounded-lg text-sm">
                      <span className="font-medium">الإجابة الصحيحة:</span> {question.correct_answer}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {exam && (
        <ExamShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          examId={exam.id}
          examTitle={exam.title}
          examType="evaluation"
        />
      )}
    </DashboardLayout>
  );
};

export default ExamQuestionsPage;
