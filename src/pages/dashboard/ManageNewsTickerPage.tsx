import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ManageNewsTickerPage = () => {
  const { userRole, profile, user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || !(userRole === "admin" || hasPermission("news_ticker")))) {
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, hasPermission, navigate]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ text: "", text_en: "", text_fr: "", text_ur: "", link: "", order_index: 0, is_active: true });

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-news-ticker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_ticker")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        text: values.text,
        text_en: values.text_en || null,
        text_fr: values.text_fr || null,
        text_ur: values.text_ur || null,
        link: values.link || null,
        order_index: values.order_index,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("news_ticker").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news_ticker").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-ticker"] });
      queryClient.invalidateQueries({ queryKey: ["news-ticker"] });
      toast({ title: editingItem ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_ticker").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-ticker"] });
      queryClient.invalidateQueries({ queryKey: ["news-ticker"] });
      toast({ title: "تم الحذف بنجاح" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("news_ticker").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-ticker"] });
      queryClient.invalidateQueries({ queryKey: ["news-ticker"] });
    },
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ text: "", text_en: "", text_fr: "", text_ur: "", link: "", order_index: (items?.length || 0), is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      text: item.text,
      text_en: item.text_en || "",
      text_fr: item.text_fr || "",
      text_ur: item.text_ur || "",
      link: item.link || "",
      order_index: item.order_index,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm({ text: "", text_en: "", text_fr: "", text_ur: "", link: "", order_index: 0, is_active: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, id: editingItem?.id });
  };

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">الشريط الإخباري</h1>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة خبر
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إدارة الأخبار</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
            ) : !items?.length ? (
              <p className="text-muted-foreground text-center py-8">لا توجد أخبار بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الترتيب</TableHead>
                    <TableHead className="text-right">النص</TableHead>
                    <TableHead className="text-right">الرابط</TableHead>
                    <TableHead className="text-right">مفعّل</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.order_index}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.text}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.link ? (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            {item.link}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "تعديل الخبر" : "إضافة خبر جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>نص الخبر *</Label>
                <Input
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="أدخل نص الخبر..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالإنجليزية (اختياري)</Label>
                <Input
                  value={form.text_en}
                  onChange={(e) => setForm({ ...form, text_en: e.target.value })}
                  placeholder="English text..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالفرنسية (اختياري)</Label>
                <Input
                  value={form.text_fr}
                  onChange={(e) => setForm({ ...form, text_fr: e.target.value })}
                  placeholder="Texte en français..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالأوردو (اختياري)</Label>
                <Input
                  value={form.text_ur}
                  onChange={(e) => setForm({ ...form, text_ur: e.target.value })}
                  placeholder="اردو متن..."
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>الرابط (اختياري)</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>مفعّل</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageNewsTickerPage;
