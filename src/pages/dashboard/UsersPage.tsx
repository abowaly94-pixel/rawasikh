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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, UserPlus, Shield, KeyRound, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { getFunctionErrorMessage } from "@/lib/functionError";

type AppRole = "admin" | "teacher" | "student" | "parent" | "school";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "مدير النظام",
  teacher: "مدرس",
  student: "طالب",
  parent: "ولي أمر",
  school: "مدرسة",
};

// "مدرسة" (school) is no longer an assignable account type from the UI —
// kept out of both the "create user" and "change role" pickers, while
// `roleLabels` above stays complete so any pre-existing school-role account
// still displays its badge label correctly.
const assignableRoleLabels: Partial<Record<AppRole, string>> = Object.fromEntries(
  Object.entries(roleLabels).filter(([key]) => key !== "school")
);

const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "destructive",
  teacher: "default",
  student: "secondary",
  parent: "outline",
  school: "default",
};

const createUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  phone: z.string().optional(),
  role: z.enum(["admin", "teacher", "student", "parent", "school"]),
});

const UsersPage = () => {
  const { userRole, profile, user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !(userRole === "admin" || hasPermission("users")))) {
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, hasPermission, navigate]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [passwordUserName, setPasswordUserName] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email || "",
          phone: profile.phone,
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || "student",
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات المستخدمين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const validated = createUserSchema.parse({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        phone: newPhone || undefined,
        role: newRole,
      });

      setIsCreating(true);

      let data, error;
      
      if (validated.role === "school") {
        // Use school-specific Edge Function
        const result = await supabase.functions.invoke("create-school-user", {
          body: {
            email: validated.email,
            password: validated.password,
            schoolName: validated.fullName,
            phone: validated.phone,
          },
        });
        data = result.data;
        error = result.error;
      } else {
        // Use general admin Edge Function
        const result = await supabase.functions.invoke("create-user-admin", {
          body: {
            email: validated.email,
            password: validated.password,
            fullName: validated.fullName,
            phone: validated.phone,
            role: validated.role,
          },
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "تم إنشاء الحساب",
        description: `تم إنشاء حساب ${roleLabels[validated.role]} بنجاح`,
      });

      // Reset form
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewPhone("");
      setNewRole("student");
      setIsCreateDialogOpen(false);
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error instanceof Error ? error.message : "فشل في إنشاء الحساب",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "تم التحديث",
        description: "تم تحديث دور المستخدم بنجاح",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث دور المستخدم",
        variant: "destructive",
      });
    }
  };

  const openPasswordDialog = (userId: string, userName: string) => {
    setPasswordUserId(userId);
    setPasswordUserName(userName);
    setNewPasswordValue("");
    setPasswordDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!passwordUserId || !newPasswordValue) return;
    setIsUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user-password", {
        body: { userId: passwordUserId, newPassword: newPasswordValue },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "فشل في تغيير كلمة المرور"));
      if (data?.error) throw new Error(data.error);
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      setPasswordDialogOpen(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في تغيير كلمة المرور",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-user-admin", {
        body: { userId },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "فشل في حذف المستخدم"));
      if (data?.error) throw new Error(data.error);
      toast({ title: "تم الحذف", description: `تم حذف المستخدم ${userName} بنجاح` });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في حذف المستخدم",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              إدارة المستخدمين
            </h1>
            <p className="text-muted-foreground">إنشاء وإدارة حسابات المستخدمين وأدوارهم</p>
          </div>
          
          {/* Create User Button - Admin Only */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                إنشاء مستخدم جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  إنشاء مستخدم جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">الاسم الكامل *</Label>
                  <Input
                    id="new-name"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="أدخل الاسم الكامل"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-email">البريد الإلكتروني *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-phone">رقم الهاتف</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-role">نوع الحساب *</Label>
                  <Select value={newRole} onValueChange={(value: AppRole) => setNewRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(assignableRoleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CardTitle>قائمة المستخدمين ({filteredUsers.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا يوجد مستخدمين</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead>تغيير الدور</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell dir="ltr" className="text-right">{user.email}</TableCell>
                        <TableCell dir="ltr" className="text-right">{user.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariants[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: AppRole) => handleUpdateRole(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(assignableRoleLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => openPasswordDialog(user.id, user.full_name)}
                            >
                              <KeyRound className="h-4 w-4" />
                              تغيير الباسورد
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive gap-1">
                                  <Trash2 className="h-4 w-4" />
                                  حذف
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف المستخدم <strong>{user.full_name}</strong>؟
                                    سيتم حذف الحساب وجميع بياناته نهائياً ولا يمكن التراجع.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteUser(user.id, user.full_name)}
                                  >
                                    حذف نهائياً
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                تغيير كلمة المرور
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">تغيير كلمة المرور للمستخدم: <strong>{passwordUserName}</strong></p>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة *</Label>
                <Input
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || newPasswordValue.length < 6}>
                {isUpdatingPassword ? "جاري التحديث..." : "تحديث كلمة المرور"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;