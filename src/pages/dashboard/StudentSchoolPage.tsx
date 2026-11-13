import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import VideoEmbed from "@/components/VideoEmbed";
import { 
  School, 
  BookOpen, 
  GraduationCap, 
  Mail, 
  Phone,
  Users,
  Layers,
  ListOrdered,
  Video,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  Download,
  Play,
  Info,
  ClipboardCheck,
  Clock,
  Calendar
} from "lucide-react";

interface SchoolInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

interface StudentInfo {
  id: string;
  school_id: string | null;
  class_id: string | null;
  stage_id: string | null;
  grade_level_id: string | null;
}

interface StageInfo {
  id: string;
  name: string;
  order_index: number | null;
}

interface GradeLevelInfo {
  id: string;
  name: string;
  order_index: number | null;
  stage_id: string;
}

interface ClassInfo {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  student_count: number;
  grade_level_id: string | null;
  stage_id: string | null;
}

interface SubjectInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  stage_id: string;
  grade_level_id: string | null;
}

interface TeacherInfo {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
}

interface LessonInfo {
  id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  meeting_link: string | null;
  class_id: string;
  teacher_id: string | null;
  teacher_name: string | null;
}

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number | null;
  is_free: boolean | null;
  isCompleted: boolean;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  joined_at: string | null;
  notes: string | null;
  lesson?: {
    subject: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
  };
}

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const StudentSchoolPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Subject content states
  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [subjectContent, setSubjectContent] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "student") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "student") {
      fetchStudentSchool();
    }
  }, [user, userRole]);

  const fetchStudentSchool = async () => {
    setIsLoading(true);
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, school_id, class_id, stage_id, grade_level_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student || !student.school_id) {
        setSchool(null);
        setIsLoading(false);
        return;
      }

      setStudentInfo(student);
      
      // Fetch attendance
      fetchMyAttendance(student.id);

      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, email, phone, address, logo_url")
        .eq("id", student.school_id)
        .maybeSingle();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      const [stagesRes, gradeLevelsRes, classesRes, subjectsRes, teachersRes, lessonsRes] = await Promise.all([
        supabase
          .from("global_stages")
          .select("id, name, order_index")
          .order("order_index"),
        
        supabase
          .from("grade_levels")
          .select("id, name, order_index, stage_id")
          .order("order_index"),
        
        supabase
          .from("classes")
          .select("id, name, description, teacher_id, grade_level_id, stage_id")
          .eq("school_id", student.school_id),
        
        supabase
          .from("subjects")
          .select("id, name, description, icon, stage_id, grade_level_id")
          .eq("school_id", student.school_id)
          .eq("is_active", true),
        
        supabase
          .from("school_teachers")
          .select("teacher_id")
          .eq("school_id", student.school_id),
        
        supabase
          .from("lessons")
          .select("id, subject, day_of_week, start_time, end_time, room, meeting_link, class_id, teacher_id")
          .eq("school_id", student.school_id)
          .order("day_of_week")
          .order("start_time")
      ]);

      if (stagesRes.data) setStages(stagesRes.data);
      if (gradeLevelsRes.data) setGradeLevels(gradeLevelsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);

      if (classesRes.data) {
        const classesWithDetails = await Promise.all(
          classesRes.data.map(async (cls) => {
            let teacherName = null;
            if (cls.teacher_id) {
              const { data: teacherData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", cls.teacher_id)
                .maybeSingle();
              teacherName = teacherData?.full_name || null;
            }
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("class_id", cls.id);

            return {
              ...cls,
              teacher_name: teacherName,
              student_count: count || 0
            };
          })
        );
        setClasses(classesWithDetails);
      }

      if (teachersRes.data && teachersRes.data.length > 0) {
        const teacherIds = teachersRes.data.map(t => t.teacher_id);
        const { data: teacherProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", teacherIds);
        if (teacherProfiles) setTeachers(teacherProfiles);
      }

      if (lessonsRes.data) {
        const lessonsWithTeachers = await Promise.all(
          lessonsRes.data.map(async (lesson) => {
            let teacherName = null;
            if (lesson.teacher_id) {
              const { data: teacherData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", lesson.teacher_id)
                .maybeSingle();
              teacherName = teacherData?.full_name || null;
            }
            return { ...lesson, teacher_name: teacherName };
          })
        );
        setLessons(lessonsWithTeachers);
      }

    } catch (error) {
      console.error("Error fetching student school:", error);
      toast({ title: "خطأ", description: "فشل في تحميل بيانات المدرسة", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyAttendance = async (studentId: string) => {
    setAttendanceLoading(true);
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          joined_at,
          notes,
          lesson_id
        `)
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(50);

      if (attendanceError) throw attendanceError;

      if (attendanceData && attendanceData.length > 0) {
        const lessonIds = attendanceData.map(a => a.lesson_id).filter(Boolean);
        let lessonsMap: Record<string, any> = {};
        
        if (lessonIds.length > 0) {
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("id, subject, start_time, end_time, day_of_week")
            .in("id", lessonIds);
          
          lessonsData?.forEach(l => {
            lessonsMap[l.id] = l;
          });
        }

        const enrichedData: AttendanceRecord[] = attendanceData.map(a => ({
          ...a,
          lesson: a.lesson_id ? lessonsMap[a.lesson_id] : undefined
        }));

        setAttendanceRecords(enrichedData);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchSubjectContent = async (subject: SubjectInfo) => {
    setContentLoading(true);
    try {
      const { data: contentData, error: contentError } = await supabase
        .from("subject_content")
        .select("*")
        .eq("subject_id", subject.id)
        .order("order_index");

      if (contentError) throw contentError;

      const { data: progressData } = await supabase
        .from("subject_content_progress")
        .select("content_id")
        .eq("user_id", user?.id)
        .eq("subject_id", subject.id);

      const completedIds = new Set((progressData || []).map(p => p.content_id));

      const contentWithProgress: ContentItem[] = (contentData || []).map(item => ({
        ...item,
        isCompleted: completedIds.has(item.id)
      }));

      setSubjectContent(contentWithProgress);
      const firstIncomplete = contentWithProgress.find(c => !c.isCompleted);
      setSelectedContent(firstIncomplete || contentWithProgress[0] || null);
    } catch (error) {
      console.error("Error fetching subject content:", error);
      toast({ title: "خطأ", description: "فشل في تحميل محتوى المادة", variant: "destructive" });
    } finally {
      setContentLoading(false);
    }
  };

  const markAsCompleted = async (contentItem: ContentItem) => {
    if (contentItem.isCompleted || !selectedSubject) return;

    try {
      const { error } = await supabase
        .from("subject_content_progress")
        .insert({
          user_id: user?.id,
          subject_id: selectedSubject.id,
          content_id: contentItem.id
        });

      if (error) throw error;

      setSubjectContent(prev => 
        prev.map(c => c.id === contentItem.id ? { ...c, isCompleted: true } : c)
      );
      setSelectedContent(prev => prev?.id === contentItem.id ? { ...prev, isCompleted: true } : prev);

      toast({ title: "تم!", description: "تم تسجيل إكمال الدرس" });
    } catch (error) {
      console.error("Error marking as completed:", error);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?\s]+)/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url;
  };

  const getClassLessons = (classId: string) => {
    return lessons.filter(l => l.class_id === classId);
  };

  const getLessonsByDay = (classId: string) => {
    const classLessons = getClassLessons(classId);
    return classLessons.reduce((acc, lesson) => {
      const day = lesson.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(lesson);
      return acc;
    }, {} as Record<number, LessonInfo[]>);
  };

  const isLessonActive = (lesson: LessonInfo) => {
    const now = new Date();
    const currentDay = now.getDay();
    if (currentDay !== lesson.day_of_week) return false;

    const [startHour, startMin] = lesson.start_time.split(':').map(Number);
    const [endHour, endMin] = lesson.end_time.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  // Filter classes to only show student's enrolled classes
  const studentClasses = classes.filter(cls => cls.id === studentInfo?.class_id);

  const completedCount = subjectContent.filter(c => c.isCompleted).length;
  const progress = subjectContent.length > 0 ? Math.round((completedCount / subjectContent.length) * 100) : 0;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "طالب"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">مدرستي</h1>
          <p className="text-muted-foreground">معلومات المدرسة والجدول الدراسي</p>
        </div>

        {!school ? (
          <Card>
            <CardContent className="py-12 text-center">
              <School className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لم يتم تسجيلك في مدرسة</h3>
              <p className="text-muted-foreground">تواصل مع إدارة المدرسة لإضافتك</p>
            </CardContent>
          </Card>
        ) : selectedSubject ? (
          // Subject Content View
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => {
                setSelectedSubject(null);
                setSubjectContent([]);
                setSelectedContent(null);
              }}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
                <p className="text-muted-foreground">
                  {completedCount} من {subjectContent.length} درس مكتمل ({progress}%)
                </p>
              </div>
            </div>

            {contentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : subjectContent.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">لا يوجد محتوى</h3>
                  <p className="text-muted-foreground">لم يتم إضافة محتوى لهذه المادة بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Content List */}
                <div className="lg:col-span-1 space-y-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">قائمة الدروس</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {subjectContent.map((item, index) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedContent(item)}
                            className={`w-full text-right p-3 rounded-lg transition-colors flex items-center gap-3 ${
                              selectedContent?.id === item.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              item.isCompleted 
                                ? 'bg-green-500 text-white' 
                                : selectedContent?.id === item.id 
                                  ? 'bg-primary-foreground text-primary' 
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.video_url && <Video className="h-3 w-3 opacity-60" />}
                                {item.pdf_url && <FileText className="h-3 w-3 opacity-60" />}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Content Viewer */}
                <div className="lg:col-span-2">
                  {selectedContent ? (
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                              {selectedContent.title}
                              {selectedContent.isCompleted && (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 ml-1" />
                                  مكتمل
                                </Badge>
                              )}
                            </CardTitle>
                            {selectedContent.description && (
                              <p className="text-muted-foreground mt-2">{selectedContent.description}</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Tabs defaultValue={selectedContent.video_url ? "video" : "pdf"}>
                          <TabsList>
                            {selectedContent.video_url && (
                              <TabsTrigger value="video" className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                فيديو
                              </TabsTrigger>
                            )}
                            {selectedContent.pdf_url && (
                              <TabsTrigger value="pdf" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                ملف PDF
                              </TabsTrigger>
                            )}
                          </TabsList>

                          {selectedContent.video_url && (
                            <TabsContent value="video" className="mt-4">
                              <VideoEmbed url={selectedContent.video_url} title={selectedContent.title} />
                              <Button
                                variant="outline"
                                className="mt-3"
                                onClick={() => window.open(selectedContent.video_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 ml-2" />
                                فتح في YouTube
                              </Button>
                            </TabsContent>
                          )}

                          {selectedContent.pdf_url && (
                            <TabsContent value="pdf" className="mt-4">
                              <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                                <iframe
                                  src={selectedContent.pdf_url}
                                  className="w-full h-full"
                                  title={selectedContent.title}
                                />
                              </div>
                              <Button
                                variant="outline"
                                className="mt-3"
                                onClick={() => window.open(selectedContent.pdf_url!, '_blank')}
                              >
                                <Download className="h-4 w-4 ml-2" />
                                تحميل الملف
                              </Button>
                            </TabsContent>
                          )}
                        </Tabs>

                        {!selectedContent.isCompleted && (
                          <Button 
                            className="w-full" 
                            onClick={() => markAsCompleted(selectedContent)}
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            تحديد كمكتمل
                          </Button>
                        )}

                        <div className="flex justify-between pt-4 border-t">
                          <Button
                            variant="outline"
                            disabled={subjectContent.findIndex(c => c.id === selectedContent.id) === 0}
                            onClick={() => {
                              const currentIndex = subjectContent.findIndex(c => c.id === selectedContent.id);
                              if (currentIndex > 0) {
                                setSelectedContent(subjectContent[currentIndex - 1]);
                              }
                            }}
                          >
                            <ArrowRight className="h-4 w-4 ml-2" />
                            الدرس السابق
                          </Button>
                          <Button
                            disabled={subjectContent.findIndex(c => c.id === selectedContent.id) === subjectContent.length - 1}
                            onClick={() => {
                              const currentIndex = subjectContent.findIndex(c => c.id === selectedContent.id);
                              if (currentIndex < subjectContent.length - 1) {
                                setSelectedContent(subjectContent[currentIndex + 1]);
                              }
                            }}
                          >
                            الدرس التالي
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">اختر درساً للبدء</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* School Info Card */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {school.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span dir="ltr">{school.email}</span>
                      </div>
                    )}
                    {school.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span dir="ltr">{school.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <h2 className="text-xl font-bold">{school.name}</h2>
                    </div>
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={school.name} className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <School className="h-7 w-7 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Tabs */}
            <Tabs defaultValue="classes" className="space-y-4">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                <TabsTrigger 
                  value="stages" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <Layers className="h-4 w-4" />
                  المراحل
                </TabsTrigger>
                <TabsTrigger 
                  value="gradeLevels" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <ListOrdered className="h-4 w-4" />
                  الصفوف
                </TabsTrigger>
                <TabsTrigger 
                  value="subjects" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  المواد
                </TabsTrigger>
                <TabsTrigger 
                  value="classes" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <Users className="h-4 w-4" />
                  الفصول
                </TabsTrigger>
                <TabsTrigger 
                  value="teachers" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  المعلمين
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  الحضور والغياب
                </TabsTrigger>
              </TabsList>

              {/* Stages Tab */}
              <TabsContent value="stages">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      المراحل الدراسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد مراحل
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stages.map(stage => (
                          <div 
                            key={stage.id} 
                            className={`p-4 border rounded-lg ${
                              studentInfo?.stage_id === stage.id 
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Layers className="h-5 w-5 text-primary" />
                                </div>
                                <p className="font-semibold">{stage.name}</p>
                              </div>
                              {studentInfo?.stage_id === stage.id && (
                                <Badge variant="default">مرحلتي</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Grade Levels Tab */}
              <TabsContent value="gradeLevels">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListOrdered className="h-5 w-5" />
                      الصفوف الدراسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gradeLevels.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد صفوف
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {gradeLevels.map(level => {
                          const stageName = stages.find(s => s.id === level.stage_id)?.name;
                          return (
                            <div 
                              key={level.id} 
                              className={`p-4 border rounded-lg ${
                                studentInfo?.grade_level_id === level.id 
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <ListOrdered className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{level.name}</p>
                                    {stageName && (
                                      <p className="text-sm text-muted-foreground">{stageName}</p>
                                    )}
                                  </div>
                                </div>
                                {studentInfo?.grade_level_id === level.id && (
                                  <Badge variant="default">صفي</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subjects Tab */}
              <TabsContent value="subjects">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      المواد الدراسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subjects.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد مواد
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {subjects.map(subject => {
                          const isMySubject = 
                            (studentInfo?.stage_id === subject.stage_id) &&
                            (!subject.grade_level_id || studentInfo?.grade_level_id === subject.grade_level_id);
                          return (
                            <div 
                              key={subject.id} 
                              className={`p-4 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                                isMySubject ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => {
                                setSelectedSubject(subject);
                                fetchSubjectContent(subject);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{subject.name}</p>
                                    {subject.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-1">
                                        {subject.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isMySubject && (
                                  <Badge variant="default">مادتي</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Classes Tab - Only student's enrolled classes */}
              <TabsContent value="classes">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      فصولي الدراسية
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">الفصول المسجل فيها</p>
                  </CardHeader>
                  <CardContent>
                    {studentClasses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لم يتم تسجيلك في أي فصل بعد
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentClasses.map(cls => (
                          <Collapsible 
                            key={cls.id}
                            open={expandedClassId === cls.id}
                            onOpenChange={(open) => setExpandedClassId(open ? cls.id : null)}
                          >
                            <div className="p-4 border rounded-lg border-primary bg-primary/5">
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold flex items-center gap-2">
                                        {cls.name}
                                        <Badge variant="outline" className="text-xs">فصلي</Badge>
                                      </p>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        {cls.teacher_name && (
                                          <span className="text-primary">المعلم: {cls.teacher_name}</span>
                                        )}
                                        <span>{cls.student_count} طالب</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{cls.student_count} طالب</Badge>
                                    {expandedClassId === cls.id ? (
                                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent className="mt-4">
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-3">جدول الحصص</h4>
                                  {getClassLessons(cls.id).length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                      لا توجد حصص مجدولة لهذا الفصل
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                                        {/* Day Headers */}
                                        {dayNames.map((day, index) => (
                                          <div 
                                            key={index}
                                            className="bg-primary text-primary-foreground rounded-lg p-2 text-center font-semibold text-sm"
                                          >
                                            {day}
                                          </div>
                                        ))}

                                        {/* Lessons for each day */}
                                        {dayNames.map((_, dayIndex) => {
                                          const dayLessons = getLessonsByDay(cls.id)[dayIndex] || [];
                                          return (
                                            <div key={dayIndex} className="space-y-2 min-h-[80px]">
                                              {dayLessons.length === 0 ? (
                                                <div className="text-center text-xs text-muted-foreground py-2">
                                                  -
                                                </div>
                                              ) : (
                                                dayLessons.map(lesson => {
                                                  const isActive = isLessonActive(lesson);
                                                  return (
                                                    <div 
                                                      key={lesson.id}
                                                      className={`p-2 border rounded-lg text-xs ${
                                                        isActive 
                                                          ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                                                          : 'hover:bg-muted/50'
                                                      }`}
                                                    >
                                                      <p className="font-medium">{lesson.subject}</p>
                                                      <p className="text-muted-foreground">
                                                        {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                                                      </p>
                                                      {isActive && lesson.meeting_link && (
                                                        <Button 
                                                          size="sm" 
                                                          className="w-full mt-1 gap-1 h-6 text-xs"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(lesson.meeting_link!, '_blank');
                                                          }}
                                                        >
                                                          <Video className="h-3 w-3" />
                                                          انضم
                                                        </Button>
                                                      )}
                                                      {!isActive && lesson.meeting_link && (
                                                        <Button 
                                                          size="sm" 
                                                          variant="outline"
                                                          className="w-full mt-1 gap-1 h-6 text-xs"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(lesson.meeting_link!, '_blank');
                                                          }}
                                                        >
                                                          <ExternalLink className="h-3 w-3" />
                                                          رابط
                                                        </Button>
                                                      )}
                                                      <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        className="w-full mt-1 gap-1 h-6 text-xs"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigate(`/dashboard/lessons/${lesson.id}`);
                                                        }}
                                                      >
                                                        <Info className="h-3 w-3" />
                                                        تفاصيل
                                                      </Button>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teachers Tab */}
              <TabsContent value="teachers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      معلمين المدرسة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لا يوجد معلمين
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {teachers.map(teacher => {
                          const isMyTeacher = classes.some(
                            c => c.id === studentInfo?.class_id && c.teacher_id === teacher.id
                          );
                          return (
                            <div 
                              key={teacher.id} 
                              className={`p-4 border rounded-lg ${
                                isMyTeacher ? 'border-primary bg-primary/5' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {teacher.avatar_url ? (
                                  <img 
                                    src={teacher.avatar_url} 
                                    alt={teacher.full_name}
                                    className="h-12 w-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="h-6 w-6 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold flex items-center gap-2">
                                    {teacher.full_name}
                                    {isMyTeacher && (
                                      <Badge variant="default" className="text-xs">معلمي</Badge>
                                    )}
                                  </p>
                                  {teacher.email && (
                                    <p className="text-sm text-muted-foreground" dir="ltr">
                                      {teacher.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      سجل الحضور والغياب
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendanceLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>لا توجد سجلات حضور</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attendanceRecords.map((record) => (
                          <div 
                            key={record.id} 
                            className={`p-4 border rounded-lg flex items-center justify-between ${
                              record.status === 'present' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                              record.status === 'absent' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                              record.status === 'late' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
                              'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${
                                record.status === 'present' ? 'bg-green-500' :
                                record.status === 'absent' ? 'bg-red-500' :
                                record.status === 'late' ? 'bg-blue-500' :
                                'bg-blue-500'
                              }`}>
                                {record.status === 'present' ? (
                                  <CheckCircle className="h-5 w-5 text-white" />
                                ) : record.status === 'absent' ? (
                                  <ClipboardCheck className="h-5 w-5 text-white" />
                                ) : record.status === 'late' ? (
                                  <Clock className="h-5 w-5 text-white" />
                                ) : (
                                  <Info className="h-5 w-5 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {record.lesson?.subject || 'حصة'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{record.date}</span>
                                  {record.lesson && (
                                    <>
                                      <span>•</span>
                                      <span>{dayNames[record.lesson.day_of_week]}</span>
                                      <span>•</span>
                                      <span>{record.lesson.start_time} - {record.lesson.end_time}</span>
                                    </>
                                  )}
                                </div>
                                {record.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant={
                                record.status === 'present' ? 'default' :
                                record.status === 'absent' ? 'destructive' :
                                record.status === 'late' ? 'secondary' :
                                'outline'
                              }
                              className={
                                record.status === 'present' ? 'bg-green-500' :
                                record.status === 'late' ? 'bg-blue-500 text-black' :
                                ''
                              }
                            >
                              {record.status === 'present' ? 'حاضر' :
                               record.status === 'absent' ? 'غائب' :
                               record.status === 'late' ? 'متأخر' :
                               'معذور'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentSchoolPage;