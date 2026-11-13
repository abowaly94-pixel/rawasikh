import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, LayoutGrid, ArrowRight, BookOpen, Calendar, Table2, ClipboardCheck, ExternalLink, CheckCircle, XCircle, Clock, UserCheck, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  teacher_id: string | null;
  teacher?: { full_name: string } | null;
}

interface Teacher {
  id: string;
  full_name: string;
}

interface Student {
  id: string;
  user_id: string;
  student_number: string | null;
  profile: { full_name: string; email: string | null } | null;
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

const IndependentGroupsPage = () => {
  const navigate = useNavigate();
  const { userRole, profile, user } = useAuth();
  const { toast } = useToast();
  
  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupLessons, setGroupLessons] = useState<Record<string, Lesson[]>>({});
  const [groupStudentCounts, setGroupStudentCounts] = useState<Record<string, number>>({});
  
  // Group form state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupGradeLevel, setGroupGradeLevel] = useState("");
  const [groupTeacherId, setGroupTeacherId] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  
  // Lesson form state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedGroupForLesson, setSelectedGroupForLesson] = useState<string | null>(null);
  const [lessonSubject, setLessonSubject] = useState("");
  const [lessonDayOfWeek, setLessonDayOfWeek] = useState(0);
  const [lessonStartTime, setLessonStartTime] = useState("08:00");
  const [lessonEndTime, setLessonEndTime] = useState("08:45");
  const [lessonRoom, setLessonRoom] = useState("");
  const [lessonMeetingLink, setLessonMeetingLink] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  // Students state
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<string | null>(null);
  const [groupStudentsList, setGroupStudentsList] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  
  // View mode
  const [scheduleViewMode, setScheduleViewMode] = useState<"table" | "calendar">("calendar");

