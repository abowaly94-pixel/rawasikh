import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowRight, Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, ListChecks } from "lucide-react";

interface FieldRow {
  id: string;
  form_id: string;
  label: string;
  field_type: "short_text" | "long_text" | "single_choice" | "multiple_choice" | "rating";
  options: string[];
  rating_max: number;
  is_required: boolean;
  order_index: number;
}

const typeLabels: Record<FieldRow["field_type"], string> = {
  short_text: "نص قصير",
  long_text: "نص طويل",
  single_choice: "اختيار واحد",
  multiple_choice: "اختيار متعدد",
  rating: "تقييم (نجوم/رقم)",
};

const emptyField = {
  label: "",
  field_type: "short_text" as FieldRow["field_type"],
  options: [] as string[],
  rating_max: 5,
  is_required: true,
};

const FormFieldsPage = () => {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldRow | null>(null);
  const [fieldData, setFieldData] = useState(emptyField);
  const [optionInput, setOptionInput] = useState("");

  useEffect(() => {
    if (!loading && userRole !== "admin") {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [loading, userRole, navigate]);

  const { data: form } = useQuery({
    queryKey: ["admin_form", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms" as any).select("*").eq("id", formId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!formId && userRole === "admin",
  });

  const { data: fields, isLoading } = useQuery({
    queryKey: ["admin_form_fields", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_fields" as any)
        .select("*")
        .eq("form_id", formId!)
        .order("order_index");
      if (error) throw error;
      return (data as any[]) as FieldRow[];
    },
    enabled: !!formId && userRole === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof fieldData) => {
      const { error } = await supabase.from("form_fields" as any).insert({
        form_id: formId,
        label: data.label,
        field_type: data.field_type,
        options: data.options,
        rating_max: data.rating_max,
        is_required: data.is_required,
        order_index: fields?.length || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_form_fields", formId] });
      toast.success("تمت إضافة السؤال");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ أثناء إضافة السؤال"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof fieldData }) => {
      const { error } = await supabase
        .from("form_fields" as any)
        .update({
          label: data.label,
          field_type: data.field_type,
          options: data.options,
          rating_max: data.rating_max,
          is_required: data.is_required,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_form_fields", formId] });
      toast.success("تم تحديث السؤال");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ أثناء تحديث السؤال"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_fields" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_form_fields", formId] });
      toast.success("تم حذف السؤال");
    },
    onError: () => toast.error("حدث خطأ أثناء حذف السؤال"),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ a, b }: { a: FieldRow; b: FieldRow }) => {
      await Promise.all([
        supabase.from("form_fields" as any).update({ order_index: b.order_index }).eq("id", a.id),
        supabase.from("form_fields" as any).update({ order_index: a.order_index }).eq("id", b.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_form_fields", formId] }),
  });

  const resetForm = () => {
    setFieldData(emptyField);
    setEditingField(null);
    setOptionInput("");
  };

  const handleEdit = (field: FieldRow) => {
    setEditingField(field);
    setFieldData({
      label: field.label,
      field_type: field.field_type,
      options: field.options || [],
      rating_max: field.rating_max || 5,
      is_required: field.is_required,
    });
    setIsDialogOpen(true);
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setFieldData({ ...fieldData, options: [...fieldData.options, optionInput.trim()] });
    setOptionInput("");
  };

  const removeOption = (idx: number) => {
    setFieldData({ ...fieldData, options: fieldData.options.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldData.label.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }
    if ((fieldData.field_type === "single_choice" || fieldData.field_type === "multiple_choice") && fieldData.options.length < 2) {
      toast.error("أضف خيارين على الأقل");
      return;
    }
    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data: fieldData });
    } else {
      createMutation.mutate(fieldData);
    }
  };

  const isChoiceType = fieldData.field_type === "single_choice" || fieldData.field_type === "multiple_choice";

  const move = (index: number, dir: -1 | 1) => {
    if (!fields) return;
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    moveMutation.mutate({ a: fields[index], b: fields[target] });
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
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/forms")}>
          <ArrowRight className="h-4 w-4" />
          العودة للنماذج
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="h-7 w-7 text-primary" />
              أسئلة نموذج: {form?.title}
            </h1>
            <p className="text-muted-foreground mt-1">أضف وعدّل أسئلة النموذج وحدد نوع كل سؤال</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سؤال
            </Button>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingField ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field-label">نص السؤال *</Label>
                  <Input
                    id="field-label"
                    value={fieldData.label}
                    onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
                    placeholder="مثال: ما مدى رضاك عن الدورة التدريبية؟"
                  />
                </div>

                <div className="space-y-2">
                  <Label>نوع السؤال</Label>
                  <Select
                    value={fieldData.field_type}
                    onValueChange={(v) => setFieldData({ ...fieldData, field_type: v as FieldRow["field_type"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isChoiceType && (
                  <div className="space-y-2">
                    <Label>الخيارات *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        placeholder="اكتب خيار واضغط إضافة"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                      />
                      <Button type="button" variant="outline" onClick={addOption}>إضافة</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {fieldData.options.map((opt, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          {opt}
                          <button type="button" onClick={() => removeOption(idx)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {fieldData.field_type === "rating" && (
                  <div className="space-y-2">
                    <Label htmlFor="rating-max">أعلى قيمة للتقييم</Label>
                    <Input
                      id="rating-max"
                      type="number"
                      min={2}
                      max={10}
                      value={fieldData.rating_max}
                      onChange={(e) => setFieldData({ ...fieldData, rating_max: parseInt(e.target.value) || 5 })}
                    />
                    <p className="text-xs text-muted-foreground">مثال: 5 لتقييم بالنجوم، أو 10 لتقييم رقمي من 1 إلى 10</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    id="field-required"
                    checked={fieldData.is_required}
                    onCheckedChange={(checked) => setFieldData({ ...fieldData, is_required: checked })}
                  />
                  <Label htmlFor="field-required">إجباري</Label>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingField ? "تحديث" : "إضافة"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الأسئلة ({fields?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
            ) : !fields || fields.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد أسئلة بعد. اضغط "إضافة سؤال" للبدء.</p>
            ) : (
              fields.map((field, idx) => (
                <div key={field.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(idx, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={idx === fields.length - 1} onClick={() => move(idx, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{field.label}</p>
                      {field.is_required && <Badge variant="outline" className="text-xs">إجباري</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabels[field.field_type]}
                      {isChoiceOptionsType(field.field_type) && ` — ${field.options?.length || 0} خيار`}
                      {field.field_type === "rating" && ` — من 1 إلى ${field.rating_max}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(field)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("حذف هذا السؤال؟")) deleteMutation.mutate(field.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

function isChoiceOptionsType(t: FieldRow["field_type"]) {
  return t === "single_choice" || t === "multiple_choice";
}

export default FormFieldsPage;
