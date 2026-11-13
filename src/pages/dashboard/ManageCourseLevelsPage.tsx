import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowRight, GraduationCap, Layers, BookOpen } from "lucide-react";
import MultiCurrencyPriceEditor from "@/components/MultiCurrencyPriceEditor";
import type { PricesMap } from "@/lib/coursePrice";

interface CourseLevel {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  price: number;
  order_index: number;
  min_score: number | null;
  max_score: number | null;
  is_active: boolean;
  prices?: PricesMap | null;
  price_label?: string | null;
}

const ManageCourseLevelsPage = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CourseLevel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    order_index: 0,
    min_score: "" as number | "",
    max_score: "" as number | "",
    is_active: true,
    prices: {} as PricesMap,
    price_label: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, navigate]);

  const { data: course } = useQuery({
    queryKey: ["course-for-levels", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, has_levels")
        .eq("id", courseId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: levels, isLoading } = useQuery({
    queryKey: ["course_levels", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_levels")
        .select("*")
        .eq("course_id", courseId!)
        .order("order_index");
      if (error) throw error;
      return data as CourseLevel[];
    },
    enabled: !!courseId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        course_id: courseId!,
        name: data.name,
        description: data.description || null,
        price: data.price,
        prices: (data.prices ?? {}) as any,
        order_index: data.order_index,
        min_score: data.min_score === "" ? null : Number(data.min_score),
        max_score: data.max_score === "" ? null : Number(data.max_score),
        is_active: data.is_active,
        price_label: data.price_label?.trim() ? data.price_label.trim() : null,
      };
      if (editingLevel) {
        const { error } = await supabase
          .from("course_levels")
          .update(payload)
          .eq("id", editingLevel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_levels").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_levels", courseId] });
      toast.success(editingLevel ? "تم تحديث المستوى" : "تم إضافة المستوى");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_levels", courseId] });
      toast.success("تم حذف المستوى");
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف"),
  });

  const resetForm = () => {
    setEditingLevel(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      order_index: (levels?.length || 0) + 1,
      min_score: "",
      max_score: "",
      is_active: true,
      prices: {},
      price_label: "",
    });
  };

  const handleEdit = (level: CourseLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || "",
      price: Number(level.price),
      order_index: level.order_index,
      min_score: level.min_score ?? "",
      max_score: level.max_score ?? "",
      is_active: level.is_active,
      prices: (level.prices as PricesMap) || {},
      price_label: (level as any).price_label || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المستوى");
      return;
    }
    upsertMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard/courses")} className="mb-2">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للدورات التدريبية
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              مستويات الدورة التدريبية: {course?.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              قم بإضافة المستويات للدورة التدريبية
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/courses/${courseId}/content`)}
            >
              <Layers className="ml-2 h-4 w-4" />
              المحتوى والأقسام
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة مستوى
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLevel ? "تعديل المستوى" : "إضافة مستوى جديد"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم المستوى *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثل: المستوى المبتدئ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      dir="auto"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر الأساسي (ج.م)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      placeholder="0 = مجاني"
                    />
                    <p className="text-xs text-muted-foreground">يستخدم كاحتياطي ولعملية الدفع</p>

                    <Label htmlFor="price_label" className="mt-3 block">
                      نص بديل للسعر (اختياري)
                    </Label>
                    <Input
                      id="price_label"
                      type="text"
                      value={formData.price_label}
                      onChange={(e) => setFormData({ ...formData, price_label: e.target.value })}
                      placeholder='مثال: "150-300 ج.م" أو "حسب المستوى" أو "Contact us"'
                    />
                    <p className="text-xs text-muted-foreground">
                      لو ملأتيه، هيظهر للزائر بدل الرقم. يقبل عربي وإنجليزي وأي رموز.
                    </p>
                  </div>

                  <MultiCurrencyPriceEditor
                    value={formData.prices}
                    basePrice={formData.price}
                    onChange={(prices) => setFormData({ ...formData, prices })}
                  />
                  <div className="border rounded p-3 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">نطاق درجات تحديد المستوى (اختياري)</p>
                    <p className="text-xs text-muted-foreground">
                      لو الدورة التدريبية مرتبطة باختبار تحديد مستوى، حدد نطاق الدرجات اللي يضع الطالب في المستوى ده
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min">الحد الأدنى %</Label>
                        <Input
                          id="min"
                          type="number"
                          min={0}
                          max={100}
                          value={formData.min_score}
                          onChange={(e) =>
                            setFormData({ ...formData, min_score: e.target.value === "" ? "" : Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max">الحد الأعلى %</Label>
                        <Input
                          id="max"
                          type="number"
                          min={0}
                          max={100}
                          value={formData.max_score}
                          onChange={(e) =>
                            setFormData({ ...formData, max_score: e.target.value === "" ? "" : Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="active">المستوى نشط</Label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={upsertMutation.isPending}>
                      {editingLevel ? "تحديث" : "إضافة"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!course?.has_levels && (
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4 text-sm">
              ⚠️ هذه الدورة التدريبية غير مفعل عليها نظام المستويات. ارجع لصفحة الدورات التدريبية وفعّل خاصية "دورة تدريبية متعددة المستويات".
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : levels && levels.length > 0 ? (
          <div className="grid gap-4">
            {levels.map((level) => (
              <Card key={level.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      
                      <h3 className="text-lg font-bold">{level.name}</h3>
                      {!level.is_active && <Badge variant="secondary">معطل</Badge>}
                    </div>
                    {level.description && (
                      <p className="text-sm text-muted-foreground mb-2">{level.description}</p>
                    )}
                    {(level.min_score !== null || level.max_score !== null) && (
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-muted-foreground">
                          نطاق الدرجات: {level.min_score ?? 0}% - {level.max_score ?? 100}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/courses/${courseId}/content?level=${level.id}`)
                      }
                    >
                      <BookOpen className="ml-2 h-4 w-4" />
                      الدروس والاختبارات
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا المستوى؟")) {
                          deleteMutation.mutate(level.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد مستويات بعد</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإضافة المستويات (مبتدئ، متوسط، متقدم...)</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة المستوى الأول
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageCourseLevelsPage;
