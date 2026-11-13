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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Users, GraduationCap, BookOpen, ArrowRight, Pencil, Calendar, Table2, Info, Video, ExternalLink, ClipboardCheck, UserCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface SchoolClass {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  teacher_id: string | null;
}

interface School {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Student {
  id: string;
  user_id: string;
  student_number: string | null;
  profile: { full_name: string; email: string | null } | null;
}

interface GlobalStage {
  id: string;
  name: string;
  order_index: number;
}

interface GradeLevel {
  id: string;
  name: string;
  stage_id: string;
  order_index: number;
}

interface Lesson {
  id: string;
  class_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  meeting_link: string | null;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  lesson_id: string;
  date: string;
  status: string;
  joined_at: string | null;
  student?: { profile?: { full_name: string } | null; student_number: string | null };
  lesson?: { subject: string; start_time: string; end_time: string };
}

interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  lesson_id: string;
  date: string;
  status: string;
  joined_at: string | null;
  teacher?: { full_name: string };
  lesson?: { subject: string; start_time: string; end_time: string };
}

const TeacherSchoolDetailsPage = () => {
  const { id: schoolId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Classes
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classLessons, setClassLessons] = useState<Record<string, any[]>>({});
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});
  
  // Global stages and grade levels (read-only)
  const [globalStages, setGlobalStages] = useState<GlobalStage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  
  // Class form
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassGradeLevelId, setNewClassGradeLevelId] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // Lesson form
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedClassForLesson, setSelectedClassForLesson] = useState<string | null>(null);
  const [lessonSubject, setLessonSubject] = useState("");
  const [lessonDayOfWeek, setLessonDayOfWeek] = useState(0);
  const [lessonStartTime, setLessonStartTime] = useState("08:00");
  const [lessonEndTime, setLessonEndTime] = useState("08:45");
  const [lessonRoom, setLessonRoom] = useState("");
  const [lessonMeetingLink, setLessonMeetingLink] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState<"table" | "calendar">("calendar");
  
  // Class students management
  const [classStudentsDialogOpen, setClassStudentsDialogOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);
  const [classStudentsList, setClassStudentsList] = useState<Student[]>([]);
  const [studentsNotInClass, setStudentsNotInClass] = useState<Student[]>([]);

  // Attendance management
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "teacher") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "teacher" && schoolId) {
      fetchSchoolData();
    }
  }, [user, userRole, schoolId]);

  const fetchSchoolData = async () => {
    setIsLoading(true);
    try {
      // Check if teacher is assigned to this school
      const { data: assignment } = await supabase
        .from("school_teachers")
        .select("id")
        .eq("school_id", schoolId)
        .eq("teacher_id", user?.id)
        .single();

      if (!assignment) {
        toast({ title: "خطأ", description: "ليس لديك صلاحية الوصول لهذه المدرسة", variant: "destructive" });
        navigate("/dashboard/my-schools");
        return;
      }

      // Fetch school
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, email, phone")
        .eq("id", schoolId)
        .single();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      // Fetch global stages
      const { data: stagesData } = await supabase
        .from("global_stages")
        .select("*")
        .order("order_index");
      setGlobalStages(stagesData || []);

      // Fetch grade levels
      const { data: gradeData } = await supabase
        .from("grade_levels")
        .select("*")
        .order("order_index");
      setGradeLevels(gradeData || []);

      // Fetch only teacher's classes in this school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name, description, grade_level, teacher_id")
        .eq("school_id", schoolId)
        .eq("teacher_id", user?.id);
      
      setClasses(classesData || []);

      // Fetch student counts for each class
      if (classesData && classesData.length > 0) {
        const counts: Record<string, number> = {};
        for (const cls of classesData) {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id);
          counts[cls.id] = count || 0;
        }
        setClassStudentCounts(counts);
      }

    } catch (error) {
      console.error("Error fetching school data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل بيانات المدرسة", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Class functions
  const handleCreateOrUpdateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const gradeLevel = gradeLevels.find(g => g.id === newClassGradeLevelId);
      const gradeLevelName = gradeLevel ? `${getStageName(gradeLevel.stage_id)} - ${gradeLevel.name}` : null;
      
      if (editingClassId) {
        const { error } = await supabase
          .from("classes")
          .update({
            name: newClassName,
            description: newClassDescription || null,
            grade_level: gradeLevelName
          })
          .eq("id", editingClassId)
          .eq("teacher_id", user?.id); // Ensure teacher owns this class

        if (error) throw error;
        toast({ title: "تم تعديل الفصل بنجاح" });
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            name: newClassName,
            description: newClassDescription || null,
            grade_level: gradeLevelName,
            teacher_id: user?.id,
            school_id: schoolId
          });

        if (error) throw error;
        toast({ title: "تم إنشاء الفصل بنجاح" });
      }
      resetClassForm();
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetClassForm = () => {
    setClassDialogOpen(false);
    setNewClassName("");
    setNewClassDescription("");
    setNewClassGradeLevelId("");
    setEditingClassId(null);
  };

  const openEditClassDialog = (cls: SchoolClass) => {
    setNewClassName(cls.name);
    setNewClassDescription(cls.description || "");
    setEditingClassId(cls.id);
    setClassDialogOpen(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الحصص المرتبطة به.")) return;
    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId)
        .eq("teacher_id", user?.id);

      if (error) throw error;
      toast({ title: "تم حذف الفصل" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Lesson functions
  const handleCreateOrUpdateLesson = async () => {
    if (!selectedClassForLesson || !lessonSubject.trim()) return;
    try {
      const lessonData = {
        class_id: selectedClassForLesson,
        school_id: schoolId,
        teacher_id: user?.id,
        subject: lessonSubject,
        day_of_week: lessonDayOfWeek,
        start_time: lessonStartTime,
        end_time: lessonEndTime,
        room: lessonRoom || null,
        meeting_link: lessonMeetingLink || null
      };

      if (editingLessonId) {
        const { error } = await supabase
          .from("lessons")
          .update(lessonData)
          .eq("id", editingLessonId);

        if (error) throw error;
        toast({ title: "تم تعديل الحصة بنجاح" });
      } else {
        const { error } = await supabase
          .from("lessons")
          .insert(lessonData);

        if (error) throw error;
        toast({ title: "تم إضافة الحصة بنجاح" });
      }
      resetLessonForm();
      // Update lessons list
      if (selectedClassForLesson) {
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .eq("class_id", selectedClassForLesson)
          .order("day_of_week");
        setClassLessons(prev => ({ ...prev, [selectedClassForLesson]: lessonsData || [] }));
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetLessonForm = () => {
    setLessonDialogOpen(false);
    setLessonSubject("");
    setLessonDayOfWeek(0);
    setLessonStartTime("08:00");
    setLessonEndTime("08:45");
    setLessonRoom("");
    setLessonMeetingLink("");
    setEditingLessonId(null);
  };

  const openAddLessonDialog = (classId: string) => {
    setSelectedClassForLesson(classId);
    resetLessonForm();
    setLessonDialogOpen(true);
  };

  const openEditLessonDialog = (lesson: any) => {
    setSelectedClassForLesson(lesson.class_id);
    setLessonSubject(lesson.subject);
    setLessonDayOfWeek(lesson.day_of_week);
    setLessonStartTime(lesson.start_time);
    setLessonEndTime(lesson.end_time);
    setLessonRoom(lesson.room || "");
    setLessonMeetingLink(lesson.meeting_link || "");
    setEditingLessonId(lesson.id);
    setLessonDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string, classId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;
    try {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;
      toast({ title: "تم حذف الحصة" });
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", classId)
        .order("day_of_week");
      setClassLessons(prev => ({ ...prev, [classId]: lessonsData || [] }));
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Class students functions
  const openClassStudentsDialog = async (classId: string) => {
    setSelectedClassForStudents(classId);
    try {
      // Get students in this class
      const { data: classStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number, school_id")
        .eq("class_id", classId);

      if (classStudentsData && classStudentsData.length > 0) {
        const studentUserIds = classStudentsData.map(s => s.user_id).filter(Boolean);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentUserIds);

        const studentsWithProfiles = classStudentsData.map(s => ({
          ...s,
          profile: studentProfiles?.find(p => p.id === s.user_id) || null
        }));
        setClassStudentsList(studentsWithProfiles);
      } else {
        setClassStudentsList([]);
      }

      // Get students in this school not in this class
      const { data: schoolStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number, school_id")
        .eq("school_id", schoolId)
        .or(`class_id.is.null,class_id.neq.${classId}`);

      if (schoolStudentsData && schoolStudentsData.length > 0) {
        const studentUserIds = schoolStudentsData.map(s => s.user_id).filter(Boolean);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentUserIds);

        const studentsWithProfiles = schoolStudentsData.map(s => ({
          ...s,
          profile: studentProfiles?.find(p => p.id === s.user_id) || null
        }));
        setStudentsNotInClass(studentsWithProfiles);
      } else {
        setStudentsNotInClass([]);
      }

      setClassStudentsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching class students:", error);
    }
  };

  const handleAssignStudentToClass = async (studentId: string) => {
    if (!selectedClassForStudents) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: selectedClassForStudents })
        .eq("id", studentId);

      if (error) throw error;
      toast({ title: "تم إسناد الطالب للفصل" });
      openClassStudentsDialog(selectedClassForStudents);
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string) => {
    if (!selectedClassForStudents) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId);

      if (error) throw error;
      toast({ title: "تم إزالة الطالب من الفصل" });
      openClassStudentsDialog(selectedClassForStudents);
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const toggleClassExpand = async (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      return;
    }
    
    setExpandedClassId(classId);
    
    if (!classLessons[classId]) {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", classId)
        .order("day_of_week");
      
      setClassLessons(prev => ({ ...prev, [classId]: lessonsData || [] }));
    }
  };

  const getDayName = (day: number) => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[day] || "";
  };

  const getGradeLevelsByStage = (stageId: string) => {
    return gradeLevels.filter(g => g.stage_id === stageId);
  };

  const getStageName = (stageId: string) => {
    return globalStages.find(s => s.id === stageId)?.name || "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">حاضر</Badge>;
      case 'absent':
        return <Badge variant="destructive">غائب</Badge>;
      case 'late':
        return <Badge className="bg-blue-500">متأخر</Badge>;
      case 'excused':
        return <Badge className="bg-blue-500">مستأذن</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleJoinMeeting = async (lesson: Lesson, classId: string) => {
    if (!lesson.meeting_link) {
      toast({ title: "خطأ", description: "لا يوجد لينك ميتنج لهذه الحصة", variant: "destructive" });
      return;
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    
    // Check if it's the correct day
    if (now.getDay() !== lesson.day_of_week) {
      toast({ title: "تنبيه", description: "هذه الحصة ليست اليوم، سيتم فتح الرابط فقط بدون تسجيل حضور", variant: "default" });
      window.open(lesson.meeting_link, "_blank");
      return;
    }

    // Parse lesson times
    const [startHour, startMin] = lesson.start_time.split(":").map(Number);
    const [endHour, endMin] = lesson.end_time.split(":").map(Number);
    
    const lessonStart = new Date();
    lessonStart.setHours(startHour, startMin, 0, 0);
    
    const lessonEnd = new Date();
    lessonEnd.setHours(endHour, endMin, 0, 0);
    
    // 15 minutes before lesson start
    const allowedStart = new Date(lessonStart.getTime() - 15 * 60 * 1000);
    
    // Check if current time is within allowed window
    if (now < allowedStart) {
      const minsUntilAllowed = Math.ceil((allowedStart.getTime() - now.getTime()) / 60000);
      toast({ 
        title: "مبكر جداً", 
        description: `يمكنك الانضمام قبل الحصة بـ 15 دقيقة فقط. انتظر ${minsUntilAllowed} دقيقة`, 
        variant: "default" 
      });
      return;
    }
    
    if (now > lessonEnd) {
      toast({ 
        title: "انتهت الحصة", 
        description: "لا يمكن تسجيل الحضور بعد انتهاء وقت الحصة", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Record teacher attendance
      const { data: existingAtt } = await supabase
        .from("teacher_attendance")
        .select("id")
        .eq("teacher_id", user?.id)
        .eq("lesson_id", lesson.id)
        .eq("date", today)
        .single();

      if (!existingAtt) {
        await supabase.from("teacher_attendance").insert({
          teacher_id: user?.id,
          lesson_id: lesson.id,
          date: today,
          status: "present",
          attendance_type: "school_lesson",
          joined_at: now.toISOString()
        });
        toast({ title: "تم تسجيل حضورك", description: `تم تسجيل حضورك لحصة ${lesson.subject}` });
      }

      // Open meeting link
      window.open(lesson.meeting_link, "_blank");
    } catch (error) {
      console.error("Error recording attendance:", error);
      // Still open the link even if attendance fails
      window.open(lesson.meeting_link, "_blank");
    }
  };

  const openAttendanceDialog = async (classId: string) => {
    setSelectedClassForAttendance(classId);
    setAttendanceDialogOpen(true);
    await fetchAttendance(classId, attendanceDate);
  };

  const fetchAttendance = async (classId: string, date: string) => {
    setLoadingAttendance(true);
    try {
      const lessonsData = classLessons[classId] || [];
      if (lessonsData.length === 0) {
        // Fetch lessons if not already loaded
        const { data: lessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("class_id", classId);
        if (lessons) {
          setClassLessons(prev => ({ ...prev, [classId]: lessons }));
        }
      }

      const lessonIds = (classLessons[classId] || []).map(l => l.id);
      if (lessonIds.length === 0) {
        setStudentAttendance([]);
        setTeacherAttendance([]);
        setLoadingAttendance(false);
        return;
      }

      // Fetch student attendance
      const { data: studentAttData } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("date", date)
        .in("lesson_id", lessonIds);

      // Enrich with student and lesson data
      if (studentAttData && studentAttData.length > 0) {
        const studentIds = studentAttData.map(a => a.student_id);
        const { data: students } = await supabase
          .from("students")
          .select("id, student_number, user_id")
          .in("id", studentIds);
        
        const userIds = students?.map(s => s.user_id).filter(Boolean) || [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const enriched = studentAttData.map(att => ({
          ...att,
          student: {
            student_number: students?.find(s => s.id === att.student_id)?.student_number || null,
            profile: profiles?.find(p => p.id === students?.find(s => s.id === att.student_id)?.user_id) || null
          },
          lesson: (classLessons[classId] || []).find(l => l.id === att.lesson_id) || null
        }));
        setStudentAttendance(enriched as AttendanceRecord[]);
      } else {
        setStudentAttendance([]);
      }

      // Fetch teacher attendance
      const { data: teacherAttData } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", user?.id)
        .eq("date", date)
        .in("lesson_id", lessonIds);

      if (teacherAttData && teacherAttData.length > 0) {
        const enriched = teacherAttData.map(att => ({
          ...att,
          teacher: profile || null,
          lesson: (classLessons[classId] || []).find(l => l.id === att.lesson_id) || null
        }));
        setTeacherAttendance(enriched as TeacherAttendanceRecord[]);
      } else {
        setTeacherAttendance([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoadingAttendance(false);
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
    <DashboardLayout userRole={userRole || "teacher"} userName={profile?.full_name || "معلم"}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/my-schools")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <h1 className="text-2xl font-bold">{school?.name}</h1>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              فصولي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>فصولي الدراسية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">الفصول التي تديرها في هذه المدرسة</p>
                </div>
                <Dialog open={classDialogOpen} onOpenChange={(open) => {
                  if (!open) resetClassForm();
                  else setClassDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />إنشاء فصل جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingClassId ? "تعديل الفصل" : "إنشاء فصل جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اسم الفصل *</Label>
                        <Input
                          placeholder="مثال: فصل 1/أ"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الوصف</Label>
                        <Input
                          placeholder="وصف الفصل (اختياري)"
                          value={newClassDescription}
                          onChange={(e) => setNewClassDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الصف الدراسي</Label>
                        <Select value={newClassGradeLevelId} onValueChange={setNewClassGradeLevelId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصف الدراسي" />
                          </SelectTrigger>
                          <SelectContent>
                            {globalStages.map((stage) => (
                              <div key={stage.id}>
                                <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                                  {stage.name}
                                </div>
                                {getGradeLevelsByStage(stage.id).map((grade) => (
                                  <SelectItem key={grade.id} value={grade.id}>
                                    {grade.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateOrUpdateClass} className="w-full" disabled={!newClassName.trim()}>
                        {editingClassId ? "تعديل" : "إنشاء الفصل"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد فصول</h3>
                    <p>اضغط على "إنشاء فصل جديد" لإضافة فصل</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div key={cls.id} className="border rounded-lg overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleClassExpand(cls.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{cls.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {cls.grade_level && <Badge variant="outline">{cls.grade_level}</Badge>}
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {classStudentCounts[cls.id] || 0} طالب
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditClassDialog(cls); }}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {expandedClassId === cls.id && (
                          <div className="p-4 border-t space-y-4">
                            {/* Schedule Section */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4 border-b">
                                <h4 className="font-semibold text-lg">جدول الحصص</h4>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={scheduleViewMode === "calendar" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setScheduleViewMode("calendar")}
                                  >
                                    <Calendar className="h-4 w-4 ml-1" />
                                    أسبوعي
                                  </Button>
                                  <Button
                                    variant={scheduleViewMode === "table" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setScheduleViewMode("table")}
                                  >
                                    <Table2 className="h-4 w-4 ml-1" />
                                    قائمة
                                  </Button>
                                  <Button size="sm" onClick={() => openAddLessonDialog(cls.id)}>
                                    <Plus className="h-4 w-4 ml-1" />إضافة حصة
                                  </Button>
                                </div>
                              </div>
                              <div className="p-4">
                                {classLessons[cls.id]?.length > 0 ? (
                                  <>
                                    {scheduleViewMode === "calendar" && (
                                      <div className="overflow-x-auto">
                                        <div className="min-w-[700px]">
                                          <div className="grid grid-cols-6 gap-2 mb-2">
                                            {[0, 1, 2, 3, 4, 5].map((day) => (
                                              <div key={day} className="text-center font-semibold p-2 bg-primary/10 rounded-lg">
                                                {getDayName(day)}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="grid grid-cols-6 gap-2">
                                            {[0, 1, 2, 3, 4, 5].map((day) => {
                                              const dayLessons = classLessons[cls.id]
                                                ?.filter((l: any) => l.day_of_week === day)
                                                .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
                                              return (
                                                <div key={day} className="min-h-[200px] space-y-2">
                                                  {dayLessons?.length > 0 ? (
                                                    dayLessons.map((lesson: any) => (
                                                      <div 
                                                        key={lesson.id} 
                                                        className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 hover:shadow-md transition-shadow group relative"
                                                      >
                                                        <div className="font-semibold text-sm text-foreground mb-1">
                                                          {lesson.subject}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground space-y-1">
                                                          <div className="flex items-center gap-1" dir="ltr">
                                                            <span className="font-medium">{lesson.start_time}</span>
                                                            <span>-</span>
                                                            <span className="font-medium">{lesson.end_time}</span>
                                                          </div>
                                                          {lesson.room && (
                                                            <div className="text-primary/70">
                                                              القاعة: {lesson.room}
                                                            </div>
                                                          )}
                                                        </div>
                                                        {lesson.meeting_link && (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full mt-2 h-7 text-xs"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleJoinMeeting(lesson, cls.id);
                                                            }}
                                                          >
                                                            <ExternalLink className="h-3 w-3 ml-1" />
                                                            انضم للميتنج
                                                          </Button>
                                                        )}
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          className="w-full mt-1 h-7 text-xs"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/dashboard/lessons/${lesson.id}`);
                                                          }}
                                                        >
                                                          <Video className="h-3 w-3 ml-1" />
                                                          تفاصيل الحصة
                                                        </Button>
                                                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                          <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6"
                                                            onClick={() => openEditLessonDialog(lesson)}
                                                          >
                                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                                          </Button>
                                                          <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6"
                                                            onClick={() => handleDeleteLesson(lesson.id, cls.id)}
                                                          >
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="h-full min-h-[80px] border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                                                      <span className="text-xs text-muted-foreground">لا توجد حصص</span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {scheduleViewMode === "table" && (
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/50">
                                              <TableHead className="font-semibold">اليوم</TableHead>
                                              <TableHead className="font-semibold">المادة</TableHead>
                                              <TableHead className="font-semibold">من</TableHead>
                                              <TableHead className="font-semibold">إلى</TableHead>
                                              <TableHead className="font-semibold">القاعة</TableHead>
                                              <TableHead className="font-semibold w-[100px]">إجراءات</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {classLessons[cls.id]
                                              .sort((a: any, b: any) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                                              .map((lesson: any) => (
                                              <TableRow key={lesson.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium text-primary">{getDayName(lesson.day_of_week)}</TableCell>
                                                <TableCell>{lesson.subject}</TableCell>
                                                <TableCell dir="ltr" className="text-muted-foreground">{lesson.start_time}</TableCell>
                                                <TableCell dir="ltr" className="text-muted-foreground">{lesson.end_time}</TableCell>
                                                <TableCell>{lesson.room || "-"}</TableCell>
                                                <TableCell>
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/lessons/${lesson.id}`)} title="تفاصيل الحصة">
                                                      <Info className="h-4 w-4 text-primary" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openEditLessonDialog(lesson)}>
                                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id, cls.id)}>
                                                      <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>لا توجد حصص - اضغط "إضافة حصة" لإنشاء جدول الفصل</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Students Section */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4">
                                <h4 className="font-semibold text-lg">الطلاب ({classStudentCounts[cls.id] || 0})</h4>
                                <Button size="sm" variant="outline" onClick={() => openClassStudentsDialog(cls.id)}>
                                  <Users className="h-4 w-4 ml-1" />إدارة الطلاب
                                </Button>
                              </div>
                            </div>

                            {/* Attendance Section */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                  <ClipboardCheck className="h-5 w-5 text-primary" />
                                  الحضور والغياب
                                </h4>
                                <Button size="sm" variant="outline" onClick={() => openAttendanceDialog(cls.id)}>
                                  <UserCheck className="h-4 w-4 ml-1" />عرض سجل الحضور
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lesson Dialog */}
        <Dialog open={lessonDialogOpen} onOpenChange={(open) => {
          if (!open) resetLessonForm();
          else setLessonDialogOpen(true);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLessonId ? "تعديل الحصة" : "إضافة حصة جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اليوم *</Label>
                  <Select value={lessonDayOfWeek.toString()} onValueChange={(val) => setLessonDayOfWeek(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر اليوم" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {getDayName(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المادة *</Label>
                  <Input
                    placeholder="مثال: الرياضيات"
                    value={lessonSubject}
                    onChange={(e) => setLessonSubject(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>وقت البداية *</Label>
                  <Input
                    type="time"
                    value={lessonStartTime}
                    onChange={(e) => setLessonStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>وقت النهاية *</Label>
                  <Input
                    type="time"
                    value={lessonEndTime}
                    onChange={(e) => setLessonEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>القاعة</Label>
                  <Input
                    placeholder="مثال: أ101"
                    value={lessonRoom}
                    onChange={(e) => setLessonRoom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>لينك الميتنج</Label>
                  <Input
                    placeholder="https://..."
                    value={lessonMeetingLink}
                    onChange={(e) => setLessonMeetingLink(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateOrUpdateLesson} className="w-full" disabled={!lessonSubject.trim()}>
                {editingLessonId ? "تعديل" : "إضافة الحصة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Class Students Dialog */}
        <Dialog open={classStudentsDialogOpen} onOpenChange={setClassStudentsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">إدارة طلاب الفصل</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Assign student */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <Label className="text-base font-semibold">إسناد طالب للفصل</Label>
                <p className="text-sm text-muted-foreground">اختر من طلاب المدرسة</p>
                {studentsNotInClass.length > 0 ? (
                  <SearchableSelect
                    value=""
                    onValueChange={handleAssignStudentToClass}
                    options={studentsNotInClass.map((student) => ({
                      value: student.id,
                      label: student.profile?.full_name || "غير معروف",
                      keywords: [student.student_number || ""],
                      content: (
                        <div className="flex items-center gap-2">
                          <span>{student.profile?.full_name || "غير معروف"}</span>
                          <Badge variant="outline" className="text-xs">
                            {student.student_number || "بدون رقم"}
                          </Badge>
                        </div>
                      ),
                    }))}
                    placeholder="اختر طالب لإسناده للفصل..."
                    searchPlaceholder="ابحث بالاسم أو رقم الطالب..."
                    emptyText="لا يوجد طلاب مطابقين"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">لا يوجد طلاب متاحين للإسناد</p>
                )}
              </div>
              
              {/* Current students */}
              <div className="bg-card rounded-lg border">
                <div className="p-4 border-b">
                  <h4 className="font-semibold text-lg">طلاب الفصل الحاليين ({classStudentsList.length})</h4>
                </div>
                <div className="p-4">
                  {classStudentsList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد طلاب في هذا الفصل</p>
                      <p className="text-sm">اختر طالباً من القائمة أعلاه لإسناده</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">الاسم</TableHead>
                          <TableHead className="font-semibold">رقم الطالب</TableHead>
                          <TableHead className="font-semibold">البريد الإلكتروني</TableHead>
                          <TableHead className="font-semibold w-[80px]">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudentsList.map((student) => (
                          <TableRow key={student.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{student.profile?.full_name || "غير معروف"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{student.student_number || "-"}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground" dir="ltr">
                              {student.profile?.email || "-"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveStudentFromClass(student.id)}
                                title="إزالة من الفصل"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Attendance Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                سجل الحضور والغياب
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Date Selector */}
              <div className="flex items-center gap-4">
                <Label>التاريخ:</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    if (selectedClassForAttendance) {
                      fetchAttendance(selectedClassForAttendance, e.target.value);
                    }
                  }}
                  className="w-48"
                />
              </div>

              {loadingAttendance ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Teacher Attendance */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      حضور المعلم
                    </h5>
                    {teacherAttendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا يوجد سجل حضور للمعلم في هذا التاريخ</p>
                    ) : (
                      <div className="space-y-2">
                        {teacherAttendance.map((record) => (
                          <div 
                            key={record.id} 
                            className={`p-3 border rounded-lg flex items-center justify-between ${
                              record.status === 'present' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                              record.status === 'absent' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                              'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {record.status === 'present' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : record.status === 'absent' ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-blue-500" />
                              )}
                              <div>
                                <p className="font-medium">{record.lesson?.subject || 'حصة'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {record.lesson?.start_time} - {record.lesson?.end_time}
                                  {record.joined_at && ` • وقت الانضمام: ${format(new Date(record.joined_at), "HH:mm")}`}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Student Attendance */}
                  <div className="bg-card rounded-lg border">
                    <div className="p-4 border-b">
                      <h5 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        حضور الطلاب ({studentAttendance.length})
                      </h5>
                    </div>
                    <div className="p-4">
                      {studentAttendance.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>لا يوجد سجل حضور للطلاب في هذا التاريخ</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-right font-semibold">الطالب</TableHead>
                              <TableHead className="text-right font-semibold">الحصة</TableHead>
                              <TableHead className="text-right font-semibold">وقت الانضمام</TableHead>
                              <TableHead className="text-right font-semibold">الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentAttendance.map((record) => (
                              <TableRow key={record.id} className="hover:bg-muted/30">
                                <TableCell className="text-right font-medium">
                                  {record.student?.profile?.full_name || "غير معروف"}
                                </TableCell>
                                <TableCell className="text-right">{record.lesson?.subject || "-"}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {record.joined_at ? format(new Date(record.joined_at), "HH:mm") : "-"}
                                </TableCell>
                                <TableCell className="text-right">{getStatusBadge(record.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TeacherSchoolDetailsPage;
