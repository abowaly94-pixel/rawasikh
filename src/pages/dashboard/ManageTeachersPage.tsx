import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Pencil, Trash2, Users, BookOpen, Calendar, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  courses_count: number;
  classes_count: number;
}

const ManageTeachersPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Add teacher fields
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addBio, setAddBio] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !(userRole === "admin" || hasPermission("teachers_manage"))) navigate("/dashboard");
  }, [user, loading, userRole, hasPermission, navigate]);

  useEffect(() => {
    if (user && (userRole === "admin" || hasPermission("teachers_manage"))) fetchTeachers();
  }, [user, userRole, hasPermission]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (!teacherRoles || teacherRoles.length === 0) {
        setTeachers([]);
        setIsLoading(false);
        return;
      }

      const teacherIds = teacherRoles.map((r) => r.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, bio")
        .in("id", teacherIds);

      const { data: courses } = await supabase
        .from("courses")
        .select("instructor_id")
        .in("instructor_id", teacherIds);

      const { data: classes } = await supabase
        .from("classes")
        .select("teacher_id")
        .in("teacher_id", teacherIds);

      const teachersData: TeacherProfile[] = (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        bio: p.bio,
        courses_count: (courses || []).filter((c) => c.instructor_id === p.id).length,
        classes_count: (classes || []).filter((c) => c.teacher_id === p.id).length,
      }));

      setTeachers(teachersData);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (teacher: TeacherProfile) => {
    setEditingTeacher(teacher);
    setEditName(teacher.full_name);
    setEditEmail(teacher.email || "");
    setEditPhone(teacher.phone || "");
    setEditBio(teacher.bio || "");
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingTeacher || !editName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          bio: editBio.trim() || null,
        })
        .eq("id", editingTeacher.id);

      if (error) throw error;
      toast({ title: "تم تحديث بيانات المعلم بنجاح" });
      setIsEditOpen(false);
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال الاسم والبريد وكلمة المرور", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("create-user-admin", {
        body: {
          email: addEmail.trim(),
          password: addPassword.trim(),
          fullName: addName.trim(),
          phone: addPhone.trim() || undefined,
          role: "teacher",
        },
      });

      if (response.error) {
        // Try to parse error body for a user-friendly message
        const errorBody = response.error?.message || "فشل في إضافة المعلم";
        throw new Error(response.data?.error || errorBody);
      }
      if (response.data?.error) throw new Error(response.data.error);

      // Update bio if provided
      if (addBio.trim() && response.data?.user?.id) {
        await supabase.from("profiles").update({ bio: addBio.trim() }).eq("id", response.data.user.id);
      }

      toast({ title: "تم إضافة المعلم بنجاح" });
      setIsAddOpen(false);
      setAddName(""); setAddEmail(""); setAddPassword(""); setAddPhone(""); setAddBio("");
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!deleteTeacherId) return;
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", deleteTeacherId)
        .eq("role", "teacher");

      if (error) throw error;
      toast({ title: "تم إزالة صلاحية المعلم بنجاح" });
      setDeleteTeacherId(null);
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة المعلمين</h1>
            <p className="text-muted-foreground">عرض وتعديل بيانات المعلمين ({teachers.length} معلم)</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة معلم
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "لا توجد نتائج" : "لا يوجد معلمين بعد"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المعلم</TableHead>
                    <TableHead className="text-right">البريد</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الدورات التدريبية</TableHead>
                    <TableHead className="text-right">الفصول</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={teacher.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {teacher.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{teacher.full_name}</p>
                            {teacher.bio && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{teacher.bio}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{teacher.email || "-"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{teacher.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{teacher.courses_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{teacher.classes_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTeacherId(teacher.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل بيانات المعلم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input dir="ltr" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نبذة</Label>
                <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTeacherId} onOpenChange={() => setDeleteTeacherId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم إزالة صلاحية المعلم من هذا المستخدم. لن يتم حذف حسابه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                إزالة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Teacher Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة معلم جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="أدخل اسم المعلم" />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني *</Label>
                <Input dir="ltr" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="teacher@example.com" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور *</Label>
                <PasswordInput dir="ltr" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>نبذة</Label>
                <Textarea value={addBio} onChange={(e) => setAddBio(e.target.value)} rows={3} placeholder="نبذة عن المعلم وتخصصه..." />
              </div>
              <Button onClick={handleAddTeacher} disabled={isSaving} className="w-full">
                {isSaving ? "جاري الإضافة..." : "إضافة المعلم"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageTeachersPage;
