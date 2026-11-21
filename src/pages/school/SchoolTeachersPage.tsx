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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserX, UserPlus } from "lucide-react";

interface Teacher {
  id: string;
  teacher_id: string;
  profiles: { full_name: string; email: string | null } | null;
}

const SchoolTeachersPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ fullName: "", email: "", password: "", phone: "" });

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
        const { data: teachersData } = await supabase
          .from("school_teachers")
          .select("id, teacher_id, profiles:teacher_id(full_name, email)")
          .eq("school_id", school.id);
        setTeachers(teachersData || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-school-teacher", {
        body: {
          email: newTeacher.email,
          password: newTeacher.password,
          fullName: newTeacher.fullName,
          phone: newTeacher.phone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "تم إنشاء حساب المعلم بنجاح" });
      setNewTeacher({ fullName: "", email: "", password: "", phone: "" });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveTeacher = async (id: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا المعلم من المدرسة؟")) return;
    try {
      const { error } = await supabase.from("school_teachers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم إزالة المعلم من المدرسة" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold">المعلمين</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                إضافة معلم
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة معلم جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input required value={newTeacher.fullName} onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input required type="email" dir="ltr" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <PasswordInput required dir="ltr" minLength={6} value={newTeacher.password} onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف (اختياري)</Label>
                  <Input type="tel" dir="ltr" value={newTeacher.phone} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? "جاري الإنشاء..." : "إنشاء حساب المعلم"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة المعلمين</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTeachers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد معلمين مسجلين في المدرسة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المعلم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead className="w-[80px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.profiles?.full_name || "غير محدد"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{teacher.profiles?.email || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTeacher(teacher.id)} title="إزالة من المدرسة">
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

export default SchoolTeachersPage;
