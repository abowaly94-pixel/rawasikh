import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileQuestion, Eye, EyeOff, ListChecks, Share2, GraduationCap, BookOpen } from "lucide-react";
import ExamShareDialog from "@/components/ExamShareDialog";
import { logActivity } from "@/lib/activityLogger";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  questions_count?: number;
}

interface CourseOpt { id: string; title: string }
interface LessonOpt { id: string; title: string; course_id: string | null; section_id: string }
interface QuizAssignmentInfo { id: string; course_id: string; lesson_id: string | null; section_id: string | null; quiz_type: "final" | "lesson" }

const NONE = "__none__";

const ManageQuizzesPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedQuizForShare, setSelectedQuizForShare] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    time_limit_minutes: 0,
    passing_score: 60,
    is_active: true,
    course_id: NONE as string,
    quiz_type: "lesson" as "final" | "lesson",
    lesson_id: NONE as string,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && !(userRole === "admin" || userRole === "teacher" || hasPermission("quizzes"))) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, hasPermission, navigate]);

  const { data: quizzes, isLoading } = useQuery({
    // Scoped by role: a teacher only ever gets their OWN quizzes back, so
    // this must be part of the cache key.
    queryKey: ["admin_quizzes", userRole, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("course_quizzes")
        .select(`
          *,
          quiz_questions(count)
        `)
        .order("created_at", { ascending: false });

      // Teachers manage only the quizzes they created. Without this filter,
      // the public "Anyone can view active quizzes" policy (required so
      // students can take quizzes) would let this query return every
      // active quiz on the platform, not just the teacher's own.
      if (userRole === "teacher") {
        query = query.eq("created_by", user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((q: any) => ({
        ...q,
        questions_count: q.quiz_questions?.[0]?.count || 0,
      })) as Quiz[];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher" || hasPermission("quizzes")),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin_quizzes_courses", userRole, user?.id],
    queryFn: async () => {
      let query = supabase.from("courses").select("id, title").order("title");
      // Same reasoning as the quizzes query above: a teacher should only be
      // able to assign a quiz to one of their OWN courses.
      if (userRole === "teacher") {
        query = query.eq("instructor_id", user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as CourseOpt[]) || [];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher" || hasPermission("quizzes")),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin_quizzes_lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, section_id, course_sections!inner(course_id)")
        .order("title");
      if (error) throw error;
      return ((data as any[]) || []).map((l) => ({
        id: l.id,
        title: l.title,
        section_id: l.section_id,
        course_id: l.course_sections?.course_id ?? null,
      })) as LessonOpt[];
    },
    enabled: userRole === "admin" || userRole === "teacher" || hasPermission("quizzes"),
  });

  // One assignment per quiz is the expected shape for this simple flow
  // (a quiz belongs to at most one course, as either its final exam or a
  // specific lesson's quiz).
  const { data: assignments = [] } = useQuery({
    queryKey: ["admin_quizzes_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quiz_assignments")
        .select("id, quiz_id, course_id, lesson_id, section_id, quiz_type");
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: userRole === "admin" || userRole === "teacher" || hasPermission("quizzes"),
  });

  const assignmentByQuizId = new Map<string, QuizAssignmentInfo & { quiz_id: string }>();
  assignments.forEach((a: any) => assignmentByQuizId.set(a.quiz_id, a));

  const filteredLessonsForForm = formData.course_id === NONE
    ? []
    : lessons.filter((l) => l.course_id === formData.course_id);

  // Creates/replaces the single course_quiz_assignments row for a quiz based
  // on the course/type/lesson chosen in the form. Deleting-then-inserting
  // keeps this simple since each quiz maps to at most one assignment here.
  const syncAssignment = async (quizId: string, data: typeof formData) => {
    await supabase.from("course_quiz_assignments").delete().eq("quiz_id", quizId);
    if (data.course_id === NONE) return;

    const lesson = data.quiz_type === "lesson" && data.lesson_id !== NONE
      ? lessons.find((l) => l.id === data.lesson_id)
      : undefined;

    const { error } = await supabase.from("course_quiz_assignments").insert({
      course_id: data.course_id,
      quiz_id: quizId,
      quiz_type: data.quiz_type,
      lesson_id: data.quiz_type === "lesson" ? (lesson?.id || null) : null,
      section_id: data.quiz_type === "lesson" ? (lesson?.section_id || null) : null,
      order_index: 0,
    });
    if (error) throw error;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: quizData, error } = await supabase.from("course_quizzes").insert({
        title: data.title,
        description: data.description || null,
        time_limit_minutes: data.time_limit_minutes || null,
        passing_score: data.passing_score,
        is_active: data.is_active,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      await syncAssignment(quizData.id, data);
      return quizData;
    },
    onSuccess: (quizData) => {
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes_assignments"] });
      toast.success("تم إنشاء الاختبار بنجاح");
      logActivity({ actionType: "quiz_created", description: `إنشاء كويز: ${quizData.title}`, entityType: "quiz", entityId: quizData.id });
      resetForm();
      setIsDialogOpen(false);
      navigate(`/dashboard/quizzes/${quizData.id}/questions`);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إنشاء الاختبار");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("course_quizzes")
        .update({
          title: data.title,
          description: data.description || null,
          time_limit_minutes: data.time_limit_minutes || null,
          passing_score: data.passing_score,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
      await syncAssignment(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes_assignments"] });
      toast.success("تم تحديث الاختبار بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الاختبار");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_quizzes"] });
      toast.success("تم حذف الاختبار بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف الاختبار");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      time_limit_minutes: 0,
      passing_score: 60,
      is_active: true,
      course_id: NONE,
      quiz_type: "lesson",
      lesson_id: NONE,
    });
    setEditingQuiz(null);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    const assignment = assignmentByQuizId.get(quiz.id);
    setFormData({
      title: quiz.title,
      description: quiz.description || "",
      time_limit_minutes: quiz.time_limit_minutes || 0,
      passing_score: quiz.passing_score,
      is_active: quiz.is_active,
      course_id: assignment?.course_id || NONE,
      quiz_type: assignment?.quiz_type || "lesson",
      lesson_id: assignment?.lesson_id || NONE,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان الاختبار");
      return;
    }
    if (formData.course_id !== NONE && formData.quiz_type === "lesson" && formData.lesson_id === NONE) {
      toast.error("اختر الدرس المرتبط بالاختبار، أو غيّر النوع لاختبار نهائي");
      return;
    }
    if (editingQuiz) {
      updateMutation.mutate({ id: editingQuiz.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الاختبارات</h1>
            <p className="text-muted-foreground mt-1">إنشاء وتعديل الاختبارات</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة اختبار
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuiz ? "تعديل الاختبار" : "إضافة اختبار جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الاختبار *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="أدخل عنوان الاختبار"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف الاختبار</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="أدخل وصف الاختبار"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-2">
                    <Label>الدورة التدريبية</Label>
                    <SearchableSelect
                      value={formData.course_id}
                      onValueChange={(v) => setFormData({ ...formData, course_id: v, lesson_id: NONE })}
                      options={[
                        { value: NONE, label: "— بدون (اختبار مستقل) —" },
                        ...courses.map((c) => ({ value: c.id, label: c.title })),
                      ]}
                      placeholder="اختر الدورة التدريبية"
                      searchPlaceholder="ابحث باسم الدورة التدريبية..."
                      emptyText="لا توجد دورات تدريبية مطابقة"
                    />
                  </div>

                  {formData.course_id !== NONE && (
                    <>
                      <div className="space-y-2">
                        <Label>نوع الاختبار</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={formData.quiz_type === "lesson" ? "default" : "outline"}
                            onClick={() => setFormData({ ...formData, quiz_type: "lesson" })}
                            className="gap-1.5"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            بعد محاضرة معيّنة
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={formData.quiz_type === "final" ? "default" : "outline"}
                            onClick={() => setFormData({ ...formData, quiz_type: "final", lesson_id: NONE })}
                            className="gap-1.5"
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            اختبار نهائي للدورة التدريبية
                          </Button>
                        </div>
                      </div>

                      {formData.quiz_type === "lesson" ? (
                        <div className="space-y-2">
                          <Label>المحاضرة *</Label>
                          <Select
                            value={formData.lesson_id}
                            onValueChange={(v) => setFormData({ ...formData, lesson_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المحاضرة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— اختر المحاضرة —</SelectItem>
                              {filteredLessonsForForm.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            الاختبار هيظهر للطالب بعد ما يخلّص المحاضرة دي، ولازم ينجح فيه عشان يكمل للي بعدها.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          الاختبار ده هيظهر للطالب كاختبار نهائي شامل بعد ما يخلّص كل محاضرات الدورة التدريبية.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time_limit">المدة (بالدقائق)</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      min="0"
                      value={formData.time_limit_minutes}
                      onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                      placeholder="0 = بدون حد"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passing_score">درجة النجاح (%)</Label>
                    <Input
                      id="passing_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.passing_score}
                      onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">مفعّل</Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingQuiz ? "تحديث" : "إنشاء"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : quizzes && quizzes.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاختبار</TableHead>
                    <TableHead className="text-right">مرتبط بـ</TableHead>
                    <TableHead className="text-right">عدد الأسئلة</TableHead>
                    <TableHead className="text-right">المدة</TableHead>
                    <TableHead className="text-right">درجة النجاح</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow 
                      key={quiz.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/quizzes/${quiz.id}/questions`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                            <FileQuestion className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{quiz.title}</p>
                            {quiz.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{quiz.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const assignment = assignmentByQuizId.get(quiz.id);
                          if (!assignment) {
                            return <Badge variant="outline">مستقل</Badge>;
                          }
                          const courseTitle = courses.find((c) => c.id === assignment.course_id)?.title || "—";
                          if (assignment.quiz_type === "final") {
                            return (
                              <Badge variant="outline" className="gap-1">
                                <GraduationCap className="h-3 w-3" />
                                نهائي: {courseTitle}
                              </Badge>
                            );
                          }
                          const lessonTitle = lessons.find((l) => l.id === assignment.lesson_id)?.title || "—";
                          return (
                            <Badge variant="outline" className="gap-1">
                              <BookOpen className="h-3 w-3" />
                              {courseTitle} — {lessonTitle}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{quiz.questions_count} سؤال</Badge>
                      </TableCell>
                      <TableCell>
                        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} دقيقة` : "بدون حد"}
                      </TableCell>
                      <TableCell>{quiz.passing_score}%</TableCell>
                      <TableCell>
                        {quiz.is_active ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            <Eye className="h-3 w-3 ml-1" />
                            مفعّل
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 ml-1" />
                            غير مفعّل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedQuizForShare(quiz);
                              setShareDialogOpen(true);
                            }}
                            title="مشاركة الاختبار"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/quizzes/${quiz.id}/questions`)}
                            title="إدارة الأسئلة"
                          >
                            <ListChecks className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(quiz)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا الاختبار؟")) {
                                deleteMutation.mutate(quiz.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد اختبارات
            </h3>
            <p className="text-muted-foreground mb-6">
              ابدأ بإنشاء أول اختبار
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة اختبار
            </Button>
          </Card>
        )}

        {/* Share Dialog */}
        {selectedQuizForShare && (
          <ExamShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            examId={selectedQuizForShare.id}
            examTitle={selectedQuizForShare.title}
            examType="quiz"
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageQuizzesPage;
