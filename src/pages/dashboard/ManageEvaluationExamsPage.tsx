import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ClipboardList, Settings, Search, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ExamShareDialog from "@/components/ExamShareDialog";
import { logActivity } from "@/lib/activityLogger";

interface ExamCategory {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  exam_date: string;
  max_score: number;
  exam_type: string;
  class_id: string;
  category_id: string | null;
  is_public: boolean;
  classes?: { name: string };
  exam_categories?: { name: string };
}

const examTypeLabels: Record<string, string> = {
  quiz: "اختبار قصير",
  midterm: "اختبار نصفي",
  final: "اختبار نهائي",
  assignment: "واجب",
  project: "مشروع",
  evaluation: "تقييم",
};

const ManageEvaluationExamsPage = () => {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedExamForShare, setSelectedExamForShare] = useState<Exam | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    exam_date: new Date().toISOString().split("T")[0],
    max_score: 100,
    exam_type: "evaluation",
    class_id: "",
    category_id: "",
    is_public: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard");
    } else {
      fetchData();
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("exam_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("order_index");
      
      setCategories(categoriesData || []);

      // Fetch classes based on role
      let classesQuery = supabase.from("classes").select("id, name");
      if (userRole === "teacher") {
        classesQuery = classesQuery.eq("teacher_id", user?.id);
      }
      const { data: classesData } = await classesQuery;
      setClasses(classesData || []);

      // Fetch exams
      let examsQuery = supabase
        .from("exams")
        .select(`
          *,
          classes!fk_exams_class_id (name),
          exam_categories (name)
        `)
        .order("created_at", { ascending: false });

      if (userRole === "teacher") {
        const teacherClassIds = (classesData || []).map(c => c.id);
        if (teacherClassIds.length > 0) {
          examsQuery = examsQuery.in("class_id", teacherClassIds);
        } else {
          setExams([]);
          setLoading(false);
          return;
        }
      }

      const { data: examsData, error } = await examsQuery;
      if (error) throw error;
      setExams(examsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.class_id) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const examData = {
        title: formData.title,
        description: formData.description || null,
        exam_date: formData.exam_date,
        max_score: formData.max_score,
        exam_type: formData.exam_type as "quiz" | "midterm" | "final" | "assignment" | "project" | "evaluation",
        class_id: formData.class_id,
        category_id: formData.category_id || null,
        is_public: formData.is_public,
        created_by: user?.id,
      };

      if (editingExam) {
        const { error } = await supabase
          .from("exams")
          .update(examData)
          .eq("id", editingExam.id);

        if (error) throw error;
        toast({ title: "تم تحديث الاختبار بنجاح" });
      } else {
        const { error } = await supabase
          .from("exams")
          .insert(examData);

        if (error) throw error;
        toast({ title: "تم إنشاء الاختبار بنجاح" });
        logActivity({ actionType: "exam_created", description: `إنشاء اختبار تقييم`, entityType: "exam" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الاختبار",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;

    try {
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف الاختبار بنجاح" });
      fetchData();
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الاختبار",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description || "",
      exam_date: exam.exam_date,
      max_score: exam.max_score,
      exam_type: exam.exam_type,
      class_id: exam.class_id,
      category_id: exam.category_id || "",
      is_public: exam.is_public,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setFormData({
      title: "",
      description: "",
      exam_date: new Date().toISOString().split("T")[0],
      max_score: 100,
      exam_type: "evaluation",
      class_id: "",
      category_id: "",
      is_public: true,
    });
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || exam.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">إدارة اختبارات التقييم</h1>
            <p className="text-muted-foreground">إنشاء وإدارة اختبارات تقييم الطلاب</p>
          </div>
          <div className="flex gap-2">
            {userRole === "admin" && (
              <Button variant="outline" asChild>
                <Link to="/dashboard/exam-categories">
                  <Settings className="h-4 w-4 ml-2" />
                  إدارة التصنيفات
                </Link>
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة اختبار
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingExam ? "تعديل الاختبار" : "إضافة اختبار جديد"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان الاختبار *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مثال: اختبار تحديد المستوى"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">التصنيف</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class">الفصل *</Label>
                      <Select
                        value={formData.class_id}
                        onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل" />
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exam_type">نوع الاختبار</Label>
                      <Select
                        value={formData.exam_type}
                        onValueChange={(value) => setFormData({ ...formData, exam_type: value })}
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
                    <div className="space-y-2">
                      <Label htmlFor="max_score">الدرجة الكاملة</Label>
                      <Input
                        id="max_score"
                        type="number"
                        value={formData.max_score}
                        onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exam_date">تاريخ الاختبار</Label>
                    <Input
                      id="exam_date"
                      type="date"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_public">متاح للطلاب</Label>
                      <p className="text-sm text-muted-foreground">السماح للطلاب بحل الاختبار</p>
                    </div>
                    <Switch
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">إلغاء</Button>
                  </DialogClose>
                  <Button onClick={handleSubmit}>
                    {editingExam ? "تحديث" : "إضافة"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
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
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="جميع التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Exams Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              الاختبارات ({filteredExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد اختبارات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell>{exam.exam_categories?.name || "-"}</TableCell>
                      <TableCell>{exam.classes?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {examTypeLabels[exam.exam_type] || exam.exam_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.max_score}</TableCell>
                      <TableCell>
                        <Badge variant={exam.is_public ? "default" : "secondary"}>
                          {exam.is_public ? "متاح" : "غير متاح"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedExamForShare(exam);
                              setShareDialogOpen(true);
                            }}
                            title="مشاركة الاختبار"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/dashboard/evaluation-exams/${exam.id}/questions`}>
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(exam)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(exam.id)}
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

        {/* Share Dialog */}
        {selectedExamForShare && (
          <ExamShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            examId={selectedExamForShare.id}
            examTitle={selectedExamForShare.title}
            examType="evaluation"
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageEvaluationExamsPage;
