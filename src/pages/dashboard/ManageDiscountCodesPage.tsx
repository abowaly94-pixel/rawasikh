import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, TicketPercent, Copy } from "lucide-react";

type DiscountType = "percentage" | "fixed";
type DiscountScope = "all" | "products" | "courses";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  applies_to: DiscountScope;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage" as DiscountType,
  discount_value: 10,
  min_order_amount: 0,
  max_uses: "" as string | number,
  applies_to: "all" as DiscountScope,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

const ManageDiscountCodesPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (userRole === null) return;
    if (!(userRole === "admin" || hasPermission("discount_codes"))) {
      navigate("/dashboard");
      return;
    }
    fetchCodes();
  }, [authLoading, user, userRole, hasPermission]);

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("فشل تحميل الأكواد");
    setCodes((data || []) as DiscountCode[]);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount),
      max_uses: c.max_uses ?? "",
      applies_to: c.applies_to,
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) return toast.error("يرجى إدخال الكود");
    if (form.discount_value <= 0) return toast.error("قيمة الخصم يجب أن تكون أكبر من صفر");
    if (form.discount_type === "percentage" && form.discount_value > 100) {
      return toast.error("النسبة المئوية لا يمكن أن تتجاوز 100%");
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_amount: form.min_order_amount || 0,
      max_uses: form.max_uses === "" || form.max_uses === null ? null : Number(form.max_uses),
      applies_to: form.applies_to,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: form.is_active,
      created_by: user?.id,
    };

    const { error } = editing
      ? await supabase.from("discount_codes").update(payload).eq("id", editing.id)
      : await supabase.from("discount_codes").insert(payload);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "هذا الكود موجود بالفعل" : "حدث خطأ أثناء الحفظ");
      return;
    }
    toast.success(editing ? "تم تحديث الكود" : "تم إنشاء الكود");
    setDialogOpen(false);
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف");
    toast.success("تم حذف الكود");
    fetchCodes();
  };

  const toggleActive = async (c: DiscountCode) => {
    const { error } = await supabase
      .from("discount_codes")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error("فشل التحديث");
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`تم نسخ الكود: ${code}`);
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("ar-EG") : "-");

  const isExpired = (c: DiscountCode) => {
    if (c.valid_until && new Date(c.valid_until) < new Date()) return true;
    if (c.max_uses && c.uses_count >= c.max_uses) return true;
    return false;
  };

  if (authLoading || userRole === null) {
    return <DashboardLayout userRole={userRole} userName={profile?.full_name}><div className="p-6 text-center text-muted-foreground" dir="rtl">جاري التحميل...</div></DashboardLayout>;
  }
  if (!(userRole === "admin" || hasPermission("discount_codes"))) {
    return <DashboardLayout userRole={userRole} userName={profile?.full_name}><div className="p-6 text-center text-muted-foreground" dir="rtl">هذه الصفحة متاحة للأدمن فقط.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout userRole={userRole} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TicketPercent className="h-8 w-8 text-primary" />
              أكواد الخصم
            </h1>
            <p className="text-muted-foreground mt-1">إدارة أكواد الخصم للطلاب والعملاء</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> كود جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل كود الخصم" : "إنشاء كود خصم جديد"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الكود *</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="مثال: SAVE20"
                      className="uppercase font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ينطبق على</Label>
                    <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as DiscountScope })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل شيء</SelectItem>
                        <SelectItem value="products">منتجات المتجر فقط</SelectItem>
                        <SelectItem value="courses">الدورات التدريبية فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="وصف اختياري لكود الخصم"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع الخصم</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as DiscountType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                        <SelectItem value="fixed">قيمة ثابتة (ج.م)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>قيمة الخصم *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الحد الأدنى للطلب (ج.م)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>عدد الاستخدامات القصوى (اتركه فارغ = بلا حد)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.max_uses}
                      onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                      placeholder="غير محدود"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ساري من</Label>
                    <Input
                      type="datetime-local"
                      value={form.valid_from}
                      onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ينتهي في</Label>
                    <Input
                      type="datetime-local"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-3">
                  <Label className="cursor-pointer">مُفعّل</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleSubmit}>{editing ? "حفظ التعديلات" : "إنشاء الكود"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>جميع الأكواد ({codes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : codes.length === 0 ? (
              <div className="text-center py-12">
                <TicketPercent className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد أكواد خصم بعد. أنشئ أول كود!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">الخصم</TableHead>
                      <TableHead className="text-right">النطاق</TableHead>
                      <TableHead className="text-right">الاستخدامات</TableHead>
                      <TableHead className="text-right">ينتهي</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-2"
                          >
                            {c.code} <Copy className="h-3.5 w-3.5 opacity-60" />
                          </button>
                          {c.description && (
                            <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ج.م`}
                          {c.min_order_amount > 0 && (
                            <p className="text-xs text-muted-foreground">أدنى طلب: {c.min_order_amount} ج.م</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {c.applies_to === "all" ? "الكل" : c.applies_to === "products" ? "منتجات" : "دورات تدريبية"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.uses_count} / {c.max_uses ?? "∞"}
                        </TableCell>
                        <TableCell>{formatDate(c.valid_until)}</TableCell>
                        <TableCell>
                          {isExpired(c) ? (
                            <Badge variant="destructive">منتهي</Badge>
                          ) : c.is_active ? (
                            <Badge className="bg-green-500 hover:bg-green-600">مُفعّل</Badge>
                          ) : (
                            <Badge variant="secondary">معطّل</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={c.is_active}
                              onCheckedChange={() => toggleActive(c)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
    </DashboardLayout>
  );
};

export default ManageDiscountCodesPage;
