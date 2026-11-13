import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionError";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface PermissionDef {
  key: string;
  label: string;
  section: string;
}

// Mirrors the admin-only sections available in DashboardLayout's nav so that
// whatever an admin grants here maps 1:1 to what the staff member will see.
const PERMISSION_CATALOG: PermissionDef[] = [
  { section: "إدارة المستخدمين", key: "users", label: "المستخدمين" },
  { section: "إدارة المستخدمين", key: "teachers_manage", label: "إدارة المعلمين" },
  { section: "إدارة المستخدمين", key: "students", label: "الطلاب" },
  { section: "إدارة المستخدمين", key: "tasks", label: "مهام الطلاب" },
  { section: "إدارة المحتوى", key: "categories", label: "التصنيفات" },
  { section: "إدارة المحتوى", key: "courses", label: "إدارة الدورات التدريبية" },
  { section: "إدارة المحتوى", key: "quizzes", label: "إدارة الاختبارات" },
  { section: "إدارة المحتوى", key: "quiz_results", label: "درجات الاختبارات" },
  { section: "إدارة المحتوى", key: "zoom_links", label: "روابط Zoom" },
  { section: "إدارة المحتوى", key: "products", label: "المنتجات" },
  { section: "إدارة المحتوى", key: "blog_posts", label: "إدارة المقالات" },
  { section: "إدارة المحتوى", key: "certificates", label: "الشهادات" },
  { section: "إدارة المحتوى", key: "level_assessments", label: "اختبارات تحديد المستوى" },
  { section: "إدارة المحتوى", key: "forms", label: "النماذج والاستبيانات" },
  { section: "إدارة المحتوى", key: "lecture_attendance", label: "الحضور والغياب" },
  { section: "إدارة المحتوى", key: "reviews", label: "آراء الطلاب" },
  { section: "المبيعات والحسابات", key: "course_requests", label: "طلبات الدورات التدريبية" },
  { section: "المبيعات والحسابات", key: "grant_courses", label: "منح الدورات التدريبية مجاناً" },
  { section: "المبيعات والحسابات", key: "discount_codes", label: "أكواد الخصم" },
  { section: "المبيعات والحسابات", key: "financials", label: "الحسابات والماليات (الفلوس والإيرادات)" },
  { section: "التسويق والموقع", key: "news_ticker", label: "الشريط الإخباري" },
  { section: "التسويق والموقع", key: "portfolio", label: "سابقة الأعمال" },
  { section: "التسويق والموقع", key: "news_updates", label: "أخبار وفيديوهات الرئيسية" },
  { section: "التسويق والموقع", key: "site_settings", label: "إعدادات الموقع" },
  { section: "التسويق والموقع", key: "policies", label: "السياسات" },
  { section: "النظام", key: "activity_logs", label: "سجل النشاطات" },
];

const PERMISSION_SECTIONS = [...new Set(PERMISSION_CATALOG.map((p) => p.section))];

interface StaffRow {
  user_id: string;
  full_name: string;
  email: string;
  permissions: string[];
}

const emptyNewStaff = { email: "", password: "", fullName: "" };

