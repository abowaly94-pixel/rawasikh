import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Video, FileQuestion, ArrowRight } from "lucide-react";

interface Content {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  is_free: boolean;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_active: boolean;
  content_id: string | null;
  content?: Content | null;
}

const SubjectContentPage = () => {
  const { id: subjectId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subjectName, setSubjectName] = useState("");
  const [contents, setContents] = useState<Content[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Content dialog
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentTitle, setContentTitle] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [contentVideoUrl, setContentVideoUrl] = useState("");
  const [contentIsFree, setContentIsFree] = useState(false);
  
  // Quiz dialog
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizPassingScore, setQuizPassingScore] = useState("60");
  const [quizContentId, setQuizContentId] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school" && subjectId) {
      fetchData();
    }
  }, [user, userRole, subjectId]);

  const fetchData = async () => {
    try {
      const [subjectRes, contentsRes, quizzesRes] = await Promise.all([
        supabase.from("subjects").select("name").eq("id", subjectId).single(),
        supabase.from("subject_content").select("*").eq("subject_id", subjectId).order("order_index"),
        supabase.from("subject_quizzes").select("*, content:subject_content(id, title)").eq("subject_id", subjectId).order("created_at"),
      ]);

      setSubjectName(subjectRes.data?.name || "");
      setContents(contentsRes.data || []);
      setQuizzes(quizzesRes.data?.map((q: any) => ({
        ...q,
        content: q.content || null
      })) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Content handlers
  const handleSubmitContent = async () => {
    if (!contentTitle.trim() || !subjectId) return;

    try {
      if (editingContent) {
        const { error } = await supabase
          .from("subject_content")
          .update({
            title: contentTitle,
            description: contentDescription,
            video_url: contentVideoUrl,
            is_free: contentIsFree,
          })
          .eq("id", editingContent.id);

        if (error) throw error;
        toast({ title: "تم تحديث المحتوى بنجاح" });
      } else {
        const { error } = await supabase
          .from("subject_content")
          .insert({
            subject_id: subjectId,
            title: contentTitle,
            description: contentDescription,
            video_url: contentVideoUrl,
            is_free: contentIsFree,
            order_index: contents.length,
          });

        if (error) throw error;
        toast({ title: "تم إضافة المحتوى بنجاح" });
      }

      resetContentForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحتوى؟")) return;

    try {
      const { error } = await supabase.from("subject_content").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف المحتوى بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const openEditContentDialog = (content: Content) => {
    setEditingContent(content);
    setContentTitle(content.title);
    setContentDescription(content.description || "");
    setContentVideoUrl(content.video_url || "");
    setContentIsFree(content.is_free);
    setContentDialogOpen(true);
  };

  const resetContentForm = () => {
    setContentDialogOpen(false);
    setEditingContent(null);
    setContentTitle("");
    setContentDescription("");
    setContentVideoUrl("");
    setContentIsFree(false);
  };

  // Quiz handlers
  const handleSubmitQuiz = async () => {
    if (!quizTitle.trim() || !subjectId) return;

    try {
      const quizData = {
        subject_id: subjectId,
        title: quizTitle,
        description: quizDescription,
        passing_score: parseInt(quizPassingScore),
        content_id: quizContentId || null,
      };

      if (editingQuiz) {
        const { error } = await supabase
          .from("subject_quizzes")
          .update({
            title: quizTitle,
            description: quizDescription,
            passing_score: parseInt(quizPassingScore),
            content_id: quizContentId || null,
          })
          .eq("id", editingQuiz.id);

        if (error) throw error;
        toast({ title: "تم تحديث الاختبار بنجاح" });
      } else {
        const { error } = await supabase
          .from("subject_quizzes")
          .insert(quizData);

        if (error) throw error;
        toast({ title: "تم إضافة الاختبار بنجاح" });
      }

      resetQuizForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;

    try {
      const { error } = await supabase.from("subject_quizzes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف الاختبار بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const openEditQuizDialog = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || "");
    setQuizPassingScore(quiz.passing_score.toString());
    setQuizContentId(quiz.content_id || "");
    setQuizDialogOpen(true);
  };

  const resetQuizForm = () => {
    setQuizDialogOpen(false);
    setEditingQuiz(null);
    setQuizTitle("");
    setQuizDescription("");
    setQuizPassingScore("60");
    setQuizContentId("");
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/school/subjects")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">محتوى مادة: {subjectName}</h1>
        </div>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">
              <Video className="h-4 w-4 ml-2" />
              المحتوى التعليمي
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <FileQuestion className="h-4 w-4 ml-2" />
              الاختبارات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={contentDialogOpen} onOpenChange={(open) => {
                if (!open) resetContentForm();
                else setContentDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة محتوى
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingContent ? "تعديل المحتوى" : "إضافة محتوى جديد"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>عنوان الدرس</Label>
                      <Input
                        value={contentTitle}
                        onChange={(e) => setContentTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea
                        value={contentDescription}
                        onChange={(e) => setContentDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الفيديو</Label>
                      <Input
                        dir="ltr"
                        value={contentVideoUrl}
                        onChange={(e) => setContentVideoUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={contentIsFree}
                        onCheckedChange={setContentIsFree}
                      />
                      <Label>مجاني</Label>
                    </div>
                    <Button onClick={handleSubmitContent} className="w-full">
                      {editingContent ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {contents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا يوجد محتوى. قم بإضافة درس جديد.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنوان</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="w-[100px]">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contents.map((content) => (
                        <TableRow key={content.id}>
                          <TableCell className="font-medium">{content.title}</TableCell>
                          <TableCell>
                            <Badge variant={content.is_free ? "secondary" : "default"}>
                              {content.is_free ? "مجاني" : "مدفوع"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditContentDialog(content)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteContent(content.id)}
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
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={quizDialogOpen} onOpenChange={(open) => {
                if (!open) resetQuizForm();
                else setQuizDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة اختبار
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuiz ? "تعديل الاختبار" : "إضافة اختبار جديد"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>عنوان الاختبار</Label>
                      <Input
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ربط بمحتوى تعليمي (اختياري)</Label>
                      <Select value={quizContentId} onValueChange={setQuizContentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المحتوى التعليمي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">بدون ربط</SelectItem>
                          {contents.map((content) => (
                            <SelectItem key={content.id} value={content.id}>
                              {content.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>درجة النجاح (%)</Label>
                      <Input
                        type="number"
                        value={quizPassingScore}
                        onChange={(e) => setQuizPassingScore(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSubmitQuiz} className="w-full">
                      {editingQuiz ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {quizzes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد اختبارات. قم بإضافة اختبار جديد.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنوان</TableHead>
                        <TableHead>المحتوى المرتبط</TableHead>
                        <TableHead>درجة النجاح</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="w-[100px]">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>
                            {quiz.content ? (
                              <Badge variant="outline" className="gap-1">
                                <Video className="h-3 w-3" />
                                {quiz.content.title}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">غير مرتبط</span>
                            )}
                          </TableCell>
                          <TableCell>{quiz.passing_score}%</TableCell>
                          <TableCell>
                            <Badge variant={quiz.is_active ? "default" : "secondary"}>
                              {quiz.is_active ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditQuizDialog(quiz)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteQuiz(quiz.id)}
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
          </TabsContent>
        </Tabs>
      </div>
    </SchoolLayout>
  );
};

export default SubjectContentPage;
