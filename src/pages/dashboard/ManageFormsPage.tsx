import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ClipboardList, Eye, EyeOff, ListChecks, BarChart3, GraduationCap } from "lucide-react";

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  course_id: string | null;
  responses_count?: number;
  fields_count?: number;
}

interface CourseOpt { id: string; title: string }

const NONE = "__none__";

const emptyForm = { title: "", description: "", is_active: true, course_id: NONE };

const ManageFormsPage = () => {
  const navigate = useNavigate();
  const { profile, userRole, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!loading && !(userRole === "admin" || hasPermission("forms"))) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [loading, userRole, hasPermission, navigate]);

  const { data: forms, isLoading } = useQuery({
    queryKey: ["admin_forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms" as any)
        .select(`
          *,
          form_fields(count),
          form_responses(count)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((f) => ({
        ...f,
        fields_count: f.form_fields?.[0]?.count || 0,
        responses_count: f.form_responses?.[0]?.count || 0,
      })) as FormRow[];
    },
    enabled: userRole === "admin" || hasPermission("forms"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["forms_courses_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return (data as any[]) as CourseOpt[];
    },
    enabled: userRole === "admin" || hasPermission("forms"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: created, error } = await supabase
        .from("forms" as any)
        .insert({
          title: data.title,
          description: data.description || null,
          is_active: data.is_active,
          course_id: data.course_id === NONE ? null : data.course_id,
        })
        .select()
        .single();
      if (error) throw error;
      return created as any;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin_forms"] });
      toast.success("تم إنشاء النموذج بنجاح");
      resetForm();
      setIsDialogOpen(false);
      navigate(`/dashboard/forms/${created.id}/fields`);
    },
    onError: () => toast.error("حدث خطأ أثناء إنشاء النموذج"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("forms" as any)
        .update({
          title: data.title,
          description: data.description || null,
          is_active: data.is_active,
          course_id: data.course_id === NONE ? null : data.course_id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_forms"] });
      toast.success("تم تحديث النموذج بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ أثناء تحديث النموذج"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_forms"] });
      toast.success("تم حذف النموذج بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء حذف النموذج"),
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingForm(null);
  };

  const handleEdit = (form: FormRow) => {
    setEditingForm(form);
    setFormData({
      title: form.title,
      description: form.description || "",
      is_active: form.is_active,
      course_id: form.course_id || NONE,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان النموذج");
      return;
    }
    if (editingForm) {
      updateMutation.mutate({ id: editingForm.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">النماذج والاستبيانات</h1>
            <p className="text-muted-foreground mt-1">أنشئي نماذج تسجيل أو استبيانات رضا وكل البيانات هتتجمع هنا</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة نموذج
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingForm ? "تعديل النموذج" : "إضافة نموذج جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-title">عنوان النموذج *</Label>
                  <Input
                    id="form-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: استبيان رضا الطلاب"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-description">وصف النموذج</Label>
                  <Textarea
                    id="form-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="نص يظهر للطالب أعلى النموذج (اختياري)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>مكان الظهور</Label>
                  <SearchableSelect
                    value={formData.course_id}
                    onValueChange={(v) => setFormData({ ...formData, course_id: v })}
                    options={[
                      { value: NONE, label: "عام — يظهر لكل الطلاب" },
                      ...courses.map((c) => ({ value: c.id, label: `خاص بدورة تدريبية: ${c.title}` })),
                    ]}
                    placeholder="اختر مكان ظهور النموذج"
                    searchPlaceholder="ابحثي عن دورة تدريبية..."
                    emptyText="لا توجد دورات تدريبية مطابقة"
                  />
                  <p className="text-xs text-muted-foreground">
                    لو اخترتِ دورة تدريبية معيّنة، النموذج هيظهر بس للطلبة اللي مشتركين في هذه الدورة (وممكن نضيفه في نهاية الدورة).
                    لو سبتيه "عام"، هيظهر لكل الطلاب في صفحة النماذج.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="form-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="form-active">مفعّل (يظهر للطلاب)</Label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingForm ? "تحديث" : "إنشاء ثم إضافة الأسئلة"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded" />)}
              </div>
            </CardContent>
          </Card>
        ) : forms && forms.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النموذج</TableHead>
                    <TableHead className="text-right">عدد الأسئلة</TableHead>
                    <TableHead className="text-right">عدد الردود</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow
                      key={form.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/forms/${form.id}/responses`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{form.title}</p>
                              {form.course_id ? (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <GraduationCap className="h-3 w-3" />
                                  {courses.find((c) => c.id === form.course_id)?.title || "دورة تدريبية محددة"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">عام</Badge>
                              )}
                            </div>
                            {form.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{form.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{form.fields_count} سؤال</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {form.responses_count} رد
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {form.is_active ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            <Eye className="h-3 w-3 ml-1" />
                            مفعّل
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 ml-1" />
                            غير مفعّل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/forms/${form.id}/fields`)}
                            title="إدارة الأسئلة"
                          >
                            <ListChecks className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/forms/${form.id}/responses`)}
                            title="عرض الردود"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(form)} title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا النموذج؟ سيتم حذف كل الردود المرتبطة به.")) {
                                deleteMutation.mutate(form.id);
                              }
                            }}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد نماذج بعد</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإنشاء أول نموذج أو استبيان</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة نموذج
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageFormsPage;
