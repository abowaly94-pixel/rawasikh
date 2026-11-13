import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ArrowRight, Video, FileText, ClipboardList, Pencil, Eye } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  school_id: string;
}

interface Content {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
  is_free: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  time_limit_minutes: number | null;
  is_active: boolean;
}

interface AvailableQuiz {
  id: string;
  title: string;
  description: string | null;
}

const SubjectContentManagePage = () => {
  const { schoolId, subjectId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Content
  const [contents, setContents] = useState<Content[]>([]);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentTitle, setContentTitle] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [contentVideoUrl, setContentVideoUrl] = useState("");
  const [contentPdfUrl, setContentPdfUrl] = useState("");
  const [contentOrder, setContentOrder] = useState(0);
  const [contentIsFree, setContentIsFree] = useState(false);

  // Quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<AvailableQuiz[]>([]);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizPassingScore, setQuizPassingScore] = useState(60);
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);
  const [quizIsActive, setQuizIsActive] = useState(true);

  // Assign existing quiz
  const [assignQuizDialogOpen, setAssignQuizDialogOpen] = useState(false);
  const [selectedQuizToAssign, setSelectedQuizToAssign] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "admin") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "admin" && subjectId) {
      fetchData();
    }
  }, [user, userRole, subjectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name, school_id")
        .eq("id", subjectId)
        .single();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch content
      const { data: contentData } = await supabase
        .from("subject_content")
        .select("*")
        .eq("subject_id", subjectId)
        .order("order_index");
      setContents(contentData || []);

      // Fetch quizzes for this subject
      const { data: quizzesData } = await supabase
        .from("subject_quizzes")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at");
      setQuizzes(quizzesData || []);

      // Fetch available quizzes from course_quizzes that can be assigned
      const { data: availableData } = await supabase
        .from("course_quizzes")
        .select("id, title, description")
        .eq("is_active", true);
      setAvailableQuizzes(availableData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Content functions
  const handleAddOrUpdateContent = async () => {
    if (!contentTitle.trim()) return;
    try {
      if (editingContentId) {
        const { error } = await supabase
          .from("subject_content")
          .update({
            title: contentTitle,
            description: contentDescription || null,
            video_url: contentVideoUrl || null,
            pdf_url: contentPdfUrl || null,
            order_index: contentOrder,
            is_free: contentIsFree,
          })
          .eq("id", editingContentId);

        if (error) throw error;
        toast({ title: "تم تعديل المحتوى" });
      } else {
        const { error } = await supabase
          .from("subject_content")
          .insert({
            subject_id: subjectId,
            title: contentTitle,
            description: contentDescription || null,
            video_url: contentVideoUrl || null,
            pdf_url: contentPdfUrl || null,
            order_index: contentOrder,
            is_free: contentIsFree,
          });

        if (error) throw error;
        toast({ title: "تم إضافة المحتوى" });
      }
      resetContentForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetContentForm = () => {
    setContentDialogOpen(false);
    setEditingContentId(null);
    setContentTitle("");
    setContentDescription("");
    setContentVideoUrl("");
    setContentPdfUrl("");
    setContentOrder(0);
    setContentIsFree(false);
  };

  const openEditContentDialog = (content: Content) => {
    setContentTitle(content.title);
    setContentDescription(content.description || "");
    setContentVideoUrl(content.video_url || "");
    setContentPdfUrl(content.pdf_url || "");
    setContentOrder(content.order_index);
    setContentIsFree(content.is_free);
    setEditingContentId(content.id);
    setContentDialogOpen(true);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحتوى؟")) return;
    try {
      const { error } = await supabase
        .from("subject_content")
        .delete()
        .eq("id", contentId);

      if (error) throw error;
      toast({ title: "تم حذف المحتوى" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Quiz functions
  const handleAddOrUpdateQuiz = async () => {
    if (!quizTitle.trim()) return;
    try {
      if (editingQuizId) {
        const { error } = await supabase
          .from("subject_quizzes")
          .update({
            title: quizTitle,
            description: quizDescription || null,
            passing_score: quizPassingScore,
            time_limit_minutes: quizTimeLimit,
            is_active: quizIsActive,
          })
          .eq("id", editingQuizId);

        if (error) throw error;
        toast({ title: "تم تعديل الاختبار" });
      } else {
        const { error } = await supabase
          .from("subject_quizzes")
          .insert({
            subject_id: subjectId,
            title: quizTitle,
            description: quizDescription || null,
            passing_score: quizPassingScore,
            time_limit_minutes: quizTimeLimit,
            is_active: quizIsActive,
          });

        if (error) throw error;
        toast({ title: "تم إضافة الاختبار" });
      }
      resetQuizForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetQuizForm = () => {
    setQuizDialogOpen(false);
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizDescription("");
    setQuizPassingScore(60);
    setQuizTimeLimit(30);
    setQuizIsActive(true);
  };

  const openEditQuizDialog = (quiz: Quiz) => {
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || "");
    setQuizPassingScore(quiz.passing_score || 60);
    setQuizTimeLimit(quiz.time_limit_minutes || 30);
    setQuizIsActive(quiz.is_active);
    setEditingQuizId(quiz.id);
    setQuizDialogOpen(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;
    try {
      const { error } = await supabase
        .from("subject_quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;
      toast({ title: "تم حذف الاختبار" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Assign existing quiz
  const handleAssignQuiz = async () => {
    if (!selectedQuizToAssign) return;
    try {
      const selectedQuiz = availableQuizzes.find(q => q.id === selectedQuizToAssign);
      if (!selectedQuiz) return;

      const { error } = await supabase
        .from("subject_quizzes")
        .insert({
          subject_id: subjectId,
          title: selectedQuiz.title,
          description: selectedQuiz.description,
          passing_score: 60,
          time_limit_minutes: 30,
          is_active: true,
        });

      if (error) throw error;
      toast({ title: "تم إسناد الاختبار للمادة" });
      setAssignQuizDialogOpen(false);
      setSelectedQuizToAssign("");
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/schools/${schoolId}`)}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <h1 className="text-2xl font-bold">محتوى مادة: {subject?.name}</h1>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              المحتوى التعليمي
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              الاختبارات
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>المحتوى التعليمي (فيديوهات وملفات PDF)</CardTitle>
                <Dialog open={contentDialogOpen} onOpenChange={(open) => {
                  if (!open) resetContentForm();
                  else setContentDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 ml-2" />إضافة محتوى</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingContentId ? "تعديل محتوى" : "إضافة محتوى جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>عنوان المحتوى</Label>
                        <Input
                          placeholder="مثال: الدرس الأول"
                          value={contentTitle}
                          onChange={(e) => setContentTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الوصف (اختياري)</Label>
                        <Input
                          placeholder="وصف المحتوى"
                          value={contentDescription}
                          onChange={(e) => setContentDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>رابط الفيديو (اختياري)</Label>
                        <Input
                          placeholder="https://youtube.com/..."
                          value={contentVideoUrl}
                          onChange={(e) => setContentVideoUrl(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>رابط ملف PDF (اختياري)</Label>
                        <Input
                          placeholder="https://..."
                          value={contentPdfUrl}
                          onChange={(e) => setContentPdfUrl(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الترتيب</Label>
                          <Input
                            type="number"
                            value={contentOrder}
                            onChange={(e) => setContentOrder(parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>مجاني؟</Label>
                          <div className="flex items-center gap-2 pt-2">
                            <Switch
                              checked={contentIsFree}
                              onCheckedChange={setContentIsFree}
                            />
                            <span className="text-sm">{contentIsFree ? "نعم" : "لا"}</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleAddOrUpdateContent} className="w-full" disabled={!contentTitle.trim()}>
                        {editingContentId ? "تعديل" : "إضافة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {contents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد محتوى</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>مجاني</TableHead>
                        <TableHead className="w-[120px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contents.map((content) => (
                        <TableRow key={content.id}>
                          <TableCell>{content.order_index}</TableCell>
                          <TableCell>{content.title}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {content.video_url && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Video className="h-3 w-3" />
                                  فيديو
                                </Badge>
                              )}
                              {content.pdf_url && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  PDF
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={content.is_free ? "default" : "secondary"}>
                              {content.is_free ? "مجاني" : "مدفوع"}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditContentDialog(content)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContent(content.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>اختبارات المادة</CardTitle>
                <div className="flex gap-2">
                  {/* Assign existing quiz */}
                  <Dialog open={assignQuizDialogOpen} onOpenChange={setAssignQuizDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={availableQuizzes.length === 0}>
                        <ClipboardList className="h-4 w-4 ml-2" />
                        إسناد اختبار موجود
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إسناد اختبار من إدارة الاختبارات</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>اختر الاختبار</Label>
                          <Select value={selectedQuizToAssign} onValueChange={setSelectedQuizToAssign}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر اختبار" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableQuizzes.map((quiz) => (
                                <SelectItem key={quiz.id} value={quiz.id}>
                                  {quiz.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAssignQuiz} className="w-full" disabled={!selectedQuizToAssign}>
                          إسناد
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Create new quiz */}
                  <Dialog open={quizDialogOpen} onOpenChange={(open) => {
                    if (!open) resetQuizForm();
                    else setQuizDialogOpen(true);
                  }}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 ml-2" />إنشاء اختبار جديد</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingQuizId ? "تعديل اختبار" : "إنشاء اختبار جديد"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>عنوان الاختبار</Label>
                          <Input
                            placeholder="مثال: اختبار الوحدة الأولى"
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف (اختياري)</Label>
                          <Input
                            placeholder="وصف الاختبار"
                            value={quizDescription}
                            onChange={(e) => setQuizDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>درجة النجاح (%)</Label>
                            <Input
                              type="number"
                              value={quizPassingScore}
                              onChange={(e) => setQuizPassingScore(parseInt(e.target.value) || 60)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الوقت (دقائق)</Label>
                            <Input
                              type="number"
                              value={quizTimeLimit}
                              onChange={(e) => setQuizTimeLimit(parseInt(e.target.value) || 30)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={quizIsActive}
                            onCheckedChange={setQuizIsActive}
                          />
                          <Label>مفعّل</Label>
                        </div>
                        <Button onClick={handleAddOrUpdateQuiz} className="w-full" disabled={!quizTitle.trim()}>
                          {editingQuizId ? "تعديل" : "إنشاء"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {quizzes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد اختبارات</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنوان</TableHead>
                        <TableHead>درجة النجاح</TableHead>
                        <TableHead>الوقت</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="w-[150px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                          <TableCell>{quiz.title}</TableCell>
                          <TableCell>{quiz.passing_score}%</TableCell>
                          <TableCell>{quiz.time_limit_minutes} دقيقة</TableCell>
                          <TableCell>
                            <Badge variant={quiz.is_active ? "default" : "secondary"}>
                              {quiz.is_active ? "مفعّل" : "غير مفعّل"}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => navigate(`/dashboard/subject-quizzes/${quiz.id}/questions`)}
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditQuizDialog(quiz)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuiz(quiz.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SubjectContentManagePage;
