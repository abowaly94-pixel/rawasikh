import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  GraduationCap, 
  Layers, 
  BookOpen, 
  LayoutGrid, 
  Eye, 
  Award,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Table2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  ClipboardCheck,
  UserCheck,
  UserX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

interface Lesson {
  id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  meeting_link: string | null;
}

interface SchoolClass {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  teacher_id: string | null;
  teacher?: { full_name: string } | null;
}

interface School {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string | null;
}

interface Student {
  id: string;
  user_id: string;
  student_number: string | null;
  class_id: string | null;
  profile: { full_name: string; email: string | null } | null;
}

interface StudentAssessmentResult {
  id: string;
  student_id?: string;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
  assessment: {
    id: string;
    title: string;
    max_score: number;
  } | null;
}

interface AnswerDetail {
  question_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  weakness_feedback: string | null;
  explanation: string | null;
}

interface GlobalStage {
  id: string;
  name: string;
  order_index: number;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  lesson_subject: string;
  date: string;
  status: string;
  joined_at: string | null;
  notes: string | null;
}

interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  teacher_name: string;
  attendance_type: string;
  lesson_subject?: string;
  session_title?: string;
  date: string;
  status: string;
  joined_at: string | null;
}

interface GradeLevel {
  id: string;
  name: string;
  stage_id: string;
  order_index: number;
}

interface Subject {
  id: string;
  name: string;
  grade_level_id: string | null;
  description: string | null;
  icon: string | null;
}

const SchoolOverviewPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Teachers
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]);
  
  // Students
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  
  // Global Stages & Grade Levels
  const [globalStages, setGlobalStages] = useState<GlobalStage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  
  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Classes
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classLessons, setClassLessons] = useState<Record<string, Lesson[]>>({});
  const [classStudents, setClassStudents] = useState<Record<string, Student[]>>({});
  const [scheduleViewMode, setScheduleViewMode] = useState<"table" | "calendar">("calendar");

  // نتائج اختبارات الطلاب
  const [studentAssessments, setStudentAssessments] = useState<Record<string, StudentAssessmentResult[]>>({});
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedStudentForResults, setSelectedStudentForResults] = useState<Student | null>(null);

  // تقرير السلبيات
  const [weaknessReportDialogOpen, setWeaknessReportDialogOpen] = useState(false);
  const [selectedAttemptForReport, setSelectedAttemptForReport] = useState<StudentAssessmentResult | null>(null);
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // سجل الحضور والغياب
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchSchoolData();
    }
  }, [user, userRole]);

  const fetchSchoolData = async () => {
    setIsLoading(true);
    try {
      // Find the school for this user
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, email, phone")
        .eq("user_id", user?.id)
        .single();

      if (schoolError) throw schoolError;
      setSchool(schoolData);
      const schoolId = schoolData.id;

      // Fetch assigned teachers
      const { data: schoolTeachers } = await supabase
        .from("school_teachers")
        .select("teacher_id")
        .eq("school_id", schoolId);

      const teacherIds = schoolTeachers?.map(st => st.teacher_id) || [];

      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", teacherIds);
        setAssignedTeachers(teachers || []);
      } else {
        setAssignedTeachers([]);
      }

      // Fetch assigned students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number, class_id")
        .eq("school_id", schoolId);

      if (studentsData && studentsData.length > 0) {
        const studentUserIds = studentsData.map(s => s.user_id).filter(Boolean);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentUserIds);

        const studentsWithProfiles = studentsData.map(s => ({
          ...s,
          profile: studentProfiles?.find(p => p.id === s.user_id) || null
        }));
        setAssignedStudents(studentsWithProfiles);
      } else {
        setAssignedStudents([]);
      }

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

      // Fetch subjects for this school
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name, grade_level_id, description, icon")
        .eq("school_id", schoolId);
      setSubjects(subjectsData || []);

      // Fetch classes for this school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name, description, grade_level, teacher_id")
        .eq("school_id", schoolId);
      
      if (classesData && classesData.length > 0) {
        const classTeacherIds = classesData.map(c => c.teacher_id).filter(Boolean);
        let teacherMap: Record<string, string> = {};
        if (classTeacherIds.length > 0) {
          const { data: teachersData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", classTeacherIds);
          teachersData?.forEach(t => { teacherMap[t.id] = t.full_name; });
        }
        const classesWithTeachers = classesData.map(c => ({
          ...c,
          teacher: c.teacher_id ? { full_name: teacherMap[c.teacher_id] || "" } : null
        }));
        setClasses(classesWithTeachers);

        // Fetch student counts and lessons for each class
        const counts: Record<string, number> = {};
        const lessonsMap: Record<string, Lesson[]> = {};
        const studentsMap: Record<string, Student[]> = {};
        
        for (const cls of classesData) {
          // Student count
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id);
          counts[cls.id] = count || 0;

          // Lessons
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("id, subject, day_of_week, start_time, end_time, room, meeting_link")
            .eq("class_id", cls.id)
            .order("day_of_week")
            .order("start_time");
          lessonsMap[cls.id] = lessonsData || [];

          // Students in this class
          const classStudentsData = studentsData?.filter(s => s.class_id === cls.id) || [];
          studentsMap[cls.id] = classStudentsData.map(s => ({
            ...s,
            profile: studentsWithProfiles?.find(sp => sp.id === s.id)?.profile || null
          }));
        }
        setClassStudentCounts(counts);
        setClassLessons(lessonsMap);
        setClassStudents(studentsMap);
      } else {
        setClasses([]);
      }

      // Fetch assessment results for students
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const { data: attemptsData } = await supabase
          .from("school_assessment_attempts")
          .select(`
            id,
            student_id,
            score,
            percentage,
            passed,
            completed_at,
            assessment:school_level_assessments(id, title, max_score)
          `)
          .in("student_id", studentIds)
          .not("completed_at", "is", null);

        const assessmentsByStudent: Record<string, StudentAssessmentResult[]> = {};
        attemptsData?.forEach((attempt: any) => {
          if (!assessmentsByStudent[attempt.student_id]) {
            assessmentsByStudent[attempt.student_id] = [];
          }
          assessmentsByStudent[attempt.student_id].push({
            id: attempt.id,
            score: attempt.score,
            percentage: attempt.percentage,
            passed: attempt.passed,
            completed_at: attempt.completed_at,
            assessment: attempt.assessment
          });
        });
        setStudentAssessments(assessmentsByStudent);
      }

    } catch (error) {
      console.error("Error fetching school data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل بيانات المدرسة", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!school) return;
    
    try {
      // Fetch student attendance for this school
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          date,
          status,
          joined_at,
          notes,
          lesson_id,
          class_id
        `)
        .eq("date", attendanceDate);

      if (attendanceData && attendanceData.length > 0) {
        // Get class IDs that belong to this school
        const { data: schoolClasses } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", school.id);

        const schoolClassIds = schoolClasses?.map(c => c.id) || [];
        const classNameMap: Record<string, string> = {};
        schoolClasses?.forEach(c => { classNameMap[c.id] = c.name; });

        // Filter attendance to only school classes
        const schoolAttendance = attendanceData.filter(a => schoolClassIds.includes(a.class_id));

        // Get student info and lesson info
        const studentIds = [...new Set(schoolAttendance.map(a => a.student_id))];
        const lessonIds = [...new Set(schoolAttendance.map(a => a.lesson_id).filter(Boolean))];

        let studentMap: Record<string, string> = {};
        let lessonMap: Record<string, string> = {};

        if (studentIds.length > 0) {
          const { data: students } = await supabase
            .from("students")
            .select("id, user_id")
            .in("id", studentIds);

          const userIds = students?.map(s => s.user_id).filter(Boolean) || [];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);
            
            students?.forEach(s => {
              const profile = profiles?.find(p => p.id === s.user_id);
              studentMap[s.id] = profile?.full_name || "غير معروف";
            });
          }
        }

        if (lessonIds.length > 0) {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, subject")
            .in("id", lessonIds as string[]);
          lessons?.forEach(l => { lessonMap[l.id] = l.subject; });
        }

        const records: AttendanceRecord[] = schoolAttendance.map(a => ({
          id: a.id,
          student_id: a.student_id,
          student_name: studentMap[a.student_id] || "غير معروف",
          class_name: classNameMap[a.class_id] || "-",
          lesson_subject: a.lesson_id ? lessonMap[a.lesson_id] || "-" : "-",
          date: a.date,
          status: a.status,
          joined_at: a.joined_at,
          notes: a.notes
        }));

        setStudentAttendance(records);
      } else {
        setStudentAttendance([]);
      }

      // Fetch teacher attendance
      const teacherIds = assignedTeachers.map(t => t.id);
      if (teacherIds.length > 0) {
        const { data: teacherAttData } = await supabase
          .from("teacher_attendance")
          .select(`
            id,
            teacher_id,
            attendance_type,
            date,
            status,
            joined_at,
            lesson_id,
            session_id
          `)
          .in("teacher_id", teacherIds)
          .eq("date", attendanceDate);

        if (teacherAttData && teacherAttData.length > 0) {
          const lessonIds = [...new Set(teacherAttData.map(a => a.lesson_id).filter(Boolean))];
          const sessionIds = [...new Set(teacherAttData.map(a => a.session_id).filter(Boolean))];

          let lessonMap: Record<string, string> = {};
          let sessionMap: Record<string, string> = {};
          const teacherNameMap: Record<string, string> = {};
          assignedTeachers.forEach(t => { teacherNameMap[t.id] = t.full_name; });

          if (lessonIds.length > 0) {
            const { data: lessons } = await supabase
              .from("lessons")
              .select("id, subject")
              .in("id", lessonIds as string[]);
            lessons?.forEach(l => { lessonMap[l.id] = l.subject; });
          }

          if (sessionIds.length > 0) {
            const { data: sessions } = await supabase
              .from("online_sessions")
              .select("id, title")
              .in("id", sessionIds as string[]);
            sessions?.forEach(s => { sessionMap[s.id] = s.title; });
          }

          const records: TeacherAttendanceRecord[] = teacherAttData.map(a => ({
            id: a.id,
            teacher_id: a.teacher_id,
            teacher_name: teacherNameMap[a.teacher_id] || "غير معروف",
            attendance_type: a.attendance_type,
            lesson_subject: a.lesson_id ? lessonMap[a.lesson_id] : undefined,
            session_title: a.session_id ? sessionMap[a.session_id] : undefined,
            date: a.date,
            status: a.status,
            joined_at: a.joined_at
          }));

          setTeacherAttendance(records);
        } else {
          setTeacherAttendance([]);
        }
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  useEffect(() => {
    if (school && assignedTeachers.length >= 0) {
      fetchAttendanceData();
    }
  }, [school, attendanceDate, assignedTeachers]);

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">حاضر</Badge>;
      case 'absent':
        return <Badge variant="destructive">غائب</Badge>;
      case 'late':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">متأخر</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">معذور</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredStudentAttendance = studentAttendance.filter(a =>
    a.student_name.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
    a.class_name.toLowerCase().includes(attendanceSearchTerm.toLowerCase())
  );

  const filteredTeacherAttendance = teacherAttendance.filter(a =>
    a.teacher_name.toLowerCase().includes(attendanceSearchTerm.toLowerCase())
  );

  const openStudentResults = (student: Student) => {
    setSelectedStudentForResults(student);
    setResultsDialogOpen(true);
  };

  const openWeaknessReport = async (result: StudentAssessmentResult) => {
    setSelectedAttemptForReport(result);
    setWeaknessReportDialogOpen(true);
    setLoadingReport(true);
    setAnswerDetails([]);

    try {
      // جلب إجابات الطالب
      const { data: answers } = await supabase
        .from("school_assessment_answers")
        .select("question_id, selected_option_id, is_correct")
        .eq("attempt_id", result.id);

      if (answers && answers.length > 0) {
        const details: AnswerDetail[] = [];
        
        for (const answer of answers) {
          // جلب بيانات السؤال
          const { data: question } = await supabase
            .from("school_assessment_questions")
            .select("question_text, correct_answer, explanation, weakness_feedback")
            .eq("id", answer.question_id)
            .single();

          // جلب نص الخيار المختار
          let studentAnswerText = "";
          if (answer.selected_option_id) {
            const { data: selectedOption } = await supabase
              .from("school_assessment_options")
              .select("option_text")
              .eq("id", answer.selected_option_id)
              .single();
            studentAnswerText = selectedOption?.option_text || "";
          }

          // جلب الإجابة الصحيحة
          let correctAnswerText = question?.correct_answer || "";
          const { data: correctOption } = await supabase
            .from("school_assessment_options")
            .select("option_text")
            .eq("question_id", answer.question_id)
            .eq("is_correct", true)
            .single();
          if (correctOption) {
            correctAnswerText = correctOption.option_text;
          }

          details.push({
            question_text: question?.question_text || "",
            student_answer: studentAnswerText,
            correct_answer: correctAnswerText,
            is_correct: answer.is_correct || false,
            weakness_feedback: question?.weakness_feedback || null,
            explanation: question?.explanation || null,
          });
        }
        
        setAnswerDetails(details);
      }
    } catch (error) {
      console.error("Error fetching weakness report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportStudentsToExcel = async () => {
    try {
      toast({ title: "جاري التصدير...", description: "يتم تجهيز ملف Excel" });

      const exportData: any[] = [];

      for (const student of assignedStudents) {
        const studentResults = studentAssessments[student.id] || [];
        
        if (studentResults.length === 0) {
          exportData.push({
            "اسم الطالب": student.profile?.full_name || "غير معروف",
            "الاختبار": "لم يخض اختبارات",
            "الدرجة": "-",
            "النسبة المئوية": "-",
            "النتيجة": "-",
            "السلبيات": "-"
          });
        } else {
          for (const result of studentResults) {
            // Fetch weaknesses for this attempt
            const { data: answers } = await supabase
              .from("school_assessment_answers")
              .select("question_id, is_correct")
              .eq("attempt_id", result.id);

            let weaknesses: string[] = [];
            if (answers) {
              const incorrectAnswers = answers.filter(a => !a.is_correct);
              for (const answer of incorrectAnswers) {
                const { data: question } = await supabase
                  .from("school_assessment_questions")
                  .select("weakness_feedback")
                  .eq("id", answer.question_id)
                  .single();
                if (question?.weakness_feedback) {
                  weaknesses.push(question.weakness_feedback);
                }
              }
            }

            exportData.push({
              "اسم الطالب": student.profile?.full_name || "غير معروف",
              "الاختبار": result.assessment?.title || "-",
              "الدرجة": result.score !== null ? `${result.score}/${result.assessment?.max_score}` : "-",
              "النسبة المئوية": result.percentage !== null ? `${result.percentage}%` : "-",
              "النتيجة": result.passed ? "ناجح" : "راسب",
              "السلبيات": weaknesses.length > 0 ? weaknesses.join(" | ") : "لا توجد سلبيات"
            });
          }
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب والسلبيات");

      // Auto-fit columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key] || "").length)) + 2
      }));
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(workbook, `طلاب_${school?.name || 'المدرسة'}_والسلبيات.xlsx`);
      toast({ title: "تم التصدير", description: "تم تحميل ملف Excel بنجاح" });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({ title: "خطأ", description: "فشل في تصدير البيانات", variant: "destructive" });
    }
  };

  const getGradeLevelName = (gradeLevelId: string | null) => {
    if (!gradeLevelId) return "-";
    const gradeLevel = gradeLevels.find(gl => gl.id === gradeLevelId);
    return gradeLevel?.name || "-";
  };

  const getStageName = (stageId: string) => {
    const stage = globalStages.find(s => s.id === stageId);
    return stage?.name || "-";
  };

  const getDayName = (day: number) => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[day] || "";
  };

  const toggleClassExpansion = (classId: string) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  const studentsWithProfiles = assignedStudents;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <SchoolLayout schoolName={school?.name}>
      <div className="space-y-6">
        {/* School Info Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              {school?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              {school?.email && (
                <div>
                  <span className="text-muted-foreground">البريد: </span>
                  <span dir="ltr">{school.email}</span>
                </div>
              )}
              {school?.phone && (
                <div>
                  <span className="text-muted-foreground">الهاتف: </span>
                  <span dir="ltr">{school.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              الطلاب
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              المعلمين
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              الحضور والغياب
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              الفصول
            </TabsTrigger>
            <TabsTrigger value="subjects" className="gap-2">
              <BookOpen className="h-4 w-4" />
              المواد
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              الصفوف
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-2">
              <Layers className="h-4 w-4" />
              المراحل
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الطلاب المسجلين ({assignedStudents.length})</CardTitle>
                {assignedStudents.length > 0 && (
                  <Button onClick={exportStudentsToExcel} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    تصدير Excel
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {assignedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مسجلين</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>رقم الطالب</TableHead>
                        <TableHead>البريد</TableHead>
                        <TableHead>نتائج التقييم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedStudents.map((s) => {
                        const hasResults = studentAssessments[s.id] && studentAssessments[s.id].length > 0;
                        return (
                          <TableRow key={s.id}>
                            <TableCell>{s.profile?.full_name || "غير معروف"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{s.student_number || "-"}</Badge>
                            </TableCell>
                            <TableCell dir="ltr" className="text-right">{s.profile?.email || "-"}</TableCell>
                            <TableCell>
                              {hasResults ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openStudentResults(s)}
                                  className="gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  عرض النتائج ({studentAssessments[s.id].length})
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">لم يخض اختبارات</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <CardTitle>المعلمين المسندين ({assignedTeachers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {assignedTeachers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد معلمين مسندين</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>البريد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedTeachers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.full_name}</TableCell>
                          <TableCell dir="ltr" className="text-right">{t.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="بحث بالاسم..."
                      value={attendanceSearchTerm}
                      onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Student Attendance */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    حضور الطلاب
                  </h4>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {studentAttendance.filter(a => a.status === 'present').length}
                          </p>
                          <p className="text-sm text-muted-foreground">حاضر</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <UserX className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-600">
                            {studentAttendance.filter(a => a.status === 'absent').length}
                          </p>
                          <p className="text-sm text-muted-foreground">غائب</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {studentAttendance.filter(a => a.status === 'late').length}
                          </p>
                          <p className="text-sm text-muted-foreground">متأخر</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Award className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {studentAttendance.filter(a => a.status === 'excused').length}
                          </p>
                          <p className="text-sm text-muted-foreground">معذور</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {filteredStudentAttendance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور للطلاب في هذا التاريخ</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم الطالب</TableHead>
                          <TableHead>الفصل</TableHead>
                          <TableHead>المادة</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>وقت الحضور</TableHead>
                          <TableHead>ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudentAttendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.student_name}</TableCell>
                            <TableCell>{record.class_name}</TableCell>
                            <TableCell>{record.lesson_subject}</TableCell>
                            <TableCell>{getAttendanceStatusBadge(record.status)}</TableCell>
                            <TableCell dir="ltr" className="text-right">
                              {record.joined_at ? new Date(record.joined_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{record.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Teacher Attendance */}
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-semibold flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    حضور المعلمين
                  </h4>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {teacherAttendance.filter(a => a.status === 'present').length}
                          </p>
                          <p className="text-sm text-muted-foreground">حاضر</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <UserX className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-600">
                            {teacherAttendance.filter(a => a.status === 'absent').length}
                          </p>
                          <p className="text-sm text-muted-foreground">غائب</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {teacherAttendance.filter(a => a.status === 'late').length}
                          </p>
                          <p className="text-sm text-muted-foreground">متأخر</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {filteredTeacherAttendance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور للمعلمين في هذا التاريخ</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم المعلم</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>المادة/الجلسة</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>وقت الحضور</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeacherAttendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.teacher_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.attendance_type === 'lesson' ? 'حصة' : 'جلسة'}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.lesson_subject || record.session_title || "-"}</TableCell>
                            <TableCell>{getAttendanceStatusBadge(record.status)}</TableCell>
                            <TableCell dir="ltr" className="text-right">
                              {record.joined_at ? new Date(record.joined_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>الفصول الدراسية ({classes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد فصول</p>
                ) : (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div key={cls.id} className="border rounded-lg overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleClassExpansion(cls.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="font-medium text-lg">{cls.name}</div>
                            <Badge variant="outline">{classStudentCounts[cls.id] || 0} طالب</Badge>
                            <Badge variant="secondary">{classLessons[cls.id]?.length || 0} حصة</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{cls.teacher?.full_name || "بدون معلم"}</span>
                            {expandedClassId === cls.id ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                        
                        {expandedClassId === cls.id && (
                          <div className="p-4 space-y-4 border-t">
                            {cls.description && (
                              <p className="text-muted-foreground">{cls.description}</p>
                            )}
                            
                            {/* Schedule */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  <h4 className="font-semibold">جدول الحصص</h4>
                                </div>
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
                              </div>
                              <div className="p-4">
                                {classLessons[cls.id]?.length > 0 ? (
                                  <>
                                    {/* Calendar View */}
                                    {scheduleViewMode === "calendar" && (
                                      <div className="overflow-x-auto">
                                        <div className="min-w-[700px]">
                                          {/* Days Header */}
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
                                          {/* Lessons by Day */}
                                          <div className="grid grid-cols-6 gap-2">
                                            {[0, 1, 2, 3, 4, 5].map((day) => {
                                              const dayLessons = classLessons[cls.id]
                                                ?.filter((l) => l.day_of_week === day)
                                                .sort((a, b) => a.start_time.localeCompare(b.start_time));
                                              return (
                                                <div key={day} className="min-h-[200px] space-y-2">
                                                  {dayLessons?.length > 0 ? (
                                                    dayLessons.map((lesson) => (
                                                      <div 
                                                        key={lesson.id} 
                                                        className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 hover:shadow-md transition-shadow"
                                                      >
                                                        <div className="font-semibold text-sm text-foreground mb-1">
                                                          {lesson.subject}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground space-y-1">
                                                          <div className="flex items-center gap-1" dir="ltr">
                                                            <span className="font-medium">{lesson.start_time.substring(0, 5)}</span>
                                                            <span>-</span>
                                                            <span className="font-medium">{lesson.end_time.substring(0, 5)}</span>
                                                          </div>
                                                          {lesson.room && (
                                                            <div className="text-primary/70">
                                                              القاعة: {lesson.room}
                                                            </div>
                                                          )}
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
                                    
                                    {/* Table View */}
                                    {scheduleViewMode === "table" && (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>اليوم</TableHead>
                                            <TableHead>المادة</TableHead>
                                            <TableHead>الوقت</TableHead>
                                            <TableHead>القاعة</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {classLessons[cls.id]
                                            .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                                            .map((lesson) => (
                                            <TableRow key={lesson.id}>
                                              <TableCell className="font-medium text-primary">{getDayName(lesson.day_of_week)}</TableCell>
                                              <TableCell>{lesson.subject}</TableCell>
                                              <TableCell dir="ltr" className="text-muted-foreground">
                                                {lesson.start_time.substring(0, 5)} - {lesson.end_time.substring(0, 5)}
                                              </TableCell>
                                              <TableCell>{lesson.room || "-"}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-center text-muted-foreground py-4">لا توجد حصص</p>
                                )}
                              </div>
                            </div>

                            {/* Students in class */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center gap-2 p-4 border-b">
                                <Users className="h-5 w-5" />
                                <h4 className="font-semibold">طلاب الفصل ({classStudentCounts[cls.id] || 0})</h4>
                              </div>
                              <div className="p-4">
                                {classStudents[cls.id]?.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {classStudents[cls.id].map((student) => (
                                      <Badge key={student.id} variant="secondary">
                                        {student.profile?.full_name || student.student_number || "غير معروف"}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-muted-foreground py-4">لا يوجد طلاب في هذا الفصل</p>
                                )}
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

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle>المواد الدراسية ({subjects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد مواد</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم المادة</TableHead>
                        <TableHead>الصف الدراسي</TableHead>
                        <TableHead>الوصف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell>{getGradeLevelName(subject.grade_level_id)}</TableCell>
                          <TableCell className="text-muted-foreground">{subject.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grade Levels Tab */}
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle>الصفوف الدراسية ({gradeLevels.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeLevels.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد صفوف</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>اسم الصف</TableHead>
                        <TableHead>المرحلة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeLevels.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell>{grade.order_index}</TableCell>
                          <TableCell className="font-medium">{grade.name}</TableCell>
                          <TableCell>{getStageName(grade.stage_id)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stages Tab */}
          <TabsContent value="stages">
            <Card>
              <CardHeader>
                <CardTitle>المراحل الدراسية ({globalStages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {globalStages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد مراحل</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>اسم المرحلة</TableHead>
                        <TableHead>عدد الصفوف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalStages.map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell>{stage.order_index}</TableCell>
                          <TableCell className="font-medium">{stage.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {gradeLevels.filter(gl => gl.stage_id === stage.id).length} صف
                            </Badge>
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

        {/* Results Dialog */}
        <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                نتائج اختبارات: {selectedStudentForResults?.profile?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {selectedStudentForResults && studentAssessments[selectedStudentForResults.id] ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاختبار</TableHead>
                      <TableHead>الدرجة</TableHead>
                      <TableHead>النسبة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>تقرير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAssessments[selectedStudentForResults.id].map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.assessment?.title || "غير معروف"}
                        </TableCell>
                        <TableCell>
                          {result.score !== null ? `${result.score} / ${result.assessment?.max_score || 100}` : "-"}
                        </TableCell>
                        <TableCell>
                          {result.percentage !== null ? `${Math.round(result.percentage)}%` : "-"}
                        </TableCell>
                        <TableCell>
                          {result.passed !== null ? (
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {result.passed ? "ناجح" : "راسب"}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {result.completed_at ? formatDate(result.completed_at) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWeaknessReport(result)}
                            className="gap-1"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            السلبيات
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد نتائج</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Weakness Report Dialog */}
        <Dialog open={weaknessReportDialogOpen} onOpenChange={setWeaknessReportDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                تقرير السلبيات - {selectedAttemptForReport?.assessment?.title}
              </DialogTitle>
            </DialogHeader>

            {loadingReport ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ملخص النتيجة */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">الدرجة: </span>
                        <span className="font-medium">{selectedAttemptForReport?.score} / {selectedAttemptForReport?.assessment?.max_score}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">النسبة: </span>
                        <span className="font-medium">{selectedAttemptForReport?.percentage?.toFixed(0)}%</span>
                      </div>
                      <div>
                        <Badge variant={selectedAttemptForReport?.passed ? "default" : "destructive"}>
                          {selectedAttemptForReport?.passed ? "ناجح" : "راسب"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* تفاصيل الأسئلة */}
                <div className="space-y-3">
                  <h4 className="font-semibold">تفاصيل الإجابات:</h4>
                  {answerDetails.map((detail, index) => (
                    <Card key={index} className={detail.is_correct ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          {detail.is_correct ? (
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <p className="font-medium">{detail.question_text}</p>
                        </div>

                        <div className="mr-7 space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">إجابة الطالب: </span>
                            <span className={detail.is_correct ? "text-green-600" : "text-red-600"}>
                              {detail.student_answer || "لم يُجب"}
                            </span>
                          </p>
                          {!detail.is_correct && detail.correct_answer && (
                            <p>
                              <span className="text-muted-foreground">الإجابة الصحيحة: </span>
                              <span className="text-green-600">{detail.correct_answer}</span>
                            </p>
                          )}
                          {detail.explanation && (
                            <p className="text-muted-foreground mt-2">
                              <span className="font-medium">الشرح: </span>
                              {detail.explanation}
                            </p>
                          )}
                          {!detail.is_correct && detail.weakness_feedback && (
                            <p className="text-blue-600 dark:text-blue-400 mt-2">
                              <span className="font-medium">⚠️ نقطة ضعف: </span>
                              {detail.weakness_feedback}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* ملخص السلبيات */}
                {answerDetails.some(d => !d.is_correct && d.weakness_feedback) && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <AlertTriangle className="h-5 w-5" />
                        ملخص السلبيات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {answerDetails
                          .filter(d => !d.is_correct && d.weakness_feedback)
                          .map((d, i) => (
                            <li key={i}>{d.weakness_feedback}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SchoolLayout>
  );
};

export default SchoolOverviewPage;
