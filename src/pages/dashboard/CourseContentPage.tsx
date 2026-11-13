import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowRight, GripVertical, PlayCircle, Video, FileText, Upload, X, FileQuestion } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CaptionsManager from "@/components/CaptionsManager";

interface Section {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
  level_id?: string | null;
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  description: string | null;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
  section_id: string;
  pdf_url: string | null;
  captions_url?: string | null;
  captions?: Array<{ lang: string; label: string; url: string }> | null;
}

interface QuizAssignment {
  id: string;
  quiz_id: string;
  section_id: string | null;
  order_index: number;
  quiz?: {
    id: string;
    title: string;
    passing_score: number;
  };
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
}

const CourseContentPage = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const levelFilter = searchParams.get("level") || "";
  const { user, profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");

  const [sectionForm, setSectionForm] = useState({ title: "", level_id: "" });
  const [lessonForm, setLessonForm] = useState<{
    title: string;
    video_url: string;
    description: string;
    duration_minutes: number;
    is_free: boolean;
    pdf_url: string;
    captions: Array<{ lang: string; label: string; url: string }>;
  }>({
    title: "",
    video_url: "",
    description: "",
    duration_minutes: 0,
    is_free: false,
    pdf_url: "",
    captions: [],
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, navigate]);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["course_sections_admin", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!courseId,
  });

  const { data: lessons } = useQuery({
    queryKey: ["course_lessons_admin", courseId],
    queryFn: async () => {
      const sectionIds = sections?.map((s) => s.id) || [];
      if (sectionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .in("section_id", sectionIds)
        .order("order_index");
      if (error) throw error;
      return data as unknown as Lesson[];
    },
    enabled: !!sections && sections.length > 0,
  });

  // Fetch all available quizzes
  const { data: availableQuizzes } = useQuery({
    queryKey: ["available_quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quizzes")
        .select("id, title, passing_score")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data as Quiz[];
    },
  });

  // Fetch quiz assignments for this course
  const { data: quizAssignments } = useQuery({
    queryKey: ["course_quiz_assignments", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quiz_assignments")
        .select(`
          id,
          quiz_id,
          section_id,
          order_index,
          course_quizzes (
            id,
            title,
            passing_score
          )
        `)
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        quiz: d.course_quizzes,
      })) as QuizAssignment[];
    },
    enabled: !!courseId,
  });

  // Fetch course levels (only relevant if course has levels)
  const { data: courseLevels } = useQuery({
    queryKey: ["course_levels_for_content", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_levels")
        .select("id, name, order_index")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data as { id: string; name: string; order_index: number }[];
    },
    enabled: !!courseId,
  });

  const createSectionMutation = useMutation({
    mutationFn: async (form: { title: string; level_id: string }) => {
      const maxOrder = sections?.reduce((max, s) => Math.max(max, s.order_index), -1) ?? -1;
      const { error } = await supabase.from("course_sections").insert({
        course_id: courseId,
        title: form.title,
        order_index: maxOrder + 1,
        level_id: form.level_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sections_admin", courseId] });
      toast.success("تم إضافة القسم بنجاح");
      setSectionForm({ title: "", level_id: "" });
      setSectionDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, title, level_id }: { id: string; title: string; level_id: string }) => {
      const { error } = await supabase
        .from("course_sections")
        .update({ title, level_id: level_id || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sections_admin", courseId] });
      toast.success("تم تحديث القسم");
      setEditingSection(null);
      setSectionDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sections_admin", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course_lessons_admin", courseId] });
      toast.success("تم حذف القسم");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  // Lesson mutations
  const createLessonMutation = useMutation({
    mutationFn: async (data: typeof lessonForm & { section_id: string }) => {
      const sectionLessons = lessons?.filter((l) => l.section_id === data.section_id) || [];
      const maxOrder = sectionLessons.reduce((max, l) => Math.max(max, l.order_index), -1);
      
      const { error } = await supabase.from("course_lessons").insert({
        section_id: data.section_id,
        title: data.title,
        video_url: data.video_url || null,
        description: data.description || null,
        duration_minutes: data.duration_minutes,
        is_free: data.is_free,
        order_index: maxOrder + 1,
        pdf_url: data.pdf_url || null,
        captions: data.captions as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_lessons_admin", courseId] });
      toast.success("تم إضافة الدرس بنجاح");
      resetLessonForm();
      setLessonDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof lessonForm }) => {
      const { error } = await supabase
        .from("course_lessons")
        .update({
          title: data.title,
          video_url: data.video_url || null,
          description: data.description || null,
          duration_minutes: data.duration_minutes,
          is_free: data.is_free,
          pdf_url: data.pdf_url || null,
          captions: data.captions as any,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_lessons_admin", courseId] });
      toast.success("تم تحديث الدرس");
      resetLessonForm();
      setLessonDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_lessons_admin", courseId] });
      toast.success("تم حذف الدرس");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  // Quiz assignment mutations
  const addQuizMutation = useMutation({
    mutationFn: async ({ quizId, sectionId }: { quizId: string; sectionId: string }) => {
      const sectionQuizzes = quizAssignments?.filter((q) => q.section_id === sectionId) || [];
      const maxOrder = sectionQuizzes.reduce((max, q) => Math.max(max, q.order_index), -1);
      
      const { error } = await supabase.from("course_quiz_assignments").insert({
        course_id: courseId,
        quiz_id: quizId,
        section_id: sectionId,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_quiz_assignments", courseId] });
      toast.success("تم إضافة الاختبار للقسم");
      setQuizDialogOpen(false);
      setSelectedQuizId("");
      setSelectedSectionId(null);
    },
    onError: () => toast.error("حدث خطأ - قد يكون الاختبار مضافاً مسبقاً"),
  });

  const removeQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_quiz_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_quiz_assignments", courseId] });
      toast.success("تم إزالة الاختبار");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const resetLessonForm = (clearSectionId = true) => {
    setLessonForm({
      title: "",
      video_url: "",
      description: "",
      duration_minutes: 0,
      is_free: false,
      pdf_url: "",
      captions: [],
    });
    setEditingLesson(null);
    if (clearSectionId) {
      setSelectedSectionId(null);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("يرجى اختيار ملف PDF فقط");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 10 ميجابايت");
      return;
    }

    setUploadingPdf(true);
    try {
      // Sanitize file name: strip non-ASCII (Arabic etc.), spaces, and special chars
      const safeName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 40) || "file";
      const fileName = `${courseId}/${Date.now()}_${safeName}.pdf`;
      const { data, error } = await supabase.storage
        .from("lesson-pdfs")
        .upload(fileName, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lesson-pdfs")
        .getPublicUrl(data.path);

      setLessonForm({ ...lessonForm, pdf_url: urlData.publicUrl });
      toast.success("تم رفع الملف بنجاح");
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      toast.error(error?.message ? `خطأ: ${error.message}` : "حدث خطأ أثناء رفع الملف");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  };

  const removePdf = () => {
    setLessonForm({ ...lessonForm, pdf_url: "" });
  };





  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ title: section.title, level_id: section.level_id || "" });
    setSectionDialogOpen(true);
  };

  const handleAddLesson = (sectionId: string) => {
    resetLessonForm(false);
    setSelectedSectionId(sectionId);
    setLessonDialogOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      video_url: lesson.video_url || "",
      description: lesson.description || "",
      duration_minutes: lesson.duration_minutes,
      is_free: lesson.is_free,
      pdf_url: lesson.pdf_url || "",
      captions: (lesson.captions as any) || [],
    });
    setLessonDialogOpen(true);
  };

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.title.trim()) {
      toast.error("يرجى إدخال عنوان القسم");
      return;
    }
    if (editingSection) {
      updateSectionMutation.mutate({
        id: editingSection.id,
        title: sectionForm.title,
        level_id: sectionForm.level_id,
      });
    } else {
      createSectionMutation.mutate(sectionForm);
    }
  };

  const handleLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      toast.error("يرجى إدخال عنوان الدرس");
      return;
    }
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data: lessonForm });
    } else if (selectedSectionId) {
      createLessonMutation.mutate({ ...lessonForm, section_id: selectedSectionId });
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/courses")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              محتوى الدورة التدريبية: {course?.title}
            </h1>
            <p className="text-muted-foreground">إدارة الأقسام والدروس</p>
          </div>
        </div>

        {levelFilter && courseLevels && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">عرض محتوى المستوى: </span>
                <span className="font-bold text-primary">
                  {courseLevels.find((l) => l.id === levelFilter)?.name || "غير معروف"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  searchParams.delete("level");
                  setSearchParams(searchParams);
                }}
              >
                عرض كل المستويات
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Dialog open={sectionDialogOpen} onOpenChange={(open) => {
            setSectionDialogOpen(open);
            if (!open) {
              setEditingSection(null);
              setSectionForm({ title: "", level_id: "" });
            } else if (!editingSection && levelFilter) {
              setSectionForm({ title: "", level_id: levelFilter });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة قسم
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSection ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSectionSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="section_title">عنوان القسم</Label>
                  <Input
                    id="section_title"
                    value={sectionForm.title}
                    onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                    placeholder="مثال: المقدمة"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit">
                    {editingSection ? "تحديث" : "إضافة"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sections & Lessons */}
        {sectionsLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : sections && sections.length > 0 ? (
          <Accordion type="multiple" className="space-y-4">
            {sections
              .filter((s) => !levelFilter || s.level_id === levelFilter)
              .map((section) => {
              const sectionLessons = lessons?.filter((l) => l.section_id === section.id) || [];
              const sectionQuizzes = quizAssignments?.filter((q) => q.section_id === section.id) || [];
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
                    <AccordionTrigger className="hover:no-underline flex-1 py-2">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">{section.title}</span>
                        <span className="text-sm text-muted-foreground">
                          ({sectionLessons.length} دروس)
                        </span>
                        {sectionQuizzes.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({sectionQuizzes.length} اختبارات)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAddLesson(section.id); }}>
                        <Plus className="ml-1 h-3 w-3" />
                        إضافة درس
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSectionId(section.id);
                          setSelectedQuizId("");
                          setQuizDialogOpen(true);
                        }}
                      >
                        <FileQuestion className="ml-1 h-3 w-3" />
                        إضافة اختبار
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEditSection(section); }}>
                        <Pencil className="ml-1 h-3 w-3" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("هل أنت متأكد من حذف هذا القسم وجميع دروسه؟")) {
                            deleteSectionMutation.mutate(section.id);
                          }
                        }}
                      >
                        <Trash2 className="ml-1 h-3 w-3" />
                        حذف
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="px-4 pb-4">


                    {/* Section Quizzes */}
                    {sectionQuizzes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">الاختبارات:</h4>
                        <ul className="space-y-2">
                          {sectionQuizzes.map((assignment) => (
                            <li
                              key={assignment.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                            >
                              <div className="flex items-center gap-3">
                                <FileQuestion className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{assignment.quiz?.title}</span>
                                <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded">
                                  درجة النجاح: {assignment.quiz?.passing_score}%
                                </span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من إزالة هذا الاختبار من القسم؟")) {
                                    removeQuizMutation.mutate(assignment.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sectionLessons.length > 0 ? (
                      <ul className="space-y-2">
                        {sectionLessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Video className="h-4 w-4 text-primary" />
                              <span className="font-medium">{lesson.title}</span>
                              {lesson.is_free && (
                                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                  مجاني
                                </span>
                              )}
                              {lesson.pdf_url && (
                                <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  PDF
                                </span>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {lesson.duration_minutes} دقيقة
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف هذا الدرس؟")) {
                                    deleteLessonMutation.mutate(lesson.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        لا توجد دروس في هذا القسم
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <Card className="p-12 text-center">
            <PlayCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد أقسام
            </h3>
            <p className="text-muted-foreground mb-6">
              ابدأ بإضافة أقسام ودروس للدورة التدريبية
            </p>
          </Card>
        )}

        {/* Lesson Dialog */}
        <Dialog open={lessonDialogOpen} onOpenChange={(open) => {
          setLessonDialogOpen(open);
          if (!open) resetLessonForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lesson_title">عنوان الدرس *</Label>
                <Input
                  id="lesson_title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="أدخل عنوان الدرس"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">رابط الفيديو</Label>
                <Input
                  id="video_url"
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson_description">وصف الدرس</Label>
<Textarea
                  id="lesson_description"
                  dir="auto"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">المدة (بالدقائق)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={lessonForm.duration_minutes}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_free"
                  checked={lessonForm.is_free}
                  onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_free: checked })}
                />
                <Label htmlFor="is_free">درس مجاني للمعاينة</Label>
              </div>

              <div className="space-y-2">
                <Label>ملف PDF مرفق</Label>
                {lessonForm.pdf_url ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <a 
                      href={lessonForm.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex-1 truncate"
                    >
                      {lessonForm.pdf_url.split('/').pop()}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={removePdf}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf"
                      ref={pdfInputRef}
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={uploadingPdf}
                      className="w-full"
                    >
                      {uploadingPdf ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 ml-2" />
                          رفع ملف PDF
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <CaptionsManager
                value={lessonForm.captions}
                onChange={(next) => setLessonForm({ ...lessonForm, captions: next })}
                uploadPath={`lesson/${editingLesson?.id || "new"}`}
                disabled={!lessonForm.video_url}
              />
              {!lessonForm.video_url && (
                <p className="text-xs text-muted-foreground">
                  أضف رابط/فيديو الدرس أولاً — الترجمة تعمل فقط مع الفيديوهات المرفوعة مباشرة.
                </p>
              )}



              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  {editingLesson ? "تحديث" : "إضافة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quiz Assignment Dialog */}
        <Dialog open={quizDialogOpen} onOpenChange={(open) => {
          setQuizDialogOpen(open);
          if (!open) {
            setSelectedQuizId("");
            setSelectedSectionId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة اختبار للقسم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اختر اختبار</Label>
                <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اختبار من القائمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuizzes?.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title} (درجة النجاح: {quiz.passing_score}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {availableQuizzes?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد اختبارات متاحة.{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/dashboard/quizzes")}>
                    إنشاء اختبار جديد
                  </Button>
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => {
                    if (selectedQuizId && selectedSectionId) {
                      addQuizMutation.mutate({ quizId: selectedQuizId, sectionId: selectedSectionId });
                    }
                  }}
                  disabled={!selectedQuizId || addQuizMutation.isPending}
                >
                  إضافة
                </Button>
                <Button variant="outline" onClick={() => setQuizDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CourseContentPage;
