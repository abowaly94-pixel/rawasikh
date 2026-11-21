import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserX, UserPlus } from "lucide-react";

interface Student {
  id: string;
  student_number: string | null;
  status: string | null;
  user_id: string | null;
  profiles: { full_name: string; email: string | null } | null;
}

const SchoolStudentsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({ fullName: "", email: "", password: "", phone: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && userRole !== "school") navigate("/dashboard");
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") fetchData();
  }, [user, userRole]);

  const fetchData = async () => {
    try {
      const { data: school } = await supabase
        .from("schools").select("id").eq("user_id", user?.id).single();

      if (school) {
        setSchoolId(school.id);
        const { data: studentsData } = await supabase
          .from("students").select("id, student_number, status, user_id").eq("school_id", school.id);

        if (studentsData && studentsData.length > 0) {
          const userIds = studentsData.map((s) => s.user_id).filter(Boolean) as string[];

          const { data: teacherRoles } = await supabase
            .from("user_roles").select("user_id").in("user_id", userIds).in("role", ["teacher", "school"]);

          const excludedUserIds = new Set((teacherRoles || []).map((r) => r.user_id));
          const actualStudents = studentsData.filter((s) => !s.user_id || !excludedUserIds.has(s.user_id));

          const studentsWithProfiles = await Promise.all(
            actualStudents.map(async (student) => {
              if (student.user_id) {
                const { data: profileData } = await supabase
                  .from("profiles").select("full_name, email").eq("id", student.user_id).single();
                return { ...student, profiles: profileData };
              }
              return { ...student, profiles: null };
            })
          );
          setStudents(studentsWithProfiles);
        } else {
          setStudents([]);
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-school-student", {
        body: {
          email: newStudent.email,
          password: newStudent.password,
          fullName: newStudent.fullName,
          phone: newStudent.phone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "تم إنشاء حساب الطالب بنجاح" });
      setNewStudent({ fullName: "", email: "", password: "", phone: "" });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveStudent = async (id: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا الطالب من المدرسة؟")) return;
    try {
      const { error } = await supabase.from("students").update({ school_id: null }).eq("id", id);
      if (error) throw error;
      toast({ title: "تم إزالة الطالب من المدرسة" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const filteredStudents = students.filter((s) =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">الطلاب</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                إضافة طالب
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة طالب جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input required value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input required type="email" dir="ltr" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <PasswordInput required dir="ltr" minLength={6} value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف (اختياري)</Label>
                  <Input type="tel" dir="ltr" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? "جاري الإنشاء..." : "إنشاء حساب الطالب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة الطلاب</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مسجلين في المدرسة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>رقم الطالب</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-[80px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.profiles?.full_name || "غير محدد"}</TableCell>
                      <TableCell>{student.student_number || "-"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{student.profiles?.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status === "active" ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)} title="إزالة من المدرسة">
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
};

export default SchoolStudentsPage;