  // Attendance state
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedGroupForAttendance, setSelectedGroupForAttendance] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Student's own attendance in independent groups
  const [myIndependentAttendance, setMyIndependentAttendance] = useState<AttendanceRecord[]>([]);
  const [myGroupInfo, setMyGroupInfo] = useState<Group | null>(null);

  useEffect(() => {
    if (userRole === "student") {
      fetchStudentGroupData();
    } else {
      fetchData();
    }
  }, [userRole, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch groups (classes without school_id)
      const { data: groupsData, error } = await supabase
        .from("classes")
        .select("id, name, description, grade_level, teacher_id")
        .is("school_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch teacher names
      if (groupsData && groupsData.length > 0) {
        const teacherIds = groupsData.map(g => g.teacher_id).filter(Boolean);
        let teacherMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: teachersData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", teacherIds);
          teachersData?.forEach(t => { teacherMap[t.id] = t.full_name; });
        }

        const groupsWithTeachers = groupsData.map(g => ({
          ...g,
          teacher: g.teacher_id ? { full_name: teacherMap[g.teacher_id] || "" } : null
        }));
        setGroups(groupsWithTeachers);

        // Fetch student counts
        const counts: Record<string, number> = {};
        for (const group of groupsData) {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", group.id);
          counts[group.id] = count || 0;
        }
        setGroupStudentCounts(counts);
      } else {
        setGroups([]);
      }

      // Fetch all teachers
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (teacherRoles && teacherRoles.length > 0) {
        const { data: teacherProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherRoles.map(r => r.user_id));
        setTeachers(teacherProfiles || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch student's independent group data and attendance
  const fetchStudentGroupData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get student record
      const { data: studentData } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData || !studentData.class_id) {
        // Check if the class is an independent group
        setMyGroupInfo(null);
        setMyIndependentAttendance([]);
        setLoading(false);
        return;
      }

      // Check if the class is independent (no school_id)
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, description, grade_level, teacher_id, school_id")
        .eq("id", studentData.class_id)
        .maybeSingle();

      if (!classData || classData.school_id !== null) {
        // Not an independent group
        setMyGroupInfo(null);
        setMyIndependentAttendance([]);
        setLoading(false);
        return;
      }

      // Fetch teacher name
      let teacherName = null;
      if (classData.teacher_id) {
        const { data: teacherData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", classData.teacher_id)
          .maybeSingle();
        teacherName = teacherData?.full_name || null;
      }

      setMyGroupInfo({
        ...classData,
        teacher: teacherName ? { full_name: teacherName } : null
      });

      // Fetch lessons for the group
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", classData.id)
        .order("day_of_week");
      
      setGroupLessons(prev => ({ ...prev, [classData.id]: lessonsData || [] }));

      // Fetch student attendance for this group
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("id, date, status, joined_at, notes, lesson_id")
        .eq("student_id", studentData.id)
        .eq("class_id", classData.id)
        .order("date", { ascending: false })
        .limit(50);

      if (attendanceData && attendanceData.length > 0) {
        const lessonIds = attendanceData.map(a => a.lesson_id).filter(Boolean);
        let lessonsMap: Record<string, any> = {};
        
        if (lessonIds.length > 0) {
          const { data: lessonsInfo } = await supabase
            .from("lessons")
            .select("id, subject, start_time, end_time, day_of_week")
            .in("id", lessonIds);
          
          lessonsInfo?.forEach(l => {
            lessonsMap[l.id] = l;
          });
        }

        const enrichedData: AttendanceRecord[] = attendanceData.map(a => ({
          ...a,
          student_id: studentData.id,
          lesson: a.lesson_id ? lessonsMap[a.lesson_id] : undefined,
          student: undefined
        }));

        setMyIndependentAttendance(enrichedData);
      } else {
        setMyIndependentAttendance([]);
      }
    } catch (error) {
      console.error("Error fetching student group data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[day] || "";
  };

  // Group functions
  const handleCreateOrUpdateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const teacherId = userRole === "teacher" ? user?.id : (groupTeacherId || null);
      
      if (editingGroupId) {
        const { error } = await supabase
          .from("classes")
          .update({
            name: groupName,
            description: groupDescription || null,
            grade_level: groupGradeLevel || null,
            teacher_id: teacherId
          })
          .eq("id", editingGroupId);

        if (error) throw error;
        toast({ title: "تم تعديل المجموعة بنجاح" });
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            name: groupName,
            description: groupDescription || null,
            grade_level: groupGradeLevel || null,
            teacher_id: teacherId,
            school_id: null // مستقلة بدون مدرسة
          });

        if (error) throw error;
        toast({ title: "تم إنشاء المجموعة بنجاح" });
      }
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetGroupForm = () => {
    setGroupDialogOpen(false);
    setGroupName("");
    setGroupDescription("");
    setGroupGradeLevel("");
    setGroupTeacherId("");
    setEditingGroupId(null);
  };

  const openEditGroupDialog = (group: Group) => {
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupGradeLevel(group.grade_level || "");
    setGroupTeacherId(group.teacher_id || "");
    setEditingGroupId(group.id);
    setGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع الحصص المرتبطة بها.")) return;
    try {
      const { error } = await supabase.from("classes").delete().eq("id", groupId);
      if (error) throw error;
      toast({ title: "تم حذف المجموعة" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const toggleGroupExpand = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    
    if (!groupLessons[groupId]) {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", groupId)
        .order("day_of_week");
      setGroupLessons(prev => ({ ...prev, [groupId]: lessonsData || [] }));
    }
  };

  // Lesson functions
  const handleCreateOrUpdateLesson = async () => {
    if (!selectedGroupForLesson || !lessonSubject.trim()) return;
    try {
      const lessonData = {
        class_id: selectedGroupForLesson,
        subject: lessonSubject,
        day_of_week: lessonDayOfWeek,
        start_time: lessonStartTime,
        end_time: lessonEndTime,
        room: lessonRoom || null,
        meeting_link: lessonMeetingLink || null
      };

      if (editingLessonId) {
        const { error } = await supabase.from("lessons").update(lessonData).eq("id", editingLessonId);
        if (error) throw error;
        toast({ title: "تم تعديل الحصة بنجاح" });
      } else {
        const { error } = await supabase.from("lessons").insert(lessonData);
        if (error) throw error;
        toast({ title: "تم إضافة الحصة بنجاح" });
      }
      resetLessonForm();
      
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", selectedGroupForLesson)
        .order("day_of_week");
      setGroupLessons(prev => ({ ...prev, [selectedGroupForLesson]: lessonsData || [] }));
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

  const openAddLessonDialog = (groupId: string) => {
    setSelectedGroupForLesson(groupId);
    resetLessonForm();
    setLessonDialogOpen(true);
  };

  const openEditLessonDialog = (lesson: Lesson) => {
    setSelectedGroupForLesson(lesson.class_id);
    setLessonSubject(lesson.subject);
    setLessonDayOfWeek(lesson.day_of_week);
    setLessonStartTime(lesson.start_time);
    setLessonEndTime(lesson.end_time);
    setLessonRoom(lesson.room || "");
    setLessonMeetingLink(lesson.meeting_link || "");
    setEditingLessonId(lesson.id);
    setLessonDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string, groupId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
      toast({ title: "تم حذف الحصة" });
      
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", groupId)
        .order("day_of_week");
      setGroupLessons(prev => ({ ...prev, [groupId]: lessonsData || [] }));
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Students functions
  const openStudentsDialog = async (groupId: string) => {
    setSelectedGroupForStudents(groupId);
    try {
      // Fetch students in this group
      const { data: groupStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .eq("class_id", groupId);

      if (groupStudentsData && groupStudentsData.length > 0) {
        const userIds = groupStudentsData.map(s => s.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        setGroupStudentsList(groupStudentsData.map(s => ({
          ...s,
          profile: profiles?.find(p => p.id === s.user_id) || null
        })));
      } else {
        setGroupStudentsList([]);
      }

      // Fetch all students not in this group
      const { data: allStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .neq("class_id", groupId);
      
      const { data: noClassStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .is("class_id", null);

      const combined = [...(allStudentsData || []), ...(noClassStudentsData || [])];
      const unique = combined.filter((s, i, self) => i === self.findIndex(x => x.id === s.id));

      if (unique.length > 0) {
        const userIds = unique.map(s => s.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        setAvailableStudents(unique.map(s => ({
          ...s,
          profile: profiles?.find(p => p.id === s.user_id) || null
        })));
      } else {
        setAvailableStudents([]);
      }

      setStudentsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: selectedGroupForStudents })
        .eq("id", studentId);

      if (error) throw error;
      toast({ title: "تم إسناد الطالب للمجموعة" });
      openStudentsDialog(selectedGroupForStudents);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId);

      if (error) throw error;
      toast({ title: "تم إزالة الطالب من المجموعة" });
      openStudentsDialog(selectedGroupForStudents);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Attendance functions
  const openAttendanceDialog = async (groupId: string) => {
    setSelectedGroupForAttendance(groupId);
    setAttendanceDialogOpen(true);
    await fetchAttendanceData(groupId, attendanceDate);
  };

  const fetchAttendanceData = async (groupId: string, date: string) => {
    setLoadingAttendance(true);
    try {
      // Get lessons for this group
      const lessonsData = groupLessons[groupId] || [];
      const lessonIds = lessonsData.map(l => l.id);
      
      if (lessonIds.length === 0) {
        setStudentAttendance([]);
        setTeacherAttendance([]);
        setLoadingAttendance(false);
        return;
      }

      // Fetch student attendance for this date
      const { data: studentAttData } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", groupId)
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
          lesson: lessonsData.find(l => l.id === att.lesson_id) || null
        }));
        setStudentAttendance(enriched as AttendanceRecord[]);
      } else {
        setStudentAttendance([]);
      }

      // Get group teacher
      const group = groups.find(g => g.id === groupId);
      if (group?.teacher_id) {
        // Fetch teacher attendance
        const { data: teacherAttData } = await supabase
          .from("teacher_attendance")
          .select("*")
          .eq("teacher_id", group.teacher_id)
          .eq("date", date)
          .in("lesson_id", lessonIds);

        if (teacherAttData && teacherAttData.length > 0) {
          const { data: teacherProfile } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", group.teacher_id)
            .single();

          const enriched = teacherAttData.map(att => ({
            ...att,
            teacher: teacherProfile || null,
            lesson: lessonsData.find(l => l.id === att.lesson_id) || null
          }));
          setTeacherAttendance(enriched as TeacherAttendanceRecord[]);
        } else {
          setTeacherAttendance([]);
        }
      } else {
        setTeacherAttendance([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleJoinMeeting = async (lesson: Lesson, groupId: string) => {
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
    
    // Check if current time is within allowed window (15 min before to lesson end)
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
        description: "لا يمكن تسجيل الحضور بعد انتهاء وقت الحصة. سيتم تسجيلك غائب تلقائياً", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // If user is a student, record student attendance
      if (userRole === "student") {
        // Get student record
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user?.id)
          .eq("class_id", groupId)
          .single();

        if (studentData) {
          // Check if attendance already exists
          const { data: existingAtt } = await supabase
            .from("attendance")
            .select("id")
            .eq("student_id", studentData.id)
            .eq("lesson_id", lesson.id)
            .eq("date", today)
            .single();

          if (!existingAtt) {
            await supabase.from("attendance").insert({
              student_id: studentData.id,
              class_id: groupId,
              lesson_id: lesson.id,
              date: today,
              status: "present",
              joined_at: now.toISOString()
            });
            toast({ title: "تم تسجيل حضورك", description: `تم تسجيل حضورك لحصة ${lesson.subject}` });
          }
        }
      }

      // If user is a teacher, record teacher attendance
      if (userRole === "teacher" || userRole === "admin") {
        const group = groups.find(g => g.id === groupId);
        const teacherId = userRole === "teacher" ? user?.id : group?.teacher_id;
        
        if (teacherId) {
          // Check if attendance already exists
          const { data: existingAtt } = await supabase
            .from("teacher_attendance")
            .select("id")
            .eq("teacher_id", teacherId)
            .eq("lesson_id", lesson.id)
            .eq("date", today)
            .single();

          if (!existingAtt) {
            await supabase.from("teacher_attendance").insert({
              teacher_id: teacherId,
              lesson_id: lesson.id,
              date: today,
              status: "present",
              attendance_type: "lesson",
              joined_at: now.toISOString()
            });
            toast({ title: "تم تسجيل حضور المعلم", description: `تم تسجيل حضورك لحصة ${lesson.subject}` });
          }
        }
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
    }

    // Open meeting link
    window.open(lesson.meeting_link, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 ml-1" /> حاضر</Badge>;
      case "absent":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" /> غائب</Badge>;
      case "late":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="h-3 w-3 ml-1" /> متأخر</Badge>;
      case "excused":
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" /> معذور</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Student view for independent groups
  if (userRole === "student") {
    return (
      <DashboardLayout userRole="student" userName={profile?.full_name || "طالب"}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">المجموعات المستقلة</h1>
            <p className="text-muted-foreground">مجموعتي المستقلة والجدول والحضور</p>
          </div>

          {!myGroupInfo ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutGrid className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">لست مسجلاً في مجموعة مستقلة</h3>
                <p className="text-muted-foreground">تواصل مع المعلم لإضافتك لمجموعة</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group Info Card */}
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <LayoutGrid className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">{myGroupInfo.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {myGroupInfo.grade_level && (
                          <Badge variant="outline">{myGroupInfo.grade_level}</Badge>
                        )}
                        {myGroupInfo.teacher?.full_name && (
                          <Badge variant="secondary">المعلم: {myGroupInfo.teacher.full_name}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="schedule" className="space-y-4">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                  <TabsTrigger 
                    value="schedule" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    الجدول
                  </TabsTrigger>
                  <TabsTrigger 
                    value="attendance" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    الحضور والغياب
                  </TabsTrigger>
                </TabsList>

                {/* Schedule Tab */}
                <TabsContent value="schedule">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        جدول الحصص
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupLessons[myGroupInfo.id]?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <div className="min-w-[700px]">
                            <div className="grid grid-cols-6 gap-2 mb-4">
                              {[0, 1, 2, 3, 4, 5].map((day) => (
                                <div 
                                  key={day} 
                                  className="text-center py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
                                >
                                  {getDayName(day)}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {[0, 1, 2, 3, 4, 5].map((day) => {
                                const dayLessons = groupLessons[myGroupInfo.id]
                                  ?.filter((l) => l.day_of_week === day)
                                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                                return (
                                  <div key={day} className="min-h-[150px] space-y-2">
                                    {dayLessons?.length > 0 ? (
                                      dayLessons.map((lesson) => (
                                        <div 
                                          key={lesson.id} 
                                          className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3"
                                        >
                                          <div className="font-semibold text-sm mb-1">
                                            {lesson.subject}
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-1" dir="ltr">
                                              <span className="font-medium">{lesson.start_time}</span>
                                              <span>-</span>
                                              <span className="font-medium">{lesson.end_time}</span>
                                            </div>
                                            {lesson.room && (
                                              <div>القاعة: {lesson.room}</div>
                                            )}
                                            {lesson.meeting_link && (
                                              <Button
                                                size="sm"
                                                variant="default"
                                                className="w-full h-7 text-xs mt-1"
                                                onClick={() => handleJoinMeeting(lesson, myGroupInfo.id)}
                                              >
                                                <Video className="h-3 w-3 ml-1" />
                                                انضم للحصة
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="h-full min-h-[50px] flex items-center justify-center text-xs text-muted-foreground">
                                        -
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد حصص مجدولة</p>
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
                      {myIndependentAttendance.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد سجلات حضور</p>
                          <p className="text-sm mt-1">سيتم تسجيل حضورك تلقائياً عند الانضمام للحصص</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myIndependentAttendance.map((record) => (
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
                                    <XCircle className="h-5 w-5 text-white" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-white" />
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
                                        <span>{record.lesson.start_time} - {record.lesson.end_time}</span>
                                      </>
                                    )}
                                    {record.joined_at && (
                                      <>
                                        <span>•</span>
                                        <span>وقت الانضمام: {format(new Date(record.joined_at), "HH:mm")}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {getStatusBadge(record.status)}
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
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">المجموعات المستقلة</h1>
            <p className="text-muted-foreground">إدارة الفصول والجداول المستقلة بدون مدرسة</p>
          </div>
          <Dialog open={groupDialogOpen} onOpenChange={(open) => {
            if (!open) resetGroupForm();
            else setGroupDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء مجموعة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGroupId ? "تعديل المجموعة" : "إنشاء مجموعة جديدة"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المجموعة *</Label>
                  <Input
                    placeholder="مثال: مجموعة الرياضيات المتقدمة"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المرحلة/المستوى</Label>
                  <Input
                    placeholder="مثال: الثانوية - الصف الثالث"
                    value={groupGradeLevel}
                    onChange={(e) => setGroupGradeLevel(e.target.value)}
                  />
                </div>
                {userRole === "admin" && (
                  <div className="space-y-2">
                    <Label>المعلم المسؤول</Label>
                    <Select value={groupTeacherId} onValueChange={setGroupTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المعلم (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    placeholder="وصف المجموعة (اختياري)"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateOrUpdateGroup} className="w-full" disabled={!groupName.trim()}>
                  {editingGroupId ? "تعديل" : "إنشاء المجموعة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              المجموعات ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LayoutGrid className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">لا توجد مجموعات مستقلة</p>
                <p className="text-sm">اضغط "إنشاء مجموعة جديدة" لإضافة مجموعة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => toggleGroupExpand(group.id)}
                    >
                      <div className="flex items-center gap-4">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-semibold">{group.name}</h3>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {group.grade_level && <Badge variant="outline">{group.grade_level}</Badge>}
                            {group.teacher?.full_name && <span>المعلم: {group.teacher.full_name}</span>}
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 ml-1" />
                              {groupStudentCounts[group.id] || 0} طالب
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); openEditGroupDialog(group); }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <ArrowRight className={`h-4 w-4 transition-transform ${expandedGroupId === group.id ? 'rotate-90' : 'rotate-180'}`} />
                      </div>
                    </div>
                    
                    {expandedGroupId === group.id && (
                      <div className="p-6 border-t bg-background space-y-6">
                        {/* الحصص */}
                        <div className="bg-card rounded-lg border">
                          <div className="flex items-center justify-between p-4 border-b">
                            <h4 className="font-semibold text-lg">الحصص (الجدول)</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                                <Button 
                                  size="sm" 
                                  variant={scheduleViewMode === "calendar" ? "default" : "ghost"}
                                  className="h-8 px-3"
                                  onClick={() => setScheduleViewMode("calendar")}
                                >
                                  <Calendar className="h-4 w-4 ml-1" />
                                  أسبوعي
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={scheduleViewMode === "table" ? "default" : "ghost"}
                                  className="h-8 px-3"
                                  onClick={() => setScheduleViewMode("table")}
                                >
                                  <Table2 className="h-4 w-4 ml-1" />
                                  قائمة
                                </Button>
                              </div>
                              <Button size="sm" onClick={() => openAddLessonDialog(group.id)}>
                                <Plus className="h-4 w-4 ml-1" />إضافة حصة
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            {groupLessons[group.id]?.length > 0 ? (
                              <>
                                {scheduleViewMode === "calendar" && (
                                  <div className="overflow-x-auto">
                                    <div className="min-w-[700px]">
                                      <div className="grid grid-cols-6 gap-2 mb-4">
                                        {[0, 1, 2, 3, 4, 5].map((day) => (
                                          <div 
                                            key={day} 
                                            className="text-center py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
                                          >
                                            {getDayName(day)}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="grid grid-cols-6 gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((day) => {
                                          const dayLessons = groupLessons[group.id]
                                            ?.filter((l) => l.day_of_week === day)
                                            .sort((a, b) => a.start_time.localeCompare(b.start_time));
                                          return (
                                            <div key={day} className="min-h-[200px] space-y-2">
                                              {dayLessons?.length > 0 ? (
                                                dayLessons.map((lesson) => (
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
                                                      {lesson.meeting_link && (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="w-full mt-2 h-7 text-xs"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleJoinMeeting(lesson, group.id);
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
                                                    </div>
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
                                                        onClick={() => handleDeleteLesson(lesson.id, group.id)}
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
                                        {groupLessons[group.id]
                                          .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                                          .map((lesson) => (
                                          <TableRow key={lesson.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium text-primary">{getDayName(lesson.day_of_week)}</TableCell>
                                            <TableCell>{lesson.subject}</TableCell>
                                            <TableCell dir="ltr" className="text-muted-foreground">{lesson.start_time}</TableCell>
                                            <TableCell dir="ltr" className="text-muted-foreground">{lesson.end_time}</TableCell>
                                            <TableCell>{lesson.room || "-"}</TableCell>
                                            <TableCell>
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditLessonDialog(lesson)}>
                                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id, group.id)}>
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
                                <p>لا توجد حصص - اضغط "إضافة حصة" لإنشاء جدول المجموعة</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* الطلاب */}
                        <div className="bg-card rounded-lg border">
                          <div className="flex items-center justify-between p-4">
                            <h4 className="font-semibold text-lg">الطلاب ({groupStudentCounts[group.id] || 0})</h4>
                            <Button size="sm" variant="outline" onClick={() => openStudentsDialog(group.id)}>
                              <Users className="h-4 w-4 ml-1" />إدارة الطلاب
                            </Button>
                          </div>
                        </div>

                        {/* الحضور */}
                        <div className="bg-card rounded-lg border">
                          <div className="flex items-center justify-between p-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <ClipboardCheck className="h-5 w-5 text-primary" />
                              الحضور
                            </h4>
                            <Button size="sm" variant="outline" onClick={() => openAttendanceDialog(group.id)}>
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

        {/* Dialog لإضافة/تعديل حصة */}
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

        {/* Dialog لإدارة طلاب المجموعة */}
        <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">إدارة طلاب المجموعة</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <Label className="text-base font-semibold">إسناد طالب للمجموعة</Label>
                <p className="text-sm text-muted-foreground">اختر من جميع الطلاب المسجلين في الموقع</p>
                {availableStudents.length > 0 ? (
                  <SearchableSelect
                    value=""
                    onValueChange={handleAssignStudent}
                    options={availableStudents.map((student) => ({
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
                    placeholder="اختر طالب لإسناده..."
                    searchPlaceholder="ابحث بالاسم أو رقم الطالب..."
                    emptyText="لا يوجد طلاب مطابقين"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">لا يوجد طلاب متاحين للإسناد</p>
                )}
              </div>
              
              <div className="bg-card rounded-lg border">
                <div className="p-4 border-b">
                  <h4 className="font-semibold text-lg">طلاب المجموعة الحاليين ({groupStudentsList.length})</h4>
                </div>
                <div className="p-4">
                  {groupStudentsList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد طلاب في هذه المجموعة</p>
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
                        {groupStudentsList.map((student) => (
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
                                onClick={() => handleRemoveStudent(student.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
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
        {/* Dialog لسجل الحضور */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                سجل الحضور
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* اختيار التاريخ */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Label>تاريخ الحضور:</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    if (selectedGroupForAttendance) {
                      fetchAttendanceData(selectedGroupForAttendance, e.target.value);
                    }
                  }}
                  className="w-auto"
                />
              </div>

              {loadingAttendance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Tabs defaultValue="students" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students">
                      <Users className="h-4 w-4 ml-1" />
                      حضور الطلاب ({studentAttendance.length})
                    </TabsTrigger>
                    <TabsTrigger value="teacher">
                      <UserCheck className="h-4 w-4 ml-1" />
                      حضور المعلم ({teacherAttendance.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="students" className="flex-1 overflow-auto mt-4">
                    {studentAttendance.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد سجلات حضور للطلاب في هذا اليوم</p>
                        <p className="text-sm">سيتم تسجيل الحضور تلقائياً عند الضغط على لينك الميتنج</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">اسم الطالب</TableHead>
                            <TableHead className="font-semibold">رقم الطالب</TableHead>
                            <TableHead className="font-semibold">الحصة</TableHead>
                            <TableHead className="font-semibold">وقت الحضور</TableHead>
                            <TableHead className="font-semibold">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentAttendance.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">
                                {record.student?.profile?.full_name || "غير معروف"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{record.student?.student_number || "-"}</Badge>
                              </TableCell>
                              <TableCell>{record.lesson?.subject || "-"}</TableCell>
                              <TableCell dir="ltr" className="text-muted-foreground">
                                {record.joined_at ? format(new Date(record.joined_at), "HH:mm:ss") : "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="teacher" className="flex-1 overflow-auto mt-4">
                    {teacherAttendance.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد سجلات حضور للمعلم في هذا اليوم</p>
                        <p className="text-sm">سيتم تسجيل حضور المعلم تلقائياً عند الضغط على لينك الميتنج</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">اسم المعلم</TableHead>
                            <TableHead className="font-semibold">الحصة</TableHead>
                            <TableHead className="font-semibold">وقت الحضور</TableHead>
                            <TableHead className="font-semibold">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teacherAttendance.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">
                                {record.teacher?.full_name || "غير معروف"}
                              </TableCell>
                              <TableCell>{record.lesson?.subject || "-"}</TableCell>
                              <TableCell dir="ltr" className="text-muted-foreground">
                                {record.joined_at ? format(new Date(record.joined_at), "HH:mm:ss") : "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default IndependentGroupsPage;
