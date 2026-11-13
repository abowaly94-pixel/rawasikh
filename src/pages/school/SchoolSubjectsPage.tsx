import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Video, BookOpen, GraduationCap, Layers, Calendar } from "lucide-react";

interface Stage {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  stage_id: string;
}

interface Term {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
  stage_id: string;
  grade_level_id: string | null;
  term_id: string | null;
  is_active: boolean;
  global_stages: { name: string } | null;
  grade_levels: { name: string } | null;
  terms: { name: string } | null;
}

const SchoolSubjectsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<string>("all");
  
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

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
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (school) {
        setSchoolId(school.id);

        const [stagesRes, gradeLevelsRes, termsRes, subjectsRes] = await Promise.all([
          supabase.from("global_stages").select("id, name").order("order_index"),
          supabase.from("grade_levels").select("id, name, stage_id").order("order_index"),
          supabase.from("terms").select("id, name").eq("school_id", school.id).order("order_index"),
          supabase.from("subjects")
            .select("*, global_stages(name), grade_levels(name), terms(name)")
            .eq("school_id", school.id)
            .order("name"),
        ]);

        setStages(stagesRes.data || []);
        setGradeLevels(gradeLevelsRes.data || []);
        setTerms(termsRes.data || []);
        setSubjects(subjectsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subjectName.trim() || !selectedStageId || !schoolId) return;

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({
            name: subjectName,
            description: subjectDescription,
            stage_id: selectedStageId,
            grade_level_id: selectedGradeLevelId || null,
            term_id: selectedTermId || null,
          })
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast({ title: "تم تحديث المادة بنجاح" });
      } else {
        const { error } = await supabase
          .from("subjects")
          .insert({
            school_id: schoolId,
            stage_id: selectedStageId,
            grade_level_id: selectedGradeLevelId || null,
            term_id: selectedTermId || null,
            name: subjectName,
            description: subjectDescription,
          });

        if (error) throw error;
        toast({ title: "تم إضافة المادة بنجاح" });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف المادة بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSubjectDescription(subject.description || "");
    setSelectedStageId(subject.stage_id);
    setSelectedGradeLevelId(subject.grade_level_id || "");
    setSelectedTermId(subject.term_id || "");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingSubject(null);
    setSubjectName("");
    setSubjectDescription("");
    setSelectedStageId("");
    setSelectedGradeLevelId("");
    setSelectedTermId("");
  };

  const getFilteredSubjects = () => {
    if (activeStageTab === "all") return subjects;
    return subjects.filter(s => s.stage_id === activeStageTab);
  };

  const getGradeLevelsForStage = (stageId: string) => {
    return gradeLevels.filter(gl => gl.stage_id === stageId);
  };

  const groupSubjectsByGradeAndTerm = (stageId: string) => {
    const stageSubjects = subjects.filter(s => s.stage_id === stageId);
    const grouped: { [key: string]: { [key: string]: Subject[] } } = {};
    
    stageSubjects.forEach(subject => {
      const gradeName = subject.grade_levels?.name || "بدون صف";
      const termName = subject.terms?.name || "بدون ترم";
      
      if (!grouped[gradeName]) {
        grouped[gradeName] = {};
      }
      if (!grouped[gradeName][termName]) {
        grouped[gradeName][termName] = [];
      }
      grouped[gradeName][termName].push(subject);
    });
    
    return grouped;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">المواد الدراسية</h1>
            <p className="text-muted-foreground">إدارة المواد الدراسية للمراحل والصفوف المختلفة</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button disabled={stages.length === 0}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة مادة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? "تعديل المادة" : "إضافة مادة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المادة</Label>
                  <Input
                    placeholder="مثال: الرياضيات"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    placeholder="وصف المادة..."
                    value={subjectDescription}
                    onChange={(e) => setSubjectDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المرحلة الدراسية</Label>
                  <Select value={selectedStageId} onValueChange={(val) => {
                    setSelectedStageId(val);
                    setSelectedGradeLevelId("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStageId && getGradeLevelsForStage(selectedStageId).length > 0 && (
                  <div className="space-y-2">
                    <Label>الصف الدراسي (اختياري)</Label>
                    <Select value={selectedGradeLevelId} onValueChange={setSelectedGradeLevelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون تحديد</SelectItem>
                        {getGradeLevelsForStage(selectedStageId).map((gl) => (
                          <SelectItem key={gl.id} value={gl.id}>
                            {gl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {terms.length > 0 && (
                  <div className="space-y-2">
                    <Label>الترم (اختياري)</Label>
                    <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الترم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون تحديد</SelectItem>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleSubmit} className="w-full">
                  {editingSubject ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {stages.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                يجب إضافة مراحل دراسية أولاً قبل إضافة المواد
              </p>
              <Button onClick={() => navigate("/school/stages")}>
                إضافة مراحل دراسية
              </Button>
            </CardContent>
          </Card>
        )}

        {stages.length > 0 && (
          <Tabs value={activeStageTab} onValueChange={setActiveStageTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" className="gap-2">
                <BookOpen className="h-4 w-4" />
                الكل ({subjects.length})
              </TabsTrigger>
              {stages.map((stage) => (
                <TabsTrigger key={stage.id} value={stage.id} className="gap-2">
                  <Layers className="h-4 w-4" />
                  {stage.name} ({subjects.filter(s => s.stage_id === stage.id).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {subjects.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد مواد. قم بإضافة مادة جديدة.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onEdit={() => openEditDialog(subject)}
                      onDelete={() => handleDelete(subject.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {stages.map((stage) => (
              <TabsContent key={stage.id} value={stage.id} className="mt-6">
                {subjects.filter(s => s.stage_id === stage.id).length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد مواد في هذه المرحلة.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupSubjectsByGradeAndTerm(stage.id)).map(([gradeName, terms]) => (
                      <Card key={gradeName}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            {gradeName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {Object.entries(terms).map(([termName, termSubjects]) => (
                            <div key={termName} className="mb-4 last:mb-0">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">{termName}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {termSubjects.map((subject) => (
                                  <SubjectCard
                                    key={subject.id}
                                    subject={subject}
                                    compact
                                    onEdit={() => openEditDialog(subject)}
                                    onDelete={() => handleDelete(subject.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </SchoolLayout>
  );
};

interface SubjectCardProps {
  subject: Subject;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const SubjectCard = ({ subject, compact, onEdit, onDelete }: SubjectCardProps) => {
  return (
    <Card className={`hover:shadow-md transition-shadow ${compact ? 'p-3' : ''}`}>
      <CardContent className={compact ? 'p-0' : 'p-4'}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{subject.name}</h3>
              {!compact && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {subject.global_stages?.name && (
                    <Badge variant="outline" className="text-xs">
                      <Layers className="h-3 w-3 ml-1" />
                      {subject.global_stages.name}
                    </Badge>
                  )}
                  {subject.grade_levels?.name && (
                    <Badge variant="outline" className="text-xs">
                      <GraduationCap className="h-3 w-3 ml-1" />
                      {subject.grade_levels.name}
                    </Badge>
                  )}
                  {subject.terms?.name && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 ml-1" />
                      {subject.terms.name}
                    </Badge>
                  )}
                </div>
              )}
              {subject.description && !compact && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{subject.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={subject.is_active ? "default" : "secondary"} className="text-xs">
              {subject.is_active ? "نشط" : "غير نشط"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/school/subjects/${subject.id}/content`}>
              <Video className="h-4 w-4 ml-1" />
              المحتوى
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolSubjectsPage;