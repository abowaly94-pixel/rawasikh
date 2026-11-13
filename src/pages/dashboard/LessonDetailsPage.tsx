import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Video, FileText, ClipboardList, Plus, Trash2, Pencil, Play, ExternalLink, BookOpen, Clock, Users, CheckCircle2, Trophy, Share2 } from "lucide-react";
import { format } from "date-fns";
import ExamShareDialog from "@/components/ExamShareDialog";
import VideoEmbed from "@/components/VideoEmbed";
import { logActivity } from "@/lib/activityLogger";

interface Lesson {
  id: string;
  class_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  meeting_link: string | null;
  recorded_video_url: string | null;
  school_id: string | null;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  exam_type: string;
  exam_date: string;
  max_score: number;
  is_public: boolean;
  lesson_id: string | null;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
  student?: {
    id: string;
    user_id: string | null;
    profiles?: {
      full_name: string;
    } | null;
  };
}

const LessonDetailsPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, profile, loading } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [examAttempts, setExamAttempts] = useState<Record<string, ExamAttempt[]>>({});
  const [studentId, setStudentId] = useState<string | null>(null);
  const [myAttempts, setMyAttempts] = useState<Record<string, ExamAttempt[]>>({});
  
  // Video dialog state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  
  // Exam dialog state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");
  
  // New exam dialog state
  const [newExamDialogOpen, setNewExamDialogOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDescription, setNewExamDescription] = useState("");
  const [newExamType, setNewExamType] = useState("quiz");
  const [newExamMaxScore, setNewExamMaxScore] = useState(100);
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamTime, setNewExamTime] = useState("");
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedExamForShare, setSelectedExamForShare] = useState<Exam | null>(null);

  const getDayName = (day: number) => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[day] || "";
  };

  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  useEffect(() => {
    if (!loading && user) {
      fetchLessonData();
      fetchStudentId();
    }
  }, [lessonId, loading, user]);

  const fetchStudentId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setStudentId(data.id);
    }
  };

  const fetchLessonData = async () => {
    if (!lessonId) return;
    setIsLoading(true);
    try {
      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);
      setRecordedVideoUrl(lessonData.recorded_video_url || "");

      // Fetch exams linked to this lesson
      const { data: examsData, error: examsError } = await supabase
        .from("exams")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });

      if (examsError) throw examsError;
      
      // Fetch exam attempts for all exams
      if (examsData && examsData.length > 0) {
        const examIds = examsData.map(e => e.id);
        
        // Fetch all attempts with student info for teachers/admins
        const { data: attemptsData } = await supabase
          .from("exam_attempts")
          .select(`
            *,
            student:students(
              id,
              user_id,
              profiles:user_id(full_name)
            )
          `)
          .in("exam_id", examIds)
          .order("completed_at", { ascending: false });
        
        // Group attempts by exam_id
        const groupedAttempts: Record<string, ExamAttempt[]> = {};
        const myGroupedAttempts: Record<string, ExamAttempt[]> = {};
        
        (attemptsData || []).forEach((attempt: any) => {
          if (!groupedAttempts[attempt.exam_id]) {
            groupedAttempts[attempt.exam_id] = [];
          }
          groupedAttempts[attempt.exam_id].push(attempt);
          
          // Also track my own attempts
          if (studentId && attempt.student_id === studentId) {
            if (!myGroupedAttempts[attempt.exam_id]) {
              myGroupedAttempts[attempt.exam_id] = [];
            }
            myGroupedAttempts[attempt.exam_id].push(attempt);
          }
        });
        
        setExamAttempts(groupedAttempts);
        setMyAttempts(myGroupedAttempts);
      }
      setExams(examsData || []);

      // Fetch available exams (not linked to any lesson) for the same class
      const { data: availableData, error: availableError } = await supabase
        .from("exams")
        .select("*")
        .eq("class_id", lessonData.class_id)
        .is("lesson_id", null)
        .order("created_at", { ascending: false });

      if (availableError) throw availableError;
      setAvailableExams(availableData || []);
    } catch (error: any) {
      console.error("Error fetching lesson data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل بيانات الحصة", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecordedVideo = async () => {
    if (!lesson) return;
    try {
      const { error } = await supabase
        .from("lessons")
        .update({ recorded_video_url: recordedVideoUrl || null })
        .eq("id", lesson.id);

      if (error) throw error;
      toast({ title: "تم حفظ الفيديو المسجل بنجاح" });
      setVideoDialogOpen(false);
      fetchLessonData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignExam = async () => {
    if (!selectedExamId || !lesson) return;
    try {
      const { error } = await supabase
        .from("exams")
        .update({ lesson_id: lesson.id })
        .eq("id", selectedExamId);

      if (error) throw error;
      toast({ title: "تم إسناد الاختبار للحصة بنجاح" });
      setExamDialogOpen(false);
      setSelectedExamId("");
      fetchLessonData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveExam = async (examId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا الاختبار من الحصة؟")) return;
    try {
      const { error } = await supabase
        .from("exams")
        .update({ lesson_id: null })
        .eq("id", examId);

      if (error) throw error;
      toast({ title: "تم إزالة الاختبار من الحصة" });
      fetchLessonData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateExam = async () => {
    if (!lesson || !newExamTitle.trim()) return;
    
    // Validate date and time are provided
    if (!newExamDate || !newExamTime) {
      toast({ 
        title: "خطأ", 
        description: "يجب تحديد تاريخ ووقت الاختبار", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      // Combine date and time
      const examDateTime = `${newExamDate}T${newExamTime}:00`;
      
      const { error } = await supabase
        .from("exams")
        .insert([{
          title: newExamTitle,
          description: newExamDescription || null,
          exam_type: newExamType as "quiz" | "midterm" | "final" | "assignment" | "project" | "evaluation",
          max_score: newExamMaxScore,
          class_id: lesson.class_id,
          lesson_id: lesson.id,
          created_by: user?.id,
          is_public: true,
          exam_date: examDateTime
        }]);

      if (error) throw error;
      toast({ title: "تم إنشاء الاختبار بنجاح" });
      logActivity({
        actionType: "exam_created",
        description: `إنشاء اختبار: ${newExamTitle}`,
        entityType: "exam",
        schoolId: lesson.school_id || undefined,
      });
      setNewExamDialogOpen(false);
      setNewExamTitle("");
      setNewExamDescription("");
      setNewExamType("quiz");
      setNewExamMaxScore(100);
      setNewExamDate("");
      setNewExamTime("");
      fetchLessonData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const getExamTypeName = (type: string) => {
    const types: Record<string, string> = {
      quiz: "اختبار قصير",
      midterm: "اختبار نصفي",
      final: "اختبار نهائي",
      assignment: "واجب",
      project: "مشروع",
      evaluation: "تقييم"
    };
    return types[type] || type;
  };

  const isTeacherOrAdmin = userRole === "admin" || userRole === "teacher" || userRole === "school";

  if (loading || isLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">لم يتم العثور على الحصة</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const videoId = lesson.recorded_video_url ? getYouTubeVideoId(lesson.recorded_video_url) : null;

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{lesson.subject}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{getDayName(lesson.day_of_week)}</Badge>
                <span dir="ltr">{lesson.start_time} - {lesson.end_time}</span>
                {lesson.room && <span>• القاعة: {lesson.room}</span>}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="video" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              الفيديو المسجل
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              الاختبارات والواجبات ({exams.length})
            </TabsTrigger>
          </TabsList>

          {/* Video Tab */}
          <TabsContent value="video">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  الفيديو المسجل للحصة
                </CardTitle>
                {isTeacherOrAdmin && (
                  <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 ml-2" />
                        {lesson.recorded_video_url ? "تعديل الفيديو" : "إضافة فيديو"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة فيديو مسجل للحصة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>رابط فيديو يوتيوب</Label>
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={recordedVideoUrl}
                            onChange={(e) => setRecordedVideoUrl(e.target.value)}
                            dir="ltr"
                          />
                          <p className="text-xs text-muted-foreground">
                            أدخل رابط الفيديو من يوتيوب. سيتمكن الطلاب من مشاهدته بعد انتهاء الحصة.
                          </p>
                        </div>
                        <Button onClick={handleSaveRecordedVideo} className="w-full">
                          حفظ
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {lesson.recorded_video_url ? (
                  <div className="space-y-4">
                    <VideoEmbed url={lesson.recorded_video_url} title="Recorded Lesson" />
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(lesson.recorded_video_url!, "_blank")}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 ml-2" />
                      فتح في يوتيوب
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">لا يوجد فيديو مسجل لهذه الحصة</p>
                    {isTeacherOrAdmin && (
                      <p className="text-sm mt-2">اضغط على "إضافة فيديو" لإضافة رابط يوتيوب للحصة المسجلة</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  الاختبارات والواجبات
                </CardTitle>
                {isTeacherOrAdmin && (
                  <div className="flex gap-2">
                    {/* Assign existing exam */}
                    <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 ml-2" />
                          إسناد اختبار موجود
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>إسناد اختبار للحصة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>اختر اختبار</Label>
                            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر اختبار..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableExams.length > 0 ? (
                                  availableExams.map((exam) => (
                                    <SelectItem key={exam.id} value={exam.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{exam.title}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {getExamTypeName(exam.exam_type)}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    لا توجد اختبارات متاحة
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={handleAssignExam} 
                            className="w-full" 
                            disabled={!selectedExamId}
                          >
                            إسناد
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Create new exam */}
                    <Dialog open={newExamDialogOpen} onOpenChange={setNewExamDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 ml-2" />
                          إنشاء اختبار جديد
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>إنشاء اختبار جديد</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>عنوان الاختبار *</Label>
                            <Input
                              placeholder="مثال: اختبار الوحدة الأولى"
                              value={newExamTitle}
                              onChange={(e) => setNewExamTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>نوع الاختبار</Label>
                            <Select value={newExamType} onValueChange={setNewExamType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="quiz">اختبار قصير</SelectItem>
                                <SelectItem value="assignment">واجب</SelectItem>
                                <SelectItem value="midterm">اختبار نصفي</SelectItem>
                                <SelectItem value="final">اختبار نهائي</SelectItem>
                                <SelectItem value="project">مشروع</SelectItem>
                                <SelectItem value="evaluation">تقييم</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>الدرجة العظمى</Label>
                            <Input
                              type="number"
                              value={newExamMaxScore}
                              onChange={(e) => setNewExamMaxScore(parseInt(e.target.value) || 100)}
                              min={1}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>تاريخ الاختبار *</Label>
                              <Input
                                type="date"
                                value={newExamDate}
                                onChange={(e) => setNewExamDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>وقت الاختبار *</Label>
                              <Input
                                type="time"
                                value={newExamTime}
                                onChange={(e) => setNewExamTime(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>الوصف</Label>
                            <Textarea
                              placeholder="وصف الاختبار (اختياري)"
                              value={newExamDescription}
                              onChange={(e) => setNewExamDescription(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={handleCreateExam} 
                            className="w-full"
                            disabled={!newExamTitle.trim() || !newExamDate || !newExamTime}
                          >
                            إنشاء
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {exams.length > 0 ? (
                  <div className="space-y-6">
                    {exams.map((exam) => {
                      const attempts = examAttempts[exam.id] || [];
                      const myExamAttempts = myAttempts[exam.id] || [];
                      const bestAttempt = myExamAttempts.length > 0 
                        ? myExamAttempts.reduce((best, current) => 
                            (current.percentage || 0) > (best.percentage || 0) ? current : best
                          )
                        : null;
                      
                      return (
                        <Card key={exam.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <CardTitle className="text-base">{exam.title}</CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary">{getExamTypeName(exam.exam_type)}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {exam.max_score} درجة
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      • {format(new Date(exam.exam_date), "yyyy-MM-dd")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {/* Student: Take Exam Button */}
                                {userRole === "student" && (
                                  <Button 
                                    size="sm"
                                    onClick={() => navigate(`/dashboard/lessons/${lessonId}/exam/${exam.id}`)}
                                  >
                                    <Play className="h-4 w-4 ml-1" />
                                    {myExamAttempts.length > 0 ? "إعادة الاختبار" : "حل الاختبار"}
                                  </Button>
                                )}
                                {/* Teacher/Admin: Questions & Remove */}
                                {isTeacherOrAdmin && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      title="مشاركة الاختبار"
                                      onClick={() => {
                                        setSelectedExamForShare(exam);
                                        setShareDialogOpen(true);
                                      }}
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/dashboard/evaluation-exams/${exam.id}/questions`)}
                                    >
                                      <BookOpen className="h-4 w-4 ml-1" />
                                      الأسئلة
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleRemoveExam(exam.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          {/* Student's own attempts */}
                          {userRole === "student" && myExamAttempts.length > 0 && (
                            <CardContent className="pt-0">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">نتائجك</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">
                                      {bestAttempt?.percentage?.toFixed(0) || 0}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">أفضل نتيجة</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold">
                                      {bestAttempt?.score || 0}/{bestAttempt?.max_score || exam.max_score}
                                    </p>
                                    <p className="text-xs text-muted-foreground">الدرجة</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold">{myExamAttempts.length}</p>
                                    <p className="text-xs text-muted-foreground">عدد المحاولات</p>
                                  </div>
                                  <div className="text-center">
                                    {bestAttempt?.passed ? (
                                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                                    ) : (
                                      <span className="text-2xl">🔄</span>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {bestAttempt?.passed ? "ناجح" : "لم ينجح"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          )}
                          
                          {/* Teacher/Admin: All students attempts */}
                          {isTeacherOrAdmin && attempts.length > 0 && (
                            <CardContent className="pt-0">
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 px-3 py-2 flex items-center gap-2 border-b">
                                  <Users className="h-4 w-4" />
                                  <span className="font-medium text-sm">نتائج الطلاب ({attempts.length} محاولة)</span>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/30">
                                      <TableHead className="text-right w-[30%]">الطالب</TableHead>
                                      <TableHead className="text-center w-[15%]">الدرجة</TableHead>
                                      <TableHead className="text-center w-[15%]">النسبة</TableHead>
                                      <TableHead className="text-center w-[15%]">الحالة</TableHead>
                                      <TableHead className="text-center w-[25%]">التاريخ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {attempts.slice(0, 10).map((attempt) => (
                                      <TableRow key={attempt.id}>
                                        <TableCell className="font-medium text-right">
                                          {attempt.student?.profiles?.full_name || "طالب"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {attempt.score}/{attempt.max_score}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant={
                                            (attempt.percentage || 0) >= 80 ? "default" :
                                            (attempt.percentage || 0) >= 60 ? "secondary" : "destructive"
                                          }>
                                            {attempt.percentage?.toFixed(0) || 0}%
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {attempt.passed ? (
                                            <Badge variant="default" className="bg-green-500">ناجح</Badge>
                                          ) : (
                                            <Badge variant="destructive">راسب</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground text-sm">
                                          {attempt.completed_at 
                                            ? format(new Date(attempt.completed_at), "yyyy-MM-dd HH:mm")
                                            : "-"
                                          }
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {attempts.length > 10 && (
                                  <div className="px-3 py-2 text-center text-sm text-muted-foreground border-t">
                                    وهناك {attempts.length - 10} محاولة أخرى...
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          )}
                          
                          {isTeacherOrAdmin && attempts.length === 0 && (
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground text-center py-2">
                                لم يحل أي طالب هذا الاختبار بعد
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">لا توجد اختبارات أو واجبات لهذه الحصة</p>
                    {isTeacherOrAdmin && (
                      <p className="text-sm mt-2">اضغط على "إنشاء اختبار جديد" لإضافة اختبار أو واجب</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedExamForShare && (
        <ExamShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          examId={selectedExamForShare.id}
          examTitle={selectedExamForShare.title}
          examType="lesson-exam"
          lessonId={lessonId}
        />
      )}
    </DashboardLayout>
  );
};

export default LessonDetailsPage;
