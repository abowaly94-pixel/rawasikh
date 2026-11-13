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
import { Plus, Trash2, Users, GraduationCap, Layers, BookOpen, ArrowRight, ListOrdered, Pencil, LayoutGrid, Calendar, Table2, Eye, Award, AlertTriangle, ClipboardCheck, ExternalLink, CheckCircle, XCircle, Clock, UserCheck, Video, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

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
  profile: { full_name: string; email: string | null } | null;
}

interface StudentAssessmentResult {
  id: string;
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
  term_id: string | null;
  description: string | null;
  icon: string | null;
}

interface Term {
  id: string;
  name: string;
  order_index: number;
  school_id: string;
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

const SchoolDetailsPage = () => {
  const { id: schoolId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Teachers
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  
  // Students
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // Global Stages & Grade Levels
  const [globalStages, setGlobalStages] = useState<GlobalStage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [stageOrder, setStageOrder] = useState(0);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeName, setGradeName] = useState("");
  const [gradeOrder, setGradeOrder] = useState(0);
  const [selectedStageForGrade, setSelectedStageForGrade] = useState("");
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  
  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  
  // Terms
  const [terms, setTerms] = useState<Term[]>([]);
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termName, setTermName] = useState("");
  const [termOrder, setTermOrder] = useState(1);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);

  // Classes - إنشاء فصول خاصة بالمدرسة
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classLessons, setClassLessons] = useState<Record<string, any[]>>({});
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  
  // إنشاء/تعديل فصل
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassStageId, setNewClassStageId] = useState("");
  const [newClassGradeLevelId, setNewClassGradeLevelId] = useState("");
  const [newClassTeacherId, setNewClassTeacherId] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // إدارة الحصص
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
  
  // إدارة طلاب الفصل
  const [classStudentsDialogOpen, setClassStudentsDialogOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);
  const [classStudentsList, setClassStudentsList] = useState<Student[]>([]);
  const [studentsNotInClass, setStudentsNotInClass] = useState<Student[]>([]);
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});

  // نتائج اختبارات الطلاب
  const [studentAssessments, setStudentAssessments] = useState<Record<string, StudentAssessmentResult[]>>({});
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedStudentForResults, setSelectedStudentForResults] = useState<Student | null>(null);
  
  // تقرير السلبيات
  const [weaknessReportDialogOpen, setWeaknessReportDialogOpen] = useState(false);
  const [selectedAttemptForReport, setSelectedAttemptForReport] = useState<StudentAssessmentResult | null>(null);
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("stages");

  // Attendance state
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "admin") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "admin" && schoolId) {
      fetchSchoolData();
    }
  }, [user, userRole, schoolId]);

  const fetchSchoolData = async () => {
    setIsLoading(true);
    try {
      // Fetch school
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, email, phone")
        .eq("id", schoolId)
        .single();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

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

      // Fetch available teachers (not assigned to this school)
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      const allTeacherIds = teacherRoles?.map(r => r.user_id) || [];
      const availableTeacherIds = allTeacherIds.filter(id => !teacherIds.includes(id));

      if (availableTeacherIds.length > 0) {
        const { data: availTeachers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", availableTeacherIds);
        setAvailableTeachers(availTeachers || []);
      } else {
        setAvailableTeachers([]);
      }

      // Fetch assigned students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number")
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

      // Fetch available students (not assigned to any school)
      const { data: availStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .is("school_id", null);

      if (availStudentsData && availStudentsData.length > 0) {
        const availStudentUserIds = availStudentsData.map(s => s.user_id).filter(Boolean);
        const { data: availStudentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", availStudentUserIds);

        const availStudentsWithProfiles = availStudentsData.map(s => ({
          ...s,
          profile: availStudentProfiles?.find(p => p.id === s.user_id) || null
        }));
        setAvailableStudents(availStudentsWithProfiles);
      } else {
        setAvailableStudents([]);
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
        .select("id, name, grade_level_id, term_id, description, icon")
        .eq("school_id", schoolId);
      setSubjects(subjectsData || []);

      // Fetch terms for this school
      const { data: termsData } = await supabase
        .from("terms")
        .select("*")
        .eq("school_id", schoolId)
        .order("order_index");
      setTerms(termsData || []);

      // Fetch classes for this school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name, description, grade_level, teacher_id")
        .eq("school_id", schoolId);
      
      if (classesData && classesData.length > 0) {
        const teacherIds = classesData.map(c => c.teacher_id).filter(Boolean);
        let teacherMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: teachersData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", teacherIds);
          teachersData?.forEach(t => { teacherMap[t.id] = t.full_name; });
        }
        const classesWithTeachers = classesData.map(c => ({
          ...c,
          teacher: c.teacher_id ? { full_name: teacherMap[c.teacher_id] || "" } : null
        }));
        setClasses(classesWithTeachers);
      } else {
        setClasses([]);
      }

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

  // Teacher functions
  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) return;
    try {
      const { error } = await supabase
        .from("school_teachers")
        .insert({ school_id: schoolId, teacher_id: selectedTeacherId });

      if (error) throw error;
      toast({ title: "تم إضافة المعلم للمدرسة" });
      setTeacherDialogOpen(false);
      setSelectedTeacherId("");
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا المعلم من المدرسة؟")) return;
    try {
      const { error } = await supabase
        .from("school_teachers")
        .delete()
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
      toast({ title: "تم إزالة المعلم من المدرسة" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Student functions
  const handleAssignStudent = async () => {
    if (!selectedStudentId) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ school_id: schoolId })
        .eq("id", selectedStudentId);

      if (error) throw error;
      toast({ title: "تم إضافة الطالب للمدرسة" });
      setStudentDialogOpen(false);
      setSelectedStudentId("");
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا الطالب من المدرسة؟")) return;
    try {
      const { error } = await supabase
        .from("students")
        .update({ school_id: null })
        .eq("id", studentId);

      if (error) throw error;
      toast({ title: "تم إزالة الطالب من المدرسة" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Open student assessment results dialog
  const openStudentResults = (student: Student) => {
    setSelectedStudentForResults(student);
    setResultsDialogOpen(true);
  };

  // عرض تقرير السلبيات
  const openWeaknessReport = async (result: StudentAssessmentResult) => {
    setSelectedAttemptForReport(result);
    setWeaknessReportDialogOpen(true);
    setLoadingReport(true);
    setAnswerDetails([]);

    try {
      const { data: answers } = await supabase
        .from("school_assessment_answers")
        .select("question_id, selected_option_id, is_correct")
        .eq("attempt_id", result.id);

      if (answers && answers.length > 0) {
        const details: AnswerDetail[] = await Promise.all(
          answers.map(async (answer) => {
            const { data: question } = await supabase
              .from("school_assessment_questions")
              .select("question_text, weakness_feedback, explanation")
              .eq("id", answer.question_id)
              .single();

            let studentAnswer = "-";
            if (answer.selected_option_id) {
              const { data: selectedOpt } = await supabase
                .from("school_assessment_options")
                .select("option_text")
                .eq("id", answer.selected_option_id)
                .single();
              studentAnswer = selectedOpt?.option_text || "-";
            }

            const { data: correctOpt } = await supabase
              .from("school_assessment_options")
              .select("option_text")
              .eq("question_id", answer.question_id)
              .eq("is_correct", true)
              .single();

            return {
              question_text: question?.question_text || "",
              student_answer: studentAnswer,
              correct_answer: correctOpt?.option_text || "-",
              is_correct: answer.is_correct || false,
              weakness_feedback: !answer.is_correct ? question?.weakness_feedback : null,
              explanation: question?.explanation || null,
            };
          })
        );
        setAnswerDetails(details);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
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

  const handleAddOrUpdateStage = async () => {
    if (!stageName.trim()) return;
    try {
      if (editingStageId) {
        const { error } = await supabase
          .from("global_stages")
          .update({ name: stageName, order_index: stageOrder })
          .eq("id", editingStageId);

        if (error) throw error;
        toast({ title: "تم تعديل المرحلة الدراسية" });
      } else {
        const { error } = await supabase
          .from("global_stages")
          .insert({ name: stageName, order_index: stageOrder });

        if (error) throw error;
        toast({ title: "تم إضافة المرحلة الدراسية" });
      }
      resetStageForm();
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetStageForm = () => {
    setStageDialogOpen(false);
    setStageName("");
    setStageOrder(0);
    setEditingStageId(null);
  };

  const openEditStageDialog = (stage: GlobalStage) => {
    setStageName(stage.name);
    setStageOrder(stage.order_index);
    setEditingStageId(stage.id);
    setStageDialogOpen(true);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟ سيتم حذف جميع الصفوف والمواد المرتبطة بها.")) return;
    try {
      const { error } = await supabase
        .from("global_stages")
        .delete()
        .eq("id", stageId);

      if (error) throw error;
      toast({ title: "تم حذف المرحلة الدراسية" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Grade Level functions
  const handleAddOrUpdateGradeLevel = async () => {
    if (!gradeName.trim() || !selectedStageForGrade) return;
    try {
      if (editingGradeId) {
        const { error } = await supabase
          .from("grade_levels")
          .update({ 
            name: gradeName, 
            stage_id: selectedStageForGrade, 
            order_index: gradeOrder 
          })
          .eq("id", editingGradeId);

        if (error) throw error;
        toast({ title: "تم تعديل الصف الدراسي" });
      } else {
        const { error } = await supabase
          .from("grade_levels")
          .insert({ 
            name: gradeName, 
            stage_id: selectedStageForGrade, 
            order_index: gradeOrder 
          });

        if (error) throw error;
        toast({ title: "تم إضافة الصف الدراسي" });
      }
      resetGradeForm();
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetGradeForm = () => {
    setGradeDialogOpen(false);
    setGradeName("");
    setGradeOrder(0);
    setSelectedStageForGrade("");
    setEditingGradeId(null);
  };

  const openEditGradeDialog = (grade: GradeLevel) => {
    setGradeName(grade.name);
    setGradeOrder(grade.order_index);
    setSelectedStageForGrade(grade.stage_id);
    setEditingGradeId(grade.id);
    setGradeDialogOpen(true);
  };

  const handleDeleteGradeLevel = async (gradeId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الصف؟ سيتم حذف جميع المواد المرتبطة به.")) return;
    try {
      const { error } = await supabase
        .from("grade_levels")
        .delete()
        .eq("id", gradeId);

      if (error) throw error;
      toast({ title: "تم حذف الصف الدراسي" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Term functions
  const handleAddOrUpdateTerm = async () => {
    if (!termName.trim()) return;
    try {
      if (editingTermId) {
        const { error } = await supabase
          .from("terms")
          .update({ name: termName, order_index: termOrder })
          .eq("id", editingTermId);

        if (error) throw error;
        toast({ title: "تم تعديل الترم" });
      } else {
        const { error } = await supabase
          .from("terms")
          .insert({ 
            school_id: schoolId, 
            name: termName, 
            order_index: termOrder 
          });

        if (error) throw error;
        toast({ title: "تم إضافة الترم" });
      }
      resetTermForm();
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetTermForm = () => {
    setTermDialogOpen(false);
    setTermName("");
    setTermOrder(1);
    setEditingTermId(null);
  };

  const openEditTermDialog = (term: Term) => {
    setTermName(term.name);
    setTermOrder(term.order_index);
    setEditingTermId(term.id);
    setTermDialogOpen(true);
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الترم؟")) return;
    try {
      const { error } = await supabase
        .from("terms")
        .delete()
        .eq("id", termId);

      if (error) throw error;
      toast({ title: "تم حذف الترم" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const getTermName = (termId: string | null) => {
    if (!termId) return "غير محدد";
    return terms.find(t => t.id === termId)?.name || "غير محدد";
  };

  // Subject functions
  const handleAddSubject = async () => {
    if (!subjectName.trim() || !selectedGradeLevelId) return;
    try {
      const { error } = await supabase
        .from("subjects")
        .insert({ 
          school_id: schoolId, 
          grade_level_id: selectedGradeLevelId,
          stage_id: gradeLevels.find(g => g.id === selectedGradeLevelId)?.stage_id,
          term_id: selectedTermId && selectedTermId !== "none" ? selectedTermId : null,
          name: subjectName, 
          description: subjectDescription 
        });

      if (error) throw error;
      toast({ title: "تم إضافة المادة" });
      setSubjectDialogOpen(false);
      setSubjectName("");
      setSubjectDescription("");
      setSelectedGradeLevelId("");
      setSelectedTermId("");
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);

      if (error) throw error;
      toast({ title: "تم حذف المادة" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Class functions - إنشاء فصول جديدة خاصة بالمدرسة
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
            grade_level: gradeLevelName,
            teacher_id: newClassTeacherId || null
          })
          .eq("id", editingClassId);

        if (error) throw error;
        toast({ title: "تم تعديل الفصل بنجاح" });
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            name: newClassName,
            description: newClassDescription || null,
            grade_level: gradeLevelName,
            teacher_id: newClassTeacherId || null,
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
    setNewClassStageId("");
    setNewClassGradeLevelId("");
    setNewClassTeacherId("");
    setEditingClassId(null);
  };

  const openEditClassDialog = (cls: SchoolClass) => {
    setNewClassName(cls.name);
    setNewClassDescription(cls.description || "");
    setNewClassTeacherId(cls.teacher_id || "");
    setEditingClassId(cls.id);
    setClassDialogOpen(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الحصص المرتبطة به.")) return;
    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;
      toast({ title: "تم حذف الفصل" });
      fetchSchoolData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // Lesson functions - إدارة الحصص
  const handleCreateOrUpdateLesson = async () => {
    if (!selectedClassForLesson || !lessonSubject.trim()) return;
    try {
      const lessonData = {
        class_id: selectedClassForLesson,
        school_id: schoolId,
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
      // تحديث قائمة الحصص للفصل
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
      // تحديث قائمة الحصص
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

  // Class Students functions - إدارة طلاب الفصل
  const openClassStudentsDialog = async (classId: string) => {
    setSelectedClassForStudents(classId);
    try {
      // جلب طلاب هذا الفصل
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

      // جلب جميع الطلاب من الموقع (الذين ليس لديهم فصل أو في فصل آخر)
      const { data: allStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number, school_id")
        .neq("class_id", classId);
      
      // أيضاً جلب الطلاب بدون فصل
      const { data: noClassStudentsData } = await supabase
        .from("students")
        .select("id, user_id, student_number, school_id")
        .is("class_id", null);

      const combinedStudents = [...(allStudentsData || []), ...(noClassStudentsData || [])];
      // إزالة التكرارات
      const uniqueStudents = combinedStudents.filter((student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
      );

      if (uniqueStudents.length > 0) {
        const studentUserIds = uniqueStudents.map(s => s.user_id).filter(Boolean);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentUserIds);

        const studentsWithProfiles = uniqueStudents.map(s => ({
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
    
    // Fetch lessons for this class if not already fetched
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

  const getSubjectsByGradeLevel = (gradeLevelId: string) => {
    return subjects.filter(s => s.grade_level_id === gradeLevelId);
  };

  const getStageName = (stageId: string) => {
    return globalStages.find(s => s.id === stageId)?.name || "";
  };

  const getGradeLevelName = (gradeLevelId: string) => {
    return gradeLevels.find(g => g.id === gradeLevelId)?.name || "";
  };

  // Attendance functions
  const openAttendanceDialog = async (classId: string) => {
    setSelectedClassForAttendance(classId);
    setAttendanceDialogOpen(true);
    await fetchAttendanceData(classId, attendanceDate);
  };

  const fetchAttendanceData = async (classId: string, date: string) => {
    setLoadingAttendance(true);
    try {
      const lessonsData = classLessons[classId] || [];
      const lessonIds = lessonsData.map((l: any) => l.id);
      
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
        .eq("class_id", classId)
        .eq("date", date)
        .in("lesson_id", lessonIds);

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
          lesson: lessonsData.find((l: any) => l.id === att.lesson_id) || null
        }));
        setStudentAttendance(enriched as AttendanceRecord[]);
      } else {
        setStudentAttendance([]);
      }

      // Get class teacher
      const cls = classes.find(c => c.id === classId);
      if (cls?.teacher_id) {
        const { data: teacherAttData } = await supabase
          .from("teacher_attendance")
          .select("*")
          .eq("teacher_id", cls.teacher_id)
          .eq("date", date)
          .in("lesson_id", lessonIds);

        if (teacherAttData && teacherAttData.length > 0) {
          const { data: teacherProfile } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", cls.teacher_id)
            .single();

          const enriched = teacherAttData.map(att => ({
            ...att,
            teacher: teacherProfile || null,
            lesson: lessonsData.find((l: any) => l.id === att.lesson_id) || null
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
      if (userRole === "student") {
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user?.id)
          .eq("class_id", classId)
          .single();

        if (studentData) {
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
              class_id: classId,
              lesson_id: lesson.id,
              date: today,
              status: "present",
              joined_at: now.toISOString()
            });
            toast({ title: "تم تسجيل حضورك", description: `تم تسجيل حضورك لحصة ${lesson.subject}` });
          }
        }
      }

      if (userRole === "teacher" || userRole === "admin") {
        const cls = classes.find(c => c.id === classId);
        const teacherId = userRole === "teacher" ? user?.id : cls?.teacher_id;
        
        if (teacherId) {
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

  // Export students with weaknesses to Excel
  const exportStudentsWithWeaknesses = async () => {
    try {
      toast({ title: "جاري إعداد الملف..." });
      
      const exportData: any[] = [];
      
      for (const student of assignedStudents) {
        const studentResults = studentAssessments[student.id] || [];
        
        if (studentResults.length === 0) {
          // طالب بدون اختبارات
          exportData.push({
            "اسم الطالب": student.profile?.full_name || "غير معروف",
            "الاختبار": "-",
            "الدرجة": "-",
            "النسبة": "-",
            "الحالة": "لم يخض اختبارات",
            "السلبيات": "-"
          });
        } else {
          // جلب سلبيات كل اختبار
          for (const result of studentResults) {
            // جلب تفاصيل الأسئلة والإجابات الخاطئة
            const { data: answersData } = await supabase
              .from("school_assessment_answers")
              .select(`
                is_correct,
                question:school_assessment_questions(
                  question_text,
                  weakness_feedback
                )
              `)
              .eq("attempt_id", result.id)
              .eq("is_correct", false);
            
            const weaknesses = answersData
              ?.filter((a: any) => a.question?.weakness_feedback)
              .map((a: any) => a.question.weakness_feedback)
              .join(" | ") || "-";
            
            exportData.push({
              "اسم الطالب": student.profile?.full_name || "غير معروف",
              "الاختبار": result.assessment?.title || "-",
              "الدرجة": `${result.score ?? 0} / ${result.assessment?.max_score ?? 0}`,
              "النسبة": `${result.percentage?.toFixed(0) ?? 0}%`,
              "الحالة": result.passed ? "ناجح" : "راسب",
              "السلبيات": weaknesses
            });
          }
        }
      }
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths - Updated after removing sensitive data
      ws["!cols"] = [
        { wch: 25 }, // اسم الطالب
        { wch: 20 }, // الاختبار
        { wch: 12 }, // الدرجة
        { wch: 10 }, // النسبة
        { wch: 10 }, // الحالة
        { wch: 50 }, // السلبيات
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "الطلاب والسلبيات");
      
      // Download file
      XLSX.writeFile(wb, `تقرير_الطلاب_والسلبيات_${school?.name || "المدرسة"}.xlsx`);
      
      toast({ title: "تم تحميل الملف بنجاح" });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({ title: "خطأ", description: "فشل في تصدير الملف", variant: "destructive" });
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
          <Button variant="ghost" onClick={() => navigate("/dashboard/schools")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <h1 className="text-2xl font-bold">{school?.name}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="stages" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              المراحل
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              الصفوف
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              الترم
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              المواد
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              الفصول
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              المعلمين
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              الطلاب
            </TabsTrigger>
          </TabsList>

          {/* Stages Tab (Global) */}
          <TabsContent value="stages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>المراحل الدراسية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">المراحل عامة لجميع المدارس</p>
                </div>
                <Dialog open={stageDialogOpen} onOpenChange={(open) => {
                  if (!open) resetStageForm();
                  else setStageDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 ml-2" />إضافة مرحلة</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingStageId ? "تعديل مرحلة دراسية" : "إضافة مرحلة دراسية"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اسم المرحلة</Label>
                        <Input
                          placeholder="مثال: الابتدائية"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الترتيب</Label>
                        <Input
                          type="number"
                          value={stageOrder}
                          onChange={(e) => setStageOrder(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button onClick={handleAddOrUpdateStage} className="w-full" disabled={!stageName.trim()}>
                        {editingStageId ? "تعديل" : "إضافة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {globalStages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد مراحل دراسية</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>اسم المرحلة</TableHead>
                        <TableHead>عدد الصفوف</TableHead>
                        <TableHead className="w-[100px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalStages.map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell>{stage.order_index}</TableCell>
                          <TableCell>{stage.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getGradeLevelsByStage(stage.id).length} صف
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditStageDialog(stage)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteStage(stage.id)}>
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

          {/* Grade Levels Tab (Global) */}
          <TabsContent value="grades">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>الصفوف الدراسية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">الصفوف عامة لجميع المدارس</p>
                </div>
                <Dialog open={gradeDialogOpen} onOpenChange={(open) => {
                  if (!open) resetGradeForm();
                  else setGradeDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button disabled={globalStages.length === 0}>
                      <Plus className="h-4 w-4 ml-2" />إضافة صف
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingGradeId ? "تعديل صف دراسي" : "إضافة صف دراسي"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>المرحلة الدراسية</Label>
                        <Select value={selectedStageForGrade} onValueChange={setSelectedStageForGrade}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المرحلة" />
                          </SelectTrigger>
                          <SelectContent>
                            {globalStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>اسم الصف</Label>
                        <Input
                          placeholder="مثال: الصف الأول"
                          value={gradeName}
                          onChange={(e) => setGradeName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الترتيب</Label>
                        <Input
                          type="number"
                          value={gradeOrder}
                          onChange={(e) => setGradeOrder(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button onClick={handleAddOrUpdateGradeLevel} className="w-full" disabled={!gradeName.trim() || !selectedStageForGrade}>
                        {editingGradeId ? "تعديل" : "إضافة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {globalStages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    يجب إضافة مرحلة دراسية أولاً
                  </p>
                ) : gradeLevels.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد صفوف</p>
                ) : (
                  <div className="space-y-6">
                    {globalStages.map((stage) => {
                      const stageGrades = getGradeLevelsByStage(stage.id);
                      if (stageGrades.length === 0) return null;
                      return (
                        <div key={stage.id}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {stage.name}
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الترتيب</TableHead>
                                <TableHead>اسم الصف</TableHead>
                                <TableHead>عدد المواد</TableHead>
                                <TableHead className="w-[100px]">إجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stageGrades.map((grade) => (
                                <TableRow key={grade.id}>
                                  <TableCell>{grade.order_index}</TableCell>
                                  <TableCell>{grade.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {getSubjectsByGradeLevel(grade.id).length} مادة
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditGradeDialog(grade)}>
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGradeLevel(grade.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>الترم الدراسي</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">إدارة الفصول الدراسية (ترم أول، ترم ثاني)</p>
                </div>
                <Dialog open={termDialogOpen} onOpenChange={(open) => {
                  if (!open) resetTermForm();
                  else setTermDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />إضافة ترم
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTermId ? "تعديل الترم" : "إضافة ترم جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اسم الترم *</Label>
                        <Input
                          placeholder="مثال: الترم الأول"
                          value={termName}
                          onChange={(e) => setTermName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الترتيب</Label>
                        <Input
                          type="number"
                          min={1}
                          value={termOrder}
                          onChange={(e) => setTermOrder(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <Button onClick={handleAddOrUpdateTerm} className="w-full" disabled={!termName.trim()}>
                        {editingTermId ? "تعديل" : "إضافة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {terms.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد ترم - أضف "الترم الأول" و "الترم الثاني"</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-right w-[15%]">الترتيب</TableHead>
                        <TableHead className="text-right w-[55%]">اسم الترم</TableHead>
                        <TableHead className="text-center w-[30%]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {terms.sort((a, b) => a.order_index - b.order_index).map((term) => (
                        <TableRow key={term.id}>
                          <TableCell className="font-medium text-primary">{term.order_index}</TableCell>
                          <TableCell className="font-medium">{term.name}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditTermDialog(term)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTerm(term.id)}>
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

          <TabsContent value="subjects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>المواد الدراسية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">المواد خاصة بهذه المدرسة</p>
                </div>
                <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={gradeLevels.length === 0}>
                      <Plus className="h-4 w-4 ml-2" />إضافة مادة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة مادة دراسية</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>الصف الدراسي *</Label>
                        <Select value={selectedGradeLevelId} onValueChange={setSelectedGradeLevelId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصف" />
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
                      <div className="space-y-2">
                        <Label>الترم</Label>
                        <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الترم (اختياري)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون ترم محدد</SelectItem>
                            {terms.sort((a, b) => a.order_index - b.order_index).map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>اسم المادة *</Label>
                        <Input
                          placeholder="مثال: الرياضيات"
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الوصف (اختياري)</Label>
                        <Input
                          placeholder="وصف المادة"
                          value={subjectDescription}
                          onChange={(e) => setSubjectDescription(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddSubject} className="w-full" disabled={!subjectName.trim() || !selectedGradeLevelId}>
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {gradeLevels.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    يجب إضافة صفوف دراسية أولاً
                  </p>
                ) : subjects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد مواد</p>
                ) : (
                  <div className="space-y-6">
                    {globalStages.map((stage) => {
                      const stageGrades = getGradeLevelsByStage(stage.id);
                      const hasSubjects = stageGrades.some(g => getSubjectsByGradeLevel(g.id).length > 0);
                      if (!hasSubjects) return null;
                      
                      return (
                        <div key={stage.id} className="space-y-4">
                          <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                            <Layers className="h-5 w-5" />
                            {stage.name}
                          </h3>
                          {stageGrades.map((grade) => {
                            const gradeSubjects = getSubjectsByGradeLevel(grade.id);
                            if (gradeSubjects.length === 0) return null;
                            return (
                              <div key={grade.id} className="mr-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                                  <ListOrdered className="h-4 w-4" />
                                  {grade.name}
                                </h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/30">
                                      <TableHead className="text-right w-[30%]">اسم المادة</TableHead>
                                      <TableHead className="text-right w-[25%]">الترم</TableHead>
                                      <TableHead className="text-right w-[25%]">الوصف</TableHead>
                                      <TableHead className="text-center w-[20%]">إجراءات</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {gradeSubjects.map((subject) => (
                                      <TableRow key={subject.id}>
                                        <TableCell className="font-medium">{subject.name}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{getTermName(subject.term_id)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{subject.description || "-"}</TableCell>
                                        <TableCell>
                                          <div className="flex justify-center gap-1">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              onClick={() => navigate(`/dashboard/schools/${schoolId}/subjects/${subject.id}/content`)}
                                              title="إدارة المحتوى"
                                            >
                                              <BookOpen className="h-4 w-4 text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab - إنشاء فصول خاصة بالمدرسة */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>الفصول الدراسية</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">الفصول الخاصة بهذه المدرسة</p>
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
                        <Label>المرحلة الدراسية</Label>
                        <Select value={newClassStageId} onValueChange={(val) => {
                          setNewClassStageId(val);
                          setNewClassGradeLevelId("");
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المرحلة" />
                          </SelectTrigger>
                          <SelectContent>
                            {globalStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {newClassStageId && (
                        <div className="space-y-2">
                          <Label>الصف الدراسي</Label>
                          <Select value={newClassGradeLevelId} onValueChange={setNewClassGradeLevelId}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الصف" />
                            </SelectTrigger>
                            <SelectContent>
                              {getGradeLevelsByStage(newClassStageId).map((grade) => (
                                <SelectItem key={grade.id} value={grade.id}>
                                  {grade.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>المعلم المسؤول</Label>
                        <Select value={newClassTeacherId} onValueChange={setNewClassTeacherId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المعلم (اختياري)" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedTeachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>الوصف</Label>
                        <Input
                          placeholder="وصف الفصل (اختياري)"
                          value={newClassDescription}
                          onChange={(e) => setNewClassDescription(e.target.value)}
                        />
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
                  <p className="text-center text-muted-foreground py-8">لا توجد فصول - قم بإنشاء فصل جديد</p>
                ) : (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div key={cls.id} className="border rounded-lg overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => toggleClassExpand(cls.id)}
                        >
                          <div className="flex items-center gap-4">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            <div>
                              <h3 className="font-semibold">{cls.name}</h3>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                {cls.grade_level && <Badge variant="outline">{cls.grade_level}</Badge>}
                                {cls.teacher?.full_name && <span>المعلم: {cls.teacher.full_name}</span>}
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 ml-1" />
                                  {classStudentCounts[cls.id] || 0} طالب
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); openEditClassDialog(cls); }}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <ArrowRight className={`h-4 w-4 transition-transform ${expandedClassId === cls.id ? 'rotate-90' : 'rotate-180'}`} />
                          </div>
                        </div>
                        
                        {expandedClassId === cls.id && (
                          <div className="p-6 border-t bg-background space-y-6">
                            {/* الحصص - جدول أنيق */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4 border-b">
                                <h4 className="font-semibold text-lg">الحصص (الجدول)</h4>
                                <div className="flex items-center gap-2">
                                  {/* زر تبديل العرض */}
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
                                  <Button size="sm" onClick={() => openAddLessonDialog(cls.id)}>
                                    <Plus className="h-4 w-4 ml-1" />إضافة حصة
                                  </Button>
                                </div>
                              </div>
                              <div className="p-4">
                                {classLessons[cls.id]?.length > 0 ? (
                                  <>
                                    {/* عرض Calendar View */}
                                    {scheduleViewMode === "calendar" && (
                                      <div className="overflow-x-auto">
                                        <div className="min-w-[700px]">
                                          {/* أيام الأسبوع */}
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
                                          {/* الحصص حسب اليوم */}
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
                                                        </div>
                                                        {/* أزرار التعديل والحذف */}
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
                                    
                                    {/* عرض Table View */}
                                    {scheduleViewMode === "table" && (
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/50">
                                              <TableHead className="font-semibold text-right">اليوم</TableHead>
                                              <TableHead className="font-semibold text-right">المادة</TableHead>
                                              <TableHead className="font-semibold text-right">من</TableHead>
                                              <TableHead className="font-semibold text-right">إلى</TableHead>
                                              <TableHead className="font-semibold text-right">القاعة</TableHead>
                                              <TableHead className="font-semibold text-right">لينك الميتنج</TableHead>
                                              <TableHead className="font-semibold text-right w-[100px]">إجراءات</TableHead>
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
                                                  {lesson.meeting_link ? (
                                                    <a 
                                                      href={lesson.meeting_link} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-blue-500 hover:text-blue-600 hover:underline text-sm"
                                                    >
                                                      🔗 الميتنج
                                                    </a>
                                                  ) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex gap-1">
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
                            
                            {/* الطلاب */}
                            <div className="bg-card rounded-lg border">
                              <div className="flex items-center justify-between p-4">
                                <h4 className="font-semibold text-lg">الطلاب ({classStudentCounts[cls.id] || 0})</h4>
                                <Button size="sm" variant="outline" onClick={() => openClassStudentsDialog(cls.id)}>
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

            {/* Dialog لإدارة طلاب الفصل */}
            <Dialog open={classStudentsDialogOpen} onOpenChange={setClassStudentsDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">إدارة طلاب الفصل</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  {/* إسناد طالب جديد */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <Label className="text-base font-semibold">إسناد طالب للفصل</Label>
                    <p className="text-sm text-muted-foreground">اختر من جميع الطلاب المسجلين في الموقع</p>
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
                  
                  {/* قائمة طلاب الفصل */}
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
          </TabsContent>


          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>المعلمين المسندين</CardTitle>
                <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 ml-2" />إضافة معلم</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة معلم للمدرسة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اختر المعلم</Label>
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر معلم" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.full_name} ({t.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAssignTeacher} className="w-full" disabled={!selectedTeacherId}>
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <TableHead className="w-[100px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedTeachers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.full_name}</TableCell>
                          <TableCell dir="ltr" className="text-right">{t.email}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveTeacher(t.id)}>
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

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الطلاب المسندين</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportStudentsWithWeaknesses} disabled={assignedStudents.length === 0}>
                    <Download className="h-4 w-4 ml-2" />
                    تصدير Excel
                  </Button>
                  <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 ml-2" />إضافة طالب</Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة طالب للمدرسة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اختر الطالب</Label>
                        <SearchableSelect
                          value={selectedStudentId}
                          onValueChange={setSelectedStudentId}
                          options={availableStudents.map((s) => ({
                            value: s.id,
                            label: `${s.profile?.full_name || "غير معروف"} (${s.student_number || "بدون رقم"})`,
                          }))}
                          placeholder="اختر طالب"
                          searchPlaceholder="ابحث بالاسم أو رقم الطالب..."
                          emptyText="لا يوجد طلاب مطابقين"
                        />
                      </div>
                      <Button onClick={handleAssignStudent} className="w-full" disabled={!selectedStudentId}>
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {assignedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مسندين</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>رقم الطالب</TableHead>
                        <TableHead>البريد</TableHead>
                        <TableHead>نتائج التقييم</TableHead>
                        <TableHead className="w-[100px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedStudents.map((s) => {
                        const hasResults = studentAssessments[s.id] && studentAssessments[s.id].length > 0;
                        return (
                          <TableRow key={s.id}>
                            <TableCell>{s.profile?.full_name || "غير معروف"}</TableCell>
                            <TableCell>{s.student_number || "-"}</TableCell>
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
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(s.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Student Results Dialog */}
            <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    نتائج اختبارات التقييم - {selectedStudentForResults?.profile?.full_name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedStudentForResults && studentAssessments[selectedStudentForResults.id]?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الاختبار</TableHead>
                          <TableHead>النتيجة</TableHead>
                          <TableHead>النسبة</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>تاريخ الإتمام</TableHead>
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
                              {result.score ?? 0} / {result.assessment?.max_score ?? 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {result.percentage?.toFixed(0) ?? 0}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.passed ? (
                                <Badge variant="default" className="bg-green-500">ناجح</Badge>
                              ) : (
                                <Badge variant="destructive">راسب</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {result.completed_at ? formatDate(result.completed_at) : "-"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openWeaknessReport(result)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50 gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                السلبيات
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">لا توجد نتائج اختبارات</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Weakness Report Dialog */}
            <Dialog open={weaknessReportDialogOpen} onOpenChange={setWeaknessReportDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-500" />
                    تقرير السلبيات - {selectedAttemptForReport?.assessment?.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {loadingReport ? (
                    <p className="text-center text-muted-foreground py-4">جاري التحميل...</p>
                  ) : answerDetails.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {answerDetails.map((detail, index) => (
                          <div 
                            key={index} 
                            className={`border rounded-lg p-4 ${
                              detail.is_correct 
                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                            }`}
                          >
                            <p className="font-medium mb-2">
                              <span className="text-muted-foreground">السؤال {index + 1}:</span> {detail.question_text}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-muted-foreground">إجابة الطالب:</span>
                                <p className={`font-medium ${detail.is_correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                                  {detail.student_answer}
                                </p>
                              </div>
                              {!detail.is_correct && (
                                <div>
                                  <span className="text-muted-foreground">الإجابة الصحيحة:</span>
                                  <p className="font-medium text-green-700 dark:text-green-400">{detail.correct_answer}</p>
                                </div>
                              )}
                            </div>
                            {detail.explanation && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 mt-2">
                                <p className="text-xs text-muted-foreground mb-1">الشرح:</p>
                                <p className="text-sm text-blue-700 dark:text-blue-400">{detail.explanation}</p>
                              </div>
                            )}
                            {!detail.is_correct && detail.weakness_feedback && (
                              <div className="bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded p-2 mt-2">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-blue-500" />
                                  نقطة ضعف:
                                </p>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{detail.weakness_feedback}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {answerDetails.filter(d => !d.is_correct && d.weakness_feedback).length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-600">
                            <AlertTriangle className="h-4 w-4" />
                            ملخص السلبيات
                          </h4>
                          <div className="space-y-2">
                            {answerDetails
                              .filter(d => !d.is_correct && d.weakness_feedback)
                              .map((d, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-blue-500">•</span>
                                  <span className="text-blue-700 dark:text-blue-400">{d.weakness_feedback}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

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
                    if (selectedClassForAttendance) {
                      fetchAttendanceData(selectedClassForAttendance, e.target.value);
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
                            <TableHead className="font-semibold text-right">اسم الطالب</TableHead>
                            <TableHead className="font-semibold text-right">رقم الطالب</TableHead>
                            <TableHead className="font-semibold text-right">الحصة</TableHead>
                            <TableHead className="font-semibold text-right">وقت الحضور</TableHead>
                            <TableHead className="font-semibold text-right">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentAttendance.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-right">
                                {record.student?.profile?.full_name || "غير معروف"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{record.student?.student_number || "-"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{record.lesson?.subject || "-"}</TableCell>
                              <TableCell dir="ltr" className="text-muted-foreground text-left">
                                {record.joined_at ? format(new Date(record.joined_at), "HH:mm:ss") : "-"}
                              </TableCell>
                              <TableCell className="text-right">{getStatusBadge(record.status)}</TableCell>
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
                            <TableHead className="font-semibold text-right">اسم المعلم</TableHead>
                            <TableHead className="font-semibold text-right">الحصة</TableHead>
                            <TableHead className="font-semibold text-right">وقت الحضور</TableHead>
                            <TableHead className="font-semibold text-right">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teacherAttendance.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-right">
                                {record.teacher?.full_name || "غير معروف"}
                              </TableCell>
                              <TableCell className="text-right">{record.lesson?.subject || "-"}</TableCell>
                              <TableCell dir="ltr" className="text-muted-foreground text-left">
                                {record.joined_at ? format(new Date(record.joined_at), "HH:mm:ss") : "-"}
                              </TableCell>
                              <TableCell className="text-right">{getStatusBadge(record.status)}</TableCell>
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

export default SchoolDetailsPage;
