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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, GraduationCap, UserPlus, ClipboardCheck, Eye, Award, AlertTriangle } from "lucide-react";
import WhatsAppContactButton from "@/components/WhatsAppContactButton";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

interface Student {
  id: string;
  user_id: string | null;
  class_id: string | null;
  student_number: string | null;
  parent_id: string | null;
  school_id: string | null;
  stage_id: string | null;
  grade_level_id: string | null;
  status: string;
  created_at: string;
  student_name?: string;
  student_email?: string;
  student_phone?: string;
  student_whatsapp?: string | null;
  student_country_code?: string | null;
  class_name?: string;
  parent_name?: string;
  school_name?: string;
  stage_name?: string;
  grade_level_name?: string;
  assessment_count?: number;
}

interface StudentAssessmentResult {
  id: string;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
  assessment_title: string;
  max_score: number;
}

interface AnswerDetail {
  question_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  weakness_feedback: string | null;
  explanation: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  school_id: string | null;
  stage_id: string | null;
  grade_level_id: string | null;
}

interface SchoolOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
}

interface GradeLevelOption {
  id: string;
  name: string;
  stage_id: string;
}

interface UserOption {
  id: string;
  full_name: string;
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  graduated: "متخرج",
};

const statusBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  graduated: "outline",
};

const StudentsPage = () => {
  const { userRole, profile, user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!user || !(userRole === "admin" || userRole === "teacher" || hasPermission("students")))) {
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, hasPermission, navigate]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [parents, setParents] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // نتائج اختبارات الطلاب
  const [studentAssessments, setStudentAssessments] = useState<Record<string, StudentAssessmentResult[]>>({});
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedStudentForResults, setSelectedStudentForResults] = useState<Student | null>(null);
  
  // تقرير السلبيات
  const [weaknessReportDialogOpen, setWeaknessReportDialogOpen] = useState(false);
  const [selectedAttemptForReport, setSelectedAttemptForReport] = useState<StudentAssessmentResult | null>(null);
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const [newStudentForm, setNewStudentForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    whatsapp: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    parentPhone: "",
    studentNumber: "",
    parentId: "",
    status: "active",
  });

  // Form for editing existing student — limited to name, student number, and
  // contact info (phone/whatsapp/country code) so the admin can fix a
  // student's WhatsApp linking directly from this dialog; the school/stage/
  // grade/class/parent/status assignment fields were removed on request.
  const [editForm, setEditForm] = useState({
    fullName: "",
    studentNumber: "",
    phone: "",
    whatsapp: "",
    countryCode: DEFAULT_COUNTRY_CODE,
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchSchools();
    fetchStages();
    fetchGradeLevels();
    fetchParents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const studentUserIds = [...new Set((data || []).filter(s => s.user_id).map(s => s.user_id))];
      const classIds = [...new Set((data || []).filter(s => s.class_id).map(s => s.class_id))];
      const parentIds = [...new Set((data || []).filter(s => s.parent_id).map(s => s.parent_id))];
      const schoolIds = [...new Set((data || []).filter(s => s.school_id).map(s => s.school_id))];
      const stageIds = [...new Set((data || []).filter(s => s.stage_id).map(s => s.stage_id))];
      const gradeLevelIds = [...new Set((data || []).filter(s => s.grade_level_id).map(s => s.grade_level_id))];

      const [profilesRes, classesRes, schoolsRes, stagesRes, gradeLevelsRes] = await Promise.all([
        studentUserIds.length > 0 || parentIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email, phone, whatsapp, country_code").in("id", [...studentUserIds, ...parentIds])
          : { data: [] },
        classIds.length > 0 
          ? supabase.from("classes").select("id, name").in("id", classIds)
          : { data: [] },
        schoolIds.length > 0
          ? supabase.from("schools").select("id, name").in("id", schoolIds)
          : { data: [] },
        stageIds.length > 0
          ? supabase.from("stages").select("id, name").in("id", stageIds)
          : { data: [] },
        gradeLevelIds.length > 0
          ? supabase.from("grade_levels").select("id, name").in("id", gradeLevelIds)
          : { data: [] },
      ]);

      const studentsWithDetails = (data || []).map(student => {
        const profile = profilesRes.data?.find(p => p.id === student.user_id);
        return {
          ...student,
          student_name: profile?.full_name || "-",
          student_email: profile?.email || "-",
          student_phone: profile?.phone || "-",
          student_whatsapp: (profile as any)?.whatsapp || profile?.phone || null,
          student_country_code: (profile as any)?.country_code || null,
          class_name: classesRes.data?.find(c => c.id === student.class_id)?.name || "-",
          parent_name: profilesRes.data?.find(p => p.id === student.parent_id)?.full_name || "-",
          school_name: schoolsRes.data?.find(s => s.id === student.school_id)?.name || "مستقل",
          stage_name: stagesRes.data?.find(s => s.id === student.stage_id)?.name || "-",
          grade_level_name: gradeLevelsRes.data?.find(g => g.id === student.grade_level_id)?.name || "-",
        };
      });

      setStudents(studentsWithDetails);

      // جلب نتائج اختبارات الطلاب
      const studentIds = (data || []).map(s => s.id);
      if (studentIds.length > 0) {
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
            assessment_title: attempt.assessment?.title || "غير معروف",
            max_score: attempt.assessment?.max_score || 0
          });
        });
        setStudentAssessments(assessmentsByStudent);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الطلاب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("id, name, school_id, stage_id, grade_level_id");
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data } = await supabase.from("schools").select("id, name").eq("is_active", true);
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchStages = async () => {
    try {
      const { data } = await supabase.from("global_stages").select("id, name").order("order_index");
      setStages(data || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  const fetchGradeLevels = async () => {
    try {
      const { data } = await supabase.from("grade_levels").select("id, name, stage_id").order("order_index");
      setGradeLevels(data || []);
    } catch (error) {
      console.error("Error fetching grade levels:", error);
    }
  };

  const fetchParents = async () => {
    try {
      const { data: parentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "parent");

      if (parentRoles && parentRoles.length > 0) {
        const { data: parentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", parentRoles.map(r => r.user_id));
        setParents(parentProfiles || []);
      }
    } catch (error) {
      console.error("Error fetching parents:", error);
    }
  };

  const handleCreateNewStudent = async () => {
    if (!newStudentForm.email || !newStudentForm.password || !newStudentForm.fullName) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور والاسم",
        variant: "destructive",
      });
      return;
    }

    if (newStudentForm.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const countryDial = COUNTRY_CODES.find((c) => c.code === newStudentForm.countryCode)?.dial || null;
      const response = await supabase.functions.invoke("create-student-user", {
        body: {
          email: newStudentForm.email,
          password: newStudentForm.password,
          fullName: newStudentForm.fullName,
          phone: newStudentForm.phone || null,
          whatsapp: newStudentForm.whatsapp || null,
          countryCode: countryDial,
          parentPhone: newStudentForm.parentPhone || null,
          studentNumber: newStudentForm.studentNumber || null,
          schoolId: null,
          stageId: null,
          gradeLevelId: null,
          classId: null,
          parentId: newStudentForm.parentId || null,
          status: newStudentForm.status,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create student");
      }

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء حساب الطالب بنجاح",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error("Error creating student:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء حساب الطالب",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          student_number: editForm.studentNumber || null,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      if (editingStudent.user_id) {
        const countryDial = COUNTRY_CODES.find((c) => c.code === editForm.countryCode)?.dial || null;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: editForm.fullName.trim() || null,
            phone: editForm.phone.trim() || null,
            whatsapp: editForm.whatsapp.trim() || null,
            country_code: countryDial,
          })
          .eq("id", editingStudent.user_id);
        if (profileError) throw profileError;
      }

      toast({ title: "تم التحديث", description: "تم تحديث بيانات الطالب بنجاح" });
      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث بيانات الطالب",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;

    try {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;

      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف الطالب بنجاح" });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الطالب",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsCreatingNew(false);
    setEditForm({
      fullName: student.student_name || "",
      studentNumber: student.student_number || "",
      phone: student.student_phone && student.student_phone !== "-" ? student.student_phone : "",
      whatsapp: student.student_whatsapp || "",
      countryCode:
        COUNTRY_CODES.find(
          (c) => c.dial === student.student_country_code || c.code === student.student_country_code
        )?.code || DEFAULT_COUNTRY_CODE,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingStudent(null);
    setIsCreatingNew(true);
    setNewStudentForm({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      whatsapp: "",
      countryCode: DEFAULT_COUNTRY_CODE,
      parentPhone: "",
      studentNumber: "",
      parentId: "",
      status: "active",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setIsCreatingNew(false);
    setNewStudentForm({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      whatsapp: "",
      countryCode: DEFAULT_COUNTRY_CODE,
      parentPhone: "",
      studentNumber: "",
      parentId: "",
      status: "active",
    });
    setEditForm({
      fullName: "",
      studentNumber: "",
      phone: "",
      whatsapp: "",
      countryCode: DEFAULT_COUNTRY_CODE,
    });
  };

  const filteredStudents = students.filter((s) =>
    (s.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.student_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.student_email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
            <p className="text-muted-foreground">إضافة وإدارة بيانات الطلاب وإسنادهم للمدارس</p>
          </div>
          <Button className="gap-2" onClick={openCreateDialog}>
            <UserPlus className="h-4 w-4" />
            إضافة طالب جديد
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isCreatingNew ? (
                  <>
                    <UserPlus className="h-5 w-5" />
                    إنشاء حساب طالب جديد
                  </>
                ) : (
                  <>
                    <Pencil className="h-5 w-5" />
                    تعديل بيانات الطالب
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {isCreatingNew ? (
              <div className="space-y-6">
                {/* Account Info Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">بيانات الحساب</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">الاسم الكامل *</Label>
                      <Input
                        id="fullName"
                        value={newStudentForm.fullName}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                        placeholder="أدخل اسم الطالب"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newStudentForm.email}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newStudentForm.password}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                        placeholder="6 أحرف على الأقل"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentNumber">رقم الطالب</Label>
                      <Input
                        id="studentNumber"
                        value={newStudentForm.studentNumber}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, studentNumber: e.target.value })}
                        placeholder="مثال: 2024001"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">بيانات التواصل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم هاتف الطالب</Label>
                      <Input
                        id="phone"
                        value={newStudentForm.phone}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">رقم هاتف ولي الأمر</Label>
                      <Input
                        id="parentPhone"
                        value={newStudentForm.parentPhone}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, parentPhone: e.target.value })}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>كود الدولة (للواتساب)</Label>
                      <Select
                        value={newStudentForm.countryCode}
                        onValueChange={(value) => setNewStudentForm({ ...newStudentForm, countryCode: value })}
                      >
                        <SelectTrigger className="bg-background" dir="ltr">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label} ({c.dial})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">رقم الواتساب</Label>
                      <Input
                        id="whatsapp"
                        value={newStudentForm.whatsapp}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, whatsapp: e.target.value })}
                        placeholder="01xxxxxxxxx (اتركه فارغاً لاستخدام رقم الهاتف)"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">بيانات إضافية</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ولي الأمر</Label>
                      <Select
                        value={newStudentForm.parentId || "none"}
                        onValueChange={(value) => setNewStudentForm({ ...newStudentForm, parentId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="اختر ولي الأمر" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="none">بدون ولي أمر</SelectItem>
                          {parents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الحالة</Label>
                      <Select
                        value={newStudentForm.status}
                        onValueChange={(value) => setNewStudentForm({ ...newStudentForm, status: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">تعديل بيانات الطالب</p>
                </div>

                <div className="space-y-2">
                  <Label>الاسم</Label>
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    placeholder="اسم الطالب"
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم الطالب</Label>
                  <Input
                    value={editForm.studentNumber}
                    onChange={(e) => setEditForm({ ...editForm, studentNumber: e.target.value })}
                    placeholder="مثال: 2024001"
                  />
                </div>

                <div className="space-y-4 pt-2 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground pt-2">بيانات التواصل (لتفعيل الواتساب)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهاتف / الواتساب</Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>كود الدولة (للواتساب)</Label>
                      <Select
                        value={editForm.countryCode}
                        onValueChange={(value) => setEditForm({ ...editForm, countryCode: value })}
                      >
                        <SelectTrigger className="bg-background" dir="ltr">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label} ({c.dial})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>رقم واتساب مختلف (اختياري)</Label>
                    <Input
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                      placeholder="اتركه فارغاً لاستخدام رقم الهاتف نفسه"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    اختر كود الدولة الصح قبل الحفظ، عشان زرار الواتساب يشتغل صح فورًا بعد إضافة الرقم.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                إلغاء
              </Button>
              <Button 
                onClick={isCreatingNew ? handleCreateNewStudent : handleUpdateStudent}
                disabled={submitting}
              >
                {submitting ? "جاري الحفظ..." : (isCreatingNew ? "إنشاء الحساب" : "تحديث")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                الطلاب ({filteredStudents.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الرقم أو الإيميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا يوجد طلاب</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطالب</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>المدرسة</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>الصف</TableHead>
                      <TableHead>الفصل</TableHead>
                      <TableHead>اختبارات التقييم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const hasResults = studentAssessments[student.id] && studentAssessments[student.id].length > 0;
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{student.student_number || "-"}</TableCell>
                          <TableCell className="font-medium">{student.student_name}</TableCell>
                          <TableCell>
                            <Badge variant={student.school_id ? "default" : "outline"}>
                              {student.school_name}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.stage_name}</TableCell>
                          <TableCell>{student.grade_level_name}</TableCell>
                          <TableCell>{student.class_name}</TableCell>
                          <TableCell>
                            {hasResults ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openStudentResults(student)}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                عرض النتائج ({studentAssessments[student.id].length})
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">لم يخض اختبارات</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariants[student.status] || "secondary"}>
                              {statusLabels[student.status] || student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <WhatsAppContactButton
                                phone={student.student_whatsapp}
                                countryDial={student.student_country_code}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(student)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(student.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Results Dialog */}
        <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                نتائج اختبارات التقييم - {selectedStudentForResults?.student_name}
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
                          {result.assessment_title}
                        </TableCell>
                        <TableCell>
                          {result.score ?? 0} / {result.max_score ?? 0}
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
                تقرير السلبيات - {selectedAttemptForReport?.assessment_title}
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
      </div>
    </DashboardLayout>
  );
};

export default StudentsPage;
