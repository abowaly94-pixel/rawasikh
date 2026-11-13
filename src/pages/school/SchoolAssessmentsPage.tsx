import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, FileQuestion, Search, Share2 } from "lucide-react";
import ExamShareDialog from "@/components/ExamShareDialog";
import { logActivity } from "@/lib/activityLogger";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  stage_id: string | null;
  grade_level_id: string | null;
  max_score: number;
  is_active: boolean;
  question_count?: number;
  attempt_count?: number;
}

interface Subject {
  id: string;
  name: string;
  stage_id: string;
  grade_level_id: string | null;
}

interface Stage {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  stage_id: string;
}

const SchoolAssessmentsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAssessmentForShare, setSelectedAssessmentForShare] = useState<Assessment | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject_id: "",
    stage_id: "",
    grade_level_id: "",
    max_score: 100,
    is_active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchData();
    }
  }, [user, userRole]);

  const fetchData = async () => {
    try {
      // Get school ID
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!school) return;
      setSchoolId(school.id);

      // Fetch stages
      const { data: stagesData } = await supabase
        .from("global_stages")
        .select("id, name")
        .order("order_index");
      setStages(stagesData || []);

      // Fetch grade levels
      const { data: gradesData } = await supabase
        .from("grade_levels")
        .select("id, name, stage_id")
        .order("order_index");
      setGradeLevels(gradesData || []);

      // Fetch subjects for this school
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name, stage_id, grade_level_id")
        .eq("school_id", school.id);
      setSubjects(subjectsData || []);

      // Fetch assessments
      const { data: assessmentsData } = await supabase
        .from("school_level_assessments")
        .select("*")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      if (assessmentsData) {
        // Get question counts and attempt counts
        const assessmentsWithCounts = await Promise.all(
          assessmentsData.map(async (assessment) => {
            const { count: questionCount } = await supabase
              .from("school_assessment_questions")
              .select("*", { count: "exact", head: true })
              .eq("assessment_id", assessment.id);

            const { count: attemptCount } = await supabase
              .from("school_assessment_attempts")
              .select("*", { count: "exact", head: true })
              .eq("assessment_id", assessment.id);

            return {
              ...assessment,
              question_count: questionCount || 0,
              attempt_count: attemptCount || 0,
            };
          })
        );
        setAssessments(assessmentsWithCounts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject_id: "",
      stage_id: "",
      grade_level_id: "",
      max_score: 100,
      is_active: true,
    });
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !schoolId) return;

    try {
      const dataToSave = {
        school_id: schoolId,
        title: formData.title,
        description: formData.description || null,
        subject_id: formData.subject_id || null,
        stage_id: formData.stage_id || null,
        grade_level_id: formData.grade_level_id || null,
        max_score: formData.max_score,
        is_active: formData.is_active,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("school_level_assessments")
          .update(dataToSave)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "تم تعديل الاختبار بنجاح" });
      } else {
        const { error } = await supabase
          .from("school_level_assessments")
          .insert(dataToSave);

        if (error) throw error;
        toast({ title: "تم إنشاء الاختبار بنجاح" });
        logActivity({ actionType: "assessment_created", description: `إنشاء تقييم: ${formData.title}`, entityType: "assessment", schoolId: schoolId || undefined });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setFormData({
      title: assessment.title,
      description: assessment.description || "",
      subject_id: assessment.subject_id || "",
      stage_id: assessment.stage_id || "",
      grade_level_id: assessment.grade_level_id || "",
      max_score: assessment.max_score,
      is_active: assessment.is_active,
    });
    setEditingId(assessment.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;

    try {
      const { error } = await supabase
        .from("school_level_assessments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف الاختبار" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const getStageName = (stageId: string | null) => {
    if (!stageId) return "جميع المراحل";
    return stages.find((s) => s.id === stageId)?.name || "-";
  };

  const getGradeLevelName = (gradeLevelId: string | null) => {
    if (!gradeLevelId) return "جميع الصفوف";
    return gradeLevels.find((g) => g.id === gradeLevelId)?.name || "-";
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return "عام";
    return subjects.find((s) => s.id === subjectId)?.name || "-";
  };

  const filteredGradeLevels = formData.stage_id
    ? gradeLevels.filter((g) => g.stage_id === formData.stage_id)
    : [];

  const filteredSubjects = formData.stage_id
    ? subjects.filter((s) => {
        if (formData.grade_level_id) {
          return s.grade_level_id === formData.grade_level_id;
        }
        return s.stage_id === formData.stage_id;
      })
    : subjects;

  const filteredAssessments = assessments.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">اختبارات تقييم المستوى</h1>
            <p className="text-muted-foreground">إنشاء وإدارة اختبارات تقييم مستوى الطلاب</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء اختبار
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل اختبار" : "إنشاء اختبار جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان الاختبار *</Label>
                  <Input
                    placeholder="مثال: اختبار تقييم مستوى الرياضيات"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    placeholder="وصف الاختبار..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المرحلة الدراسية</Label>
                    <Select
                      value={formData.stage_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, stage_id: value, grade_level_id: "", subject_id: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="جميع المراحل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع المراحل</SelectItem>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الصف الدراسي</Label>
                    <Select
                      value={formData.grade_level_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, grade_level_id: value, subject_id: "" })
                      }
                      disabled={!formData.stage_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الصفوف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الصفوف</SelectItem>
                        {filteredGradeLevels.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المادة</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختبار عام" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">اختبار عام</SelectItem>
                        {filteredSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الدرجة القصوى</Label>
                    <Input
                      type="number"
                      value={formData.max_score}
                      onChange={(e) =>
                        setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>الاختبار نشط</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!formData.title.trim()}>
                  {editingId ? "حفظ التعديلات" : "إنشاء الاختبار"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة الاختبارات</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد اختبارات</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>المرحلة</TableHead>
                    <TableHead>الصف</TableHead>
                    <TableHead>الأسئلة</TableHead>
                    <TableHead>المحاولات</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-[140px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.title}</TableCell>
                      <TableCell>{getSubjectName(assessment.subject_id)}</TableCell>
                      <TableCell>{getStageName(assessment.stage_id)}</TableCell>
                      <TableCell>{getGradeLevelName(assessment.grade_level_id)}</TableCell>
                      <TableCell>{assessment.question_count}</TableCell>
                      <TableCell>{assessment.attempt_count}</TableCell>
                      <TableCell>
                        <Badge variant={assessment.is_active ? "default" : "secondary"}>
                          {assessment.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/school/assessments/${assessment.id}/questions`)}
                            title="الأسئلة"
                          >
                            <FileQuestion className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(assessment)}
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedAssessmentForShare(assessment);
                              setShareDialogOpen(true);
                            }}
                            title="مشاركة"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(assessment.id)}
                            title="حذف"
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

        {selectedAssessmentForShare && (
          <ExamShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            examId={selectedAssessmentForShare.id}
            examTitle={selectedAssessmentForShare.title}
            examType="school-assessment"
          />
        )}
      </div>
    </SchoolLayout>
  );
};

export default SchoolAssessmentsPage;
