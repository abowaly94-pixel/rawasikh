import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, FileText, Award, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type ExamType = "quiz" | "midterm" | "final" | "assignment" | "project" | "evaluation";

interface Exam {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  exam_type: ExamType;
  max_score: number;
  exam_date: string;
  class_name?: string;
}

interface Grade {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  notes: string | null;
  student_name?: string;
  student_number?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface Student {
  id: string;
  user_id: string | null;
  student_number: string | null;
  profile?: { full_name: string };
}

const examTypeLabels: Record<ExamType, string> = {
  quiz: "اختبار قصير",
  midterm: "اختبار نصفي",
  final: "اختبار نهائي",
  assignment: "واجب",
  project: "مشروع",
  evaluation: "تقييم مستوى",
};

const examTypeBadgeVariants: Record<ExamType, "default" | "secondary" | "destructive" | "outline"> = {
  quiz: "outline",
  midterm: "secondary",
  final: "destructive",
  assignment: "default",
  project: "default",
  evaluation: "secondary",
};

export default function GradesPage() {
  const { user, userRole, profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterExamType, setFilterExamType] = useState<string>("all");
  
  // Exam dialog state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState({
    class_id: "",
    title: "",
    description: "",
    exam_type: "quiz" as ExamType,
    max_score: "100",
    exam_date: format(new Date(), "yyyy-MM-dd"),
  });

  // Grades dialog state
  const [gradesDialogOpen, setGradesDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; notes: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchClasses(), fetchExams()]);
    setLoading(false);
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");
    
    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }
    setClasses(data || []);
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select(`
        *,
        classes!fk_exams_class_id (name)
      `)
      .order("exam_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching exams:", error);
      return;
    }
    
    const formattedExams = (data || []).map(exam => ({
      ...exam,
      class_name: (exam.classes as { name: string } | null)?.name || "غير محدد",
    }));
    setExams(formattedExams);
  };

  const fetchStudentsForClass = async (classId: string) => {
    // First get students
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id, student_number")
      .eq("class_id", classId)
      .eq("status", "active");
    
    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return;
    }

    // Then get profiles for those students
    const userIds = (studentsData || []).map(s => s.user_id).filter(Boolean);
    let profilesMap: Record<string, { full_name: string }> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = { full_name: p.full_name };
        return acc;
      }, {} as Record<string, { full_name: string }>);
    }
    
    const formattedStudents = (studentsData || []).map(student => ({
      ...student,
      profile: student.user_id ? profilesMap[student.user_id] : undefined,
    }));
    setStudents(formattedStudents);
  };

  const fetchGradesForExam = async (examId: string) => {
    const { data, error } = await supabase
      .from("grades")
      .select("*")
      .eq("exam_id", examId);
    
    if (error) {
      console.error("Error fetching grades:", error);
      return;
    }
    setGrades(data || []);
  };

  const handleExamSubmit = async () => {
    if (!examForm.class_id || !examForm.title) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const examData = {
      class_id: examForm.class_id,
      title: examForm.title,
      description: examForm.description || null,
      exam_type: examForm.exam_type,
      max_score: parseFloat(examForm.max_score),
      exam_date: examForm.exam_date,
      created_by: user?.id,
    };

    if (editingExam) {
      const { error } = await supabase
        .from("exams")
        .update(examData)
        .eq("id", editingExam.id);
      
      if (error) {
        toast.error("حدث خطأ أثناء تحديث الاختبار");
        console.error(error);
        return;
      }
      toast.success("تم تحديث الاختبار بنجاح");
    } else {
      const { error } = await supabase
        .from("exams")
        .insert(examData);
      
      if (error) {
        toast.error("حدث خطأ أثناء إضافة الاختبار");
        console.error(error);
        return;
      }
      toast.success("تم إضافة الاختبار بنجاح");
    }

    resetExamForm();
    fetchExams();
  };

  const handleDeleteExam = async (examId: string) => {
    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("id", examId);
    
    if (error) {
      toast.error("حدث خطأ أثناء حذف الاختبار");
      console.error(error);
      return;
    }
    
    toast.success("تم حذف الاختبار بنجاح");
    fetchExams();
  };

  const openGradesDialog = async (exam: Exam) => {
    setSelectedExam(exam);
    await fetchStudentsForClass(exam.class_id);
    await fetchGradesForExam(exam.id);
    setGradesDialogOpen(true);
  };

  useEffect(() => {
    if (selectedExam && students.length > 0) {
      const inputs: Record<string, { score: string; notes: string }> = {};
      students.forEach(student => {
        const existingGrade = grades.find(g => g.student_id === student.id);
        inputs[student.id] = {
          score: existingGrade ? String(existingGrade.score) : "",
          notes: existingGrade?.notes || "",
        };
      });
      setGradeInputs(inputs);
    }
  }, [students, grades, selectedExam]);

  const handleSaveGrades = async () => {
    if (!selectedExam) return;

    const gradesToUpsert = Object.entries(gradeInputs)
      .filter(([_, value]) => value.score !== "")
      .map(([studentId, value]) => ({
        exam_id: selectedExam.id,
        student_id: studentId,
        score: parseFloat(value.score),
        notes: value.notes || null,
        graded_by: user?.id,
      }));

    if (gradesToUpsert.length === 0) {
      toast.error("يرجى إدخال درجة واحدة على الأقل");
      return;
    }

    const { error } = await supabase
      .from("grades")
      .upsert(gradesToUpsert, { onConflict: "exam_id,student_id" });
    
    if (error) {
      toast.error("حدث خطأ أثناء حفظ الدرجات");
      console.error(error);
      return;
    }

    toast.success("تم حفظ الدرجات بنجاح");
    setGradesDialogOpen(false);
  };

  const resetExamForm = () => {
    setExamDialogOpen(false);
    setEditingExam(null);
    setExamForm({
      class_id: "",
      title: "",
      description: "",
      exam_type: "quiz",
      max_score: "100",
      exam_date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setExamForm({
      class_id: exam.class_id,
      title: exam.title,
      description: exam.description || "",
      exam_type: exam.exam_type,
      max_score: String(exam.max_score),
      exam_date: exam.exam_date,
    });
    setExamDialogOpen(true);
  };

  const calculateStats = () => {
    if (!grades.length || !selectedExam) return null;
    const scores = grades.map(g => g.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passed = scores.filter(s => s >= (selectedExam.max_score * 0.5)).length;
    return { avg, max, min, passed, total: scores.length };
  };

  // Filter exams
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exam.class_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === "all" || exam.class_id === filterClass;
    const matchesType = filterExamType === "all" || exam.exam_type === filterExamType;
    return matchesSearch && matchesClass && matchesType;
  });

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">الاختبارات والدرجات</h1>
            <p className="text-muted-foreground">إدارة الاختبارات وتسجيل درجات الطلاب</p>
          </div>
          <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetExamForm()}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة اختبار
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingExam ? "تعديل الاختبار" : "إضافة اختبار جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الصف *</Label>
                  <Select
                    value={examForm.class_id}
                    onValueChange={(value) => setExamForm({ ...examForm, class_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>عنوان الاختبار *</Label>
                  <Input
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="مثال: اختبار الفصل الأول"
                  />
                </div>

                <div className="space-y-2">
                  <Label>نوع الاختبار</Label>
                  <Select
                    value={examForm.exam_type}
                    onValueChange={(value) => setExamForm({ ...examForm, exam_type: value as ExamType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(examTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الدرجة القصوى</Label>
                    <Input
                      type="number"
                      value={examForm.max_score}
                      onChange={(e) => setExamForm({ ...examForm, max_score: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الاختبار</Label>
                    <Input
                      type="date"
                      value={examForm.exam_date}
                      onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    placeholder="وصف الاختبار (اختياري)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleExamSubmit} className="flex-1">
                    {editingExam ? "تحديث" : "إضافة"}
                  </Button>
                  <Button variant="outline" onClick={resetExamForm}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن اختبار..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterExamType} onValueChange={setFilterExamType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="نوع الاختبار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {Object.entries(examTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              قائمة الاختبارات ({filteredExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {exams.length === 0 ? "لا توجد اختبارات مسجلة" : "لا توجد نتائج للبحث"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاختبار</TableHead>
                    <TableHead>الصف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الدرجة القصوى</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell>{exam.class_name}</TableCell>
                      <TableCell>
                        <Badge variant={examTypeBadgeVariants[exam.exam_type]}>
                          {examTypeLabels[exam.exam_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.max_score}</TableCell>
                      <TableCell>
                        {format(new Date(exam.exam_date), "d MMMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGradesDialog(exam)}
                          >
                            <Award className="h-4 w-4 ml-1" />
                            الدرجات
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditExam(exam)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExam(exam.id)}
                          >
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

        {/* Grades Dialog */}
        <Dialog open={gradesDialogOpen} onOpenChange={setGradesDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                تسجيل درجات: {selectedExam?.title}
              </DialogTitle>
            </DialogHeader>
            
            {selectedExam && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>الصف: {selectedExam.class_name}</span>
                  <span>الدرجة القصوى: {selectedExam.max_score}</span>
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا يوجد طلاب في هذا الصف
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الطالب</TableHead>
                          <TableHead>رقم الطالب</TableHead>
                          <TableHead>الدرجة</TableHead>
                          <TableHead>ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              {student.profile?.full_name || "غير معروف"}
                            </TableCell>
                            <TableCell>{student.student_number || "-"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={selectedExam.max_score}
                                value={gradeInputs[student.id]?.score || ""}
                                onChange={(e) => setGradeInputs({
                                  ...gradeInputs,
                                  [student.id]: {
                                    ...gradeInputs[student.id],
                                    score: e.target.value,
                                  },
                                })}
                                className="w-20"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={gradeInputs[student.id]?.notes || ""}
                                onChange={(e) => setGradeInputs({
                                  ...gradeInputs,
                                  [student.id]: {
                                    ...gradeInputs[student.id],
                                    notes: e.target.value,
                                  },
                                })}
                                placeholder="ملاحظات"
                                className="w-full"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {grades.length > 0 && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold">
                                {calculateStats()?.avg.toFixed(1)}
                              </div>
                              <div className="text-sm text-muted-foreground">المتوسط</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                {calculateStats()?.max}
                              </div>
                              <div className="text-sm text-muted-foreground">الأعلى</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-red-600">
                                {calculateStats()?.min}
                              </div>
                              <div className="text-sm text-muted-foreground">الأدنى</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {calculateStats()?.passed}/{calculateStats()?.total}
                              </div>
                              <div className="text-sm text-muted-foreground">الناجحون</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveGrades} className="flex-1">
                        حفظ الدرجات
                      </Button>
                      <Button variant="outline" onClick={() => setGradesDialogOpen(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
