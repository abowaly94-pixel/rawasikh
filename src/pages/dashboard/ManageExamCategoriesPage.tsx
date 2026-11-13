import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import CategoryIconUpload from "@/components/CategoryIconUpload";

interface ExamCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

const ManageExamCategoriesPage = () => {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExamCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    is_active: true,
    order_index: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && userRole !== "admin") {
      navigate("/dashboard");
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة متاحة للمشرفين فقط",
        variant: "destructive",
      });
    } else {
      fetchCategories();
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("exam_categories")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل التصنيفات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم التصنيف",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("exam_categories")
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon || null,
            is_active: formData.is_active,
            order_index: formData.order_index,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast({ title: "تم تحديث التصنيف بنجاح" });
      } else {
        const { error } = await supabase
          .from("exam_categories")
          .insert({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon || null,
            is_active: formData.is_active,
            order_index: formData.order_index,
          });

        if (error) throw error;
        toast({ title: "تم إنشاء التصنيف بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ التصنيف",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;

    try {
      const { error } = await supabase
        .from("exam_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف التصنيف بنجاح" });
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف التصنيف",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: ExamCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      is_active: category.is_active,
      order_index: category.order_index,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      icon: "",
      is_active: true,
      order_index: categories.length,
    });
  };

  if (authLoading || loading) {
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
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">تصنيفات اختبارات التقييم</h1>
            <p className="text-muted-foreground">إدارة تصنيفات اختبارات تقييم الطلاب</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة تصنيف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم التصنيف *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: اللغة العربية"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر للتصنيف"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>أيقونة التصنيف</Label>
                  <CategoryIconUpload
                    iconUrl={formData.icon || null}
                    onIconChange={(url) => setFormData({ ...formData, icon: url || "" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">ترتيب العرض</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">نشط</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>
                  {editingCategory ? "تحديث" : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              التصنيفات ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد تصنيفات بعد</p>
                <p className="text-sm">ابدأ بإضافة تصنيف جديد</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الترتيب</TableHead>
                    <TableHead>الأيقونة</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.order_index}</TableCell>
                      <TableCell>
                        {category.icon ? (
                          category.icon.startsWith("http") ? (
                            <img src={category.icon} alt="" className="h-8 w-8 rounded object-contain" />
                          ) : (
                            <span className="text-2xl">{category.icon}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id)}
                          >
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
      </div>
    </DashboardLayout>
  );
};

export default ManageExamCategoriesPage;
