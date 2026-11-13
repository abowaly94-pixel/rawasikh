import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  description: string | null;
  show_in_menu: boolean;
  created_at: string;
}

const ManageCategoriesPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    show_in_menu: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && !(userRole === "admin" || hasPermission("categories"))) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, navigate]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: userRole === "admin" || hasPermission("categories"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("course_categories").insert({
        name: data.name,
        description: data.description || null,
        show_in_menu: data.show_in_menu,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["course_categories"] });
      queryClient.invalidateQueries({ queryKey: ["header-course-categories"] });
      toast.success("تم إنشاء التصنيف بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إنشاء التصنيف");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("course_categories")
        .update({
          name: data.name,
          description: data.description || null,
          show_in_menu: data.show_in_menu,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["course_categories"] });
      queryClient.invalidateQueries({ queryKey: ["header-course-categories"] });
      toast.success("تم تحديث التصنيف بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث التصنيف");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["course_categories"] });
      queryClient.invalidateQueries({ queryKey: ["header-course-categories"] });
      toast.success("تم حذف التصنيف بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف التصنيف");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      show_in_menu: true,
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      show_in_menu: category.show_in_menu ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم التصنيف");
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
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
            <h1 className="text-3xl font-bold text-foreground">إدارة التصنيفات</h1>
            <p className="text-muted-foreground mt-1">إنشاء وتعديل تصنيفات الدورات التدريبية</p>
          </div>
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة تصنيف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم التصنيف *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: البرمجة والتقنية"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف التصنيف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر للتصنيف"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_in_menu">عرض في قائمة الهيدر</Label>
                    <p className="text-xs text-muted-foreground">
                      إظهار التصنيف داخل القائمة المنسدلة للدورات التدريبية
                    </p>
                  </div>
                  <Switch
                    id="show_in_menu"
                    checked={formData.show_in_menu}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_in_menu: checked })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCategory ? "تحديث" : "إنشاء"}
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
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : categories && categories.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">في القائمة</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={category.show_in_menu ?? true}
                          onCheckedChange={async (checked) => {
                            const { error } = await supabase
                              .from("course_categories")
                              .update({ show_in_menu: checked })
                              .eq("id", category.id);
                            if (error) {
                              toast.error("تعذّر تحديث الحالة");
                            } else {
                              queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
                              queryClient.invalidateQueries({ queryKey: ["header-course-categories"] });
                              toast.success("تم تحديث حالة الظهور");
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(category.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
                                deleteMutation.mutate(category.id);
                              }
                            }}
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
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد تصنيفات
            </h3>
            <p className="text-muted-foreground mb-6">
              ابدأ بإنشاء أول تصنيف للدورات التدريبية
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة تصنيف
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageCategoriesPage;
