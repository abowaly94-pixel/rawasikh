import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, FileQuestion, Search, ArrowRight, Link2, Copy, Check, BarChart3 } from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  stage_id: string | null;
  grade_level_id: string | null;
  max_score: number;
  is_active: boolean;
  question_count?: number;
  attempt_count?: number;
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

const ManageLevelAssessmentsPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    stage_id: "",
    grade_level_id: "",
    max_score: 100,
    is_active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyInviteLink = async (assessmentId: string) => {
    const url = `${window.location.origin}/assessment-invite/${assessmentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(assessmentId);
      toast({ title: "تم نسخ الرابط", description: "يمكنك الآن مشاركة الرابط مع أي شخص" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في نسخ الرابط", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && !(userRole === "admin" || hasPermission("level_assessments"))) {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, hasPermission, navigate]);

  useEffect(() => {
    if (user && (userRole === "admin" || hasPermission("level_assessments"))) {
      fetchData();
    }
  }, [user, userRole, hasPermission]);

  const fetchData = async () => {
    try {
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

      // Fetch assessments created by admin (school_id is null or specific admin marker)
      // For simplicity, we'll create assessments with a special admin school_id or null
      const { data: assessmentsData } = await supabase
        .from("school_level_assessments")
        .select("*")
        .is("school_id", null)
        .order("created_at", { ascending: false });

      if (assessmentsData) {
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
      stage_id: "",
      grade_level_id: "",
      max_score: 100,
      is_active: true,
    });
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    try {
      const dataToSave = {
        school_id: null as string | null, // Admin assessments have no school
        title: formData.title,
        description: formData.description || null,
        subject_id: null,
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
      // Detach from any courses that reference this assessment
      await supabase
        .from("courses")
        .update({ level_assessment_id: null, requires_level_assessment: false })
        .eq("level_assessment_id", id);

      const { data, error } = await supabase
        .from("school_level_assessments")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        // Fallback: soft-delete if RLS blocked the hard delete
        const { error: softErr } = await supabase
          .from("school_level_assessments")
          .update({ is_active: false })
          .eq("id", id);
        if (softErr) throw softErr;
      }
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

  const filteredGradeLevels = formData.stage_id
    ? gradeLevels.filter((g) => g.stage_id === formData.stage_id)
    : [];

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
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/schools")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">اختبارات تقييم المستوى</h1>
              <p className="text-muted-foreground">إنشاء وإدارة اختبارات تقييم مستوى الطلاب</p>
            </div>
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
                      value={formData.stage_id || "all"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, stage_id: value === "all" ? "" : value, grade_level_id: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="جميع المراحل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المراحل</SelectItem>
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
                      value={formData.grade_level_id || "all"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, grade_level_id: value === "all" ? "" : value })
                      }
                      disabled={!formData.stage_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الصفوف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الصفوف</SelectItem>
                        {filteredGradeLevels.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <TableHead>المرحلة</TableHead>
                    <TableHead>الصف</TableHead>
                    <TableHead>الدرجة القصوى</TableHead>
                    <TableHead>الأسئلة</TableHead>
                    <TableHead>المحاولات</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="w-[180px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.title}</TableCell>
                      <TableCell>{getStageName(assessment.stage_id)}</TableCell>
                      <TableCell>{getGradeLevelName(assessment.grade_level_id)}</TableCell>
                      <TableCell>{assessment.max_score}</TableCell>
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
                            onClick={() => copyInviteLink(assessment.id)}
                            title="نسخ رابط الدعوة"
                          >
                            {copiedId === assessment.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/level-assessments/${assessment.id}/questions`)}
                            title="الأسئلة"
                          >
                            <FileQuestion className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/level-assessments/${assessment.id}/results`)}
                            title="نتائج المتدربين"
                          >
                            <BarChart3 className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
};

export default ManageLevelAssessmentsPage;
