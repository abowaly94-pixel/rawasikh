import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Eye, Share2, FileText, TrendingUp, Award, BookOpen, Edit, Trash2, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  student_number: string;
  user_id: string;
  class_id: string;
  status: string;
  profile?: {
    full_name: string;
    email: string;
  };
  class?: {
    name: string;
  };
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total_points: number;
  passed: boolean;
  completed_at: string;
  quiz?: {
    title: string;
  };
}

interface Grade {
  id: string;
  score: number;
  exam?: {
    title: string;
    exam_type: string;
    max_score: number;
  };
}

interface PerformanceNote {
  id: string;
  student_id: string;
  note: string;
  recommendation: string;
  shared_with_parent: boolean;
  created_at: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const examTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  midterm: "منتصف الفصل",
  final: "نهائي",
  assignment: "واجب",
  project: "مشروع",
  evaluation: "تقييم مستوى",
};

const PerformanceEvaluationPage = () => {
  const { userRole, profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentQuizAttempts, setStudentQuizAttempts] = useState<QuizAttempt[]>([]);
  const [studentGrades, setStudentGrades] = useState<Grade[]>([]);
  const [performanceNotes, setPerformanceNotes] = useState<PerformanceNote[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newRecommendation, setNewRecommendation] = useState("");
  const [shareWithParent, setShareWithParent] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [userRole, user]);

  const fetchClasses = async () => {
    try {
      let query = supabase.from("classes").select("id, name");
      
      if (userRole === "teacher" && user) {
        query = query.eq("teacher_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("students")
        .select(`
          id,
          student_number,
          user_id,
          class_id,
          status,
          profiles!fk_students_user_id (full_name, email),
          classes!fk_students_class_id (name)
        `)
        .eq("status", "active");

      // If teacher, only show students in their classes
      if (userRole === "teacher" && user) {
        const { data: teacherClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("teacher_id", user.id);

        if (teacherClasses && teacherClasses.length > 0) {
          const classIds = teacherClasses.map((c) => c.id);
          query = query.in("class_id", classIds);
        } else {
          setStudents([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedStudents = (data || []).map((s: any) => ({
        id: s.id,
        student_number: s.student_number,
        user_id: s.user_id,
        class_id: s.class_id,
        status: s.status,
        profile: s.profiles,
        class: s.classes,
      }));

      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("حدث خطأ في تحميل بيانات الطلاب");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);

    try {
      // Fetch quiz attempts
      if (student.user_id) {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            quiz_id,
            score,
            total_points,
            passed,
            completed_at,
            course_quizzes:quiz_id (title)
          `)
          .eq("user_id", student.user_id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false });

        setStudentQuizAttempts(
          (attempts || []).map((a: any) => ({
            ...a,
            quiz: a.course_quizzes,
          }))
        );
      }

      // Fetch grades
      const { data: grades } = await supabase
        .from("grades")
        .select(`
          id,
          score,
          exams!fk_grades_exam_id (title, exam_type, max_score)
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      setStudentGrades(
        (grades || []).map((g: any) => ({
          ...g,
          exam: g.exams,
        }))
      );

      // Fetch performance notes
      const { data: notes } = await supabase
        .from("student_performance_notes")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      setPerformanceNotes(notes || []);
    } catch (error) {
      console.error("Error fetching student details:", error);
      toast.error("حدث خطأ في تحميل تفاصيل الطالب");
    }
  };

  const calculateOverallPerformance = (student: Student) => {
    // This is a simplified calculation
    // You can make it more sophisticated based on your needs
    const gradeCount = studentGrades.length;
    const quizCount = studentQuizAttempts.length;
    
    if (gradeCount === 0 && quizCount === 0) return null;

    let totalPercentage = 0;
    let count = 0;

    studentGrades.forEach((g) => {
      if (g.exam?.max_score) {
        totalPercentage += (g.score / g.exam.max_score) * 100;
        count++;
      }
    });

    studentQuizAttempts.forEach((a) => {
      if (a.total_points) {
        totalPercentage += (a.score / a.total_points) * 100;
        count++;
      }
    });

    return count > 0 ? Math.round(totalPercentage / count) : null;
  };

  const getPerformanceLevel = (percentage: number | null) => {
    if (percentage === null) return { label: "غير متوفر", color: "secondary" as const };
    if (percentage >= 90) return { label: "ممتاز", color: "default" as const };
    if (percentage >= 80) return { label: "جيد جداً", color: "default" as const };
    if (percentage >= 70) return { label: "جيد", color: "secondary" as const };
    if (percentage >= 60) return { label: "مقبول", color: "outline" as const };
    return { label: "ضعيف", color: "destructive" as const };
  };

  const handleAddNote = async () => {
    if (!selectedStudent || !newNote.trim() || !user) return;

    try {
      const { error } = await supabase.from("student_performance_notes").insert({
        student_id: selectedStudent.id,
        teacher_id: user.id,
        note: newNote,
        recommendation: newRecommendation,
        shared_with_parent: shareWithParent,
      });

      if (error) throw error;

      toast.success("تم إضافة الملاحظة بنجاح");
      setNoteDialogOpen(false);
      setNewNote("");
      setNewRecommendation("");
      setShareWithParent(false);

      // Refresh notes
      const { data: notes } = await supabase
        .from("student_performance_notes")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false });

      setPerformanceNotes(notes || []);
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("حدث خطأ في إضافة الملاحظة");
    }
  };

  const handleToggleShare = async (noteId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("student_performance_notes")
        .update({ shared_with_parent: !currentValue })
        .eq("id", noteId);

      if (error) throw error;

      setPerformanceNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, shared_with_parent: !currentValue } : n
        )
      );

      toast.success(
        currentValue ? "تم إلغاء المشاركة مع ولي الأمر" : "تم مشاركة الملاحظة مع ولي الأمر"
      );
    } catch (error) {
      console.error("Error toggling share:", error);
      toast.error("حدث خطأ");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;

    try {
      const { error } = await supabase
        .from("student_performance_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setPerformanceNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("تم حذف الملاحظة");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("حدث خطأ في حذف الملاحظة");
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass =
      filterClass === "all" || student.class_id === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">تقييم الأداء</h1>
            <p className="text-muted-foreground">
              متابعة وتقييم أداء الطلاب في الاختبارات والدورات التدريبية
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الفصول</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط الأداء</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">اختبارات التقييم</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الطالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="جميع الفصول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلاب</CardTitle>
            <CardDescription>
              اضغط على "عرض التفاصيل" لرؤية أداء الطالب الكامل
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد طلاب
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطالب</TableHead>
                    <TableHead>رقم الطالب</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.profile?.full_name || "غير محدد"}
                      </TableCell>
                      <TableCell>{student.student_number || "-"}</TableCell>
                      <TableCell>{student.class?.name || "غير مسجل"}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status === "active" ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudentDetails(student)}
                        >
                          <Eye className="h-4 w-4 ml-2" />
                          عرض التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Student Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                تقييم أداء الطالب: {selectedStudent?.profile?.full_name}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="quizzes" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="quizzes">اختبارات الدورات التدريبية</TabsTrigger>
                <TabsTrigger value="exams">اختبارات التقييم</TabsTrigger>
                <TabsTrigger value="notes">الملاحظات والتوصيات</TabsTrigger>
              </TabsList>

              <TabsContent value="quizzes" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">عدد الاختبارات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{studentQuizAttempts.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">نسبة النجاح</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {studentQuizAttempts.length > 0
                          ? Math.round(
                              (studentQuizAttempts.filter((a) => a.passed).length /
                                studentQuizAttempts.length) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {studentQuizAttempts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد اختبارات مكتملة
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاختبار</TableHead>
                        <TableHead>الدرجة</TableHead>
                        <TableHead>النتيجة</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentQuizAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell>{attempt.quiz?.title || "اختبار"}</TableCell>
                          <TableCell>
                            {attempt.score} / {attempt.total_points}
                          </TableCell>
                          <TableCell>
                            <Badge variant={attempt.passed ? "default" : "destructive"}>
                              {attempt.passed ? "ناجح" : "راسب"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(attempt.completed_at).toLocaleDateString("ar-EG")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="exams" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">اختبارات التقييم</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {studentGrades.filter((g) => g.exam?.exam_type === "evaluation").length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">إجمالي الاختبارات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{studentGrades.length}</div>
                    </CardContent>
                  </Card>
                </div>

                {studentGrades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد درجات مسجلة
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاختبار</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الدرجة</TableHead>
                        <TableHead>النسبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentGrades.map((grade) => {
                        const percentage = grade.exam?.max_score
                          ? Math.round((grade.score / grade.exam.max_score) * 100)
                          : 0;
                        return (
                          <TableRow key={grade.id}>
                            <TableCell>{grade.exam?.title || "اختبار"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {examTypeLabels[grade.exam?.exam_type || "quiz"]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {grade.score} / {grade.exam?.max_score || 100}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={percentage} className="w-20" />
                                <span>{percentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة ملاحظة
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة ملاحظة جديدة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>الملاحظة</Label>
                          <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="اكتب ملاحظتك هنا..."
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>التوصيات</Label>
                          <Textarea
                            value={newRecommendation}
                            onChange={(e) => setNewRecommendation(e.target.value)}
                            placeholder="اكتب التوصيات والدورات التدريبية المقترحة..."
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="share-parent"
                            checked={shareWithParent}
                            onCheckedChange={setShareWithParent}
                          />
                          <Label htmlFor="share-parent">مشاركة مع ولي الأمر</Label>
                        </div>
                        <Button onClick={handleAddNote} className="w-full">
                          حفظ الملاحظة
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {performanceNotes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد ملاحظات
                  </p>
                ) : (
                  <div className="space-y-4">
                    {performanceNotes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(note.created_at).toLocaleDateString("ar-EG")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleShare(note.id, note.shared_with_parent)}
                              >
                                <Share2
                                  className={`h-4 w-4 ${
                                    note.shared_with_parent ? "text-primary" : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="mb-2">{note.note}</p>
                          {note.recommendation && (
                            <div className="bg-muted p-3 rounded-lg mt-2">
                              <p className="text-sm font-medium mb-1">التوصيات:</p>
                              <p className="text-sm text-muted-foreground">{note.recommendation}</p>
                            </div>
                          )}
                          {note.shared_with_parent && (
                            <Badge variant="outline" className="mt-2">
                              <Share2 className="h-3 w-3 ml-1" />
                              مشاركة مع ولي الأمر
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PerformanceEvaluationPage;