const ManageStaffPage = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && (!user || userRole !== "admin")) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, userRole, loading, navigate]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newStaff, setNewStaff] = useState(emptyNewStaff);
  const [newPermissions, setNewPermissions] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editPermissions, setEditPermissions] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff_accounts"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff" as any);
      if (rolesError) throw rolesError;

      const userIds = (roles || []).map((r: any) => r.user_id);
      if (userIds.length === 0) return [] as StaffRow[];

      const [{ data: profiles, error: profilesError }, { data: perms, error: permsError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("staff_permissions" as any).select("user_id, permission_key").in("user_id", userIds),
      ]);
      if (profilesError) throw profilesError;
      if (permsError) throw permsError;

      const permsByUser = new Map<string, string[]>();
      ((perms || []) as any[]).forEach((p) => {
        const arr = permsByUser.get(p.user_id) || [];
        arr.push(p.permission_key);
        permsByUser.set(p.user_id, arr);
      });

      return ((profiles || []) as any[]).map((p) => ({
        user_id: p.id,
        full_name: p.full_name || "—",
        email: p.email || "—",
        permissions: permsByUser.get(p.id) || [],
      })) as StaffRow[];
    },
    enabled: !!user && userRole === "admin",
  });

  const toggleSet = (set: Set<string>, key: string, setSetter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSetter(next);
  };

  const handleCreate = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.fullName) {
      toast.error("من فضلك أكمل البريد الإلكتروني وكلمة المرور والاسم");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-staff-user", {
        body: {
          email: newStaff.email,
          password: newStaff.password,
          fullName: newStaff.fullName,
          permissions: Array.from(newPermissions),
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "فشل إنشاء الحساب"));
      if (data?.error) throw new Error(data.error);

      toast.success("تم إنشاء حساب المشرف بنجاح");
      setCreateOpen(false);
      setNewStaff(emptyNewStaff);
      setNewPermissions(new Set());
      queryClient.invalidateQueries({ queryKey: ["staff_accounts"] });
    } catch (err: any) {
      toast.error(err.message || "فشل إنشاء الحساب");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row: StaffRow) => {
    setEditTarget(row);
    setEditPermissions(new Set(row.permissions));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const { error: delError } = await supabase
        .from("staff_permissions" as any)
        .delete()
        .eq("user_id", editTarget.user_id);
      if (delError) throw delError;

      const rows = Array.from(editPermissions).map((key) => ({
        user_id: editTarget.user_id,
        permission_key: key,
        granted_by: user?.id,
      }));
      if (rows.length > 0) {
        const { error: insError } = await supabase.from("staff_permissions" as any).insert(rows);
        if (insError) throw insError;
      }

      toast.success("تم تحديث الصلاحيات بنجاح");
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["staff_accounts"] });
    } catch (err: any) {
      toast.error(err.message || "فشل تحديث الصلاحيات");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-staff-user", {
        body: { userId: deleteTarget.user_id },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "فشل حذف الحساب"));
      if (data?.error) throw new Error(data.error);

      toast.success("تم حذف حساب المشرف");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["staff_accounts"] });
    } catch (err: any) {
      toast.error(err.message || "فشل حذف الحساب");
    } finally {
      setDeleting(false);
    }
  };

  const labelFor = (key: string) => PERMISSION_CATALOG.find((p) => p.key === key)?.label || key;

  const PermissionGrid = ({ selected, onToggle }: { selected: Set<string>; onToggle: (key: string) => void }) => (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
      {PERMISSION_SECTIONS.map((section) => (
        <div key={section} className="space-y-2">
          <h4 className="text-sm font-bold text-muted-foreground">{section}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSION_CATALOG.filter((p) => p.section === section).map((p) => (
              <label
                key={p.key}
                className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 text-sm"
              >
                <Checkbox checked={selected.has(p.key)} onCheckedChange={() => onToggle(p.key)} />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              إدارة المشرفين
            </h1>
            <p className="text-muted-foreground mt-1">
              أضف حسابات مشرفين جدد وحدد بالظبط أي أقسام من لوحة التحكم يقدروا يشوفوها ويتعاملوا معاها.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة مشرف جديد
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">المشرفون الحاليون</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
            ) : staffList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لسه مفيش مشرفين مضافين.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الصلاحيات</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" dir="ltr">{row.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {row.permissions.length === 0 ? (
                              <span className="text-xs text-muted-foreground">لا يوجد صلاحيات</span>
                            ) : (
                              row.permissions.map((key) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {labelFor(key)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(row)} className="gap-1.5">
                              <Pencil className="h-3.5 w-3.5" />
                              تعديل الصلاحيات
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row)} className="gap-1.5">
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </Button>
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
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مشرف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  placeholder="مثلاً: أحمد المحاسب"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="text"
                  dir="ltr"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الصلاحيات (اختر الأقسام اللي عايزه يشوفها ويتعامل معاها)</Label>
              <PermissionGrid
                selected={newPermissions}
                onToggle={(key) => toggleSet(newPermissions, key, setNewPermissions)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات {editTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <PermissionGrid
            selected={editPermissions}
            onToggle={(key) => toggleSet(editPermissions, key, setEditPermissions)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="gap-2">
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب المشرف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هيتم حذف حساب "{deleteTarget?.full_name}" نهائيًا ولن يقدر يدخل على المنصة تاني. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف نهائيًا"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ManageStaffPage;
