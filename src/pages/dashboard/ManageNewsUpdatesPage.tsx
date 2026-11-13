import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Video, Newspaper, PlayCircle, Upload, Loader2, X, Youtube, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const emptyForm = {
  title: "",
  description: "",
  content_type: "news",
  image_url: "",
  video_url: "",
  link_url: "",
  is_active: true,
  is_featured: false,
  order_index: 0,
};

const ManageNewsUpdatesPage = () => {
  const { userRole, profile, user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || !(userRole === "admin" || hasPermission("news_updates")))) {
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, hasPermission, navigate]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const ext = sanitizeExt(file.name, "jpg");
      const path = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast({ title: "تم رفع الصورة" });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const syncYouTube = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-youtube-videos", {
        body: { source: "dashboard" },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "فشلت المزامنة");

      queryClient.invalidateQueries({ queryKey: ["admin-news-updates"] });
      queryClient.invalidateQueries({ queryKey: ["news-updates-public"] });

      toast({
        title: data?.inserted
          ? `تمت إضافة ${data.inserted} فيديو جديد من يوتيوب`
          : "القناة محدّثة بالفعل",
        description: `تم فحص ${data?.fetched ?? 0} فيديو من قناة يوتيوب`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "فشلت مزامنة يوتيوب",
        description: message || "تأكد من نشر دالة sync-youtube-videos",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-news-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_updates")
        .select("*")
        .order("order_index", { ascending: true })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        content_type: values.content_type,
        image_url: values.image_url || null,
        video_url: values.video_url || null,
        link_url: values.link_url || null,
        is_active: values.is_active,
        is_featured: values.is_featured,
        order_index: values.order_index,
      };
      if (values.id) {
        const { error } = await supabase.from("news_updates").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news_updates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-updates"] });
      queryClient.invalidateQueries({ queryKey: ["news-updates-public"] });
      toast({ title: editingItem ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح" });
      closeDialog();
    },
    onError: (e: any) => {
      toast({ title: "حدث خطأ", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-updates"] });
      queryClient.invalidateQueries({ queryKey: ["news-updates-public"] });
      toast({ title: "تم الحذف بنجاح" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("news_updates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-updates"] });
      queryClient.invalidateQueries({ queryKey: ["news-updates-public"] });
    },
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, order_index: items?.length || 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      content_type: item.content_type,
      image_url: item.image_url || "",
      video_url: item.video_url || "",
      link_url: item.link_url || "",
      is_active: item.is_active,
      is_featured: item.is_featured,
      order_index: item.order_index,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
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
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">الأخبار والفيديوهات</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={syncYouTube} disabled={syncing} className="gap-2">
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4 text-red-600" />
              )}
              {syncing ? "جاري المزامنة..." : "مزامنة يوتيوب"}
            </Button>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة جديد
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>إدارة الأخبار والفيديوهات في الصفحة الرئيسية</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                فيديوهات قناة يوتيوب تتزامن تلقائيًا كل 15 دقيقة
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
            ) : !items?.length ? (
              <p className="text-muted-foreground text-center py-8">لا توجد عناصر بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الترتيب</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">مميز</TableHead>
                    <TableHead className="text-right">مفعّل</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.order_index}</TableCell>
                      <TableCell className="max-w-xs truncate font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {item.content_type === "video" ? (
                            <><PlayCircle className="h-3 w-3" /> فيديو</>
                          ) : (
                            <><Newspaper className="h-3 w-3" /> خبر</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.is_featured ? <Badge>مميز</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) => toggleActive.mutate({ id: item.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(item.id);
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
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "تعديل" : "إضافة جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>نوع المحتوى *</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">خبر</SelectItem>
                    <SelectItem value="video">فيديو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>العنوان *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              {form.content_type === "video" && (
                <div className="space-y-2">
                  <Label>رابط الفيديو (يوتيوب) *</Label>
                  <Input
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    dir="ltr"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>الصورة (اختياري)</Label>
                {form.image_url && (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="preview" className="h-24 w-auto rounded border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setForm({ ...form, image_url: "" })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="أو الصق رابط صورة https://..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>رابط خارجي (اختياري - لزر "اعرف المزيد")</Label>
                <Input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
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
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label>مفعّل</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })}
                  />
                  <Label>مميز</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  إلغاء
                </Button>
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

export default ManageNewsUpdatesPage;
