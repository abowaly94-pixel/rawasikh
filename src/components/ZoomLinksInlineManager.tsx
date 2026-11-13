import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings, Plus, Pencil, Trash2, ExternalLink, Calendar, Clock } from "lucide-react";
import { isValidZoomUrl } from "@/lib/zoomUrl";


interface ZoomLink {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
  scheduled_at: string | null;
  duration_minutes: number | null;
  course_id: string | null;
  lesson_id: string | null;
}

interface Props {
  courseId?: string;
  lessonId?: string;
}

const emptyForm = {
  title: "",
  url: "",
  is_active: true,
  scheduled_at: "",
  duration_minutes: "" as string | number,
};

const toLocalInputValue = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const ZoomLinksInlineManager = ({ courseId, lessonId }: Props) => {
  const { user, userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const { toast } = useToast();

  const [links, setLinks] = useState<ZoomLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const scopeFilter = () => {
    if (lessonId) return { column: "lesson_id", value: lessonId };
    if (courseId) return { column: "course_id", value: courseId };
    return null;
  };

  const fetchLinks = async () => {
    const f = scopeFilter();
    if (!f) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("zoom_links" as any)
      .select("*")
      .eq(f.column, f.value)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setLinks((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, courseId, lessonId]);

  if (!isAdmin) return null;

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (l: ZoomLink) => {
    setEditingId(l.id);
    setForm({
      title: l.title,
      url: l.url,
      is_active: l.is_active,
      scheduled_at: toLocalInputValue(l.scheduled_at),
      duration_minutes: l.duration_minutes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ title: "بيانات ناقصة", description: "العنوان والرابط مطلوبين", variant: "destructive" });
      return;
    }
    if (!isValidZoomUrl(form.url.trim())) {
      toast({ title: "رابط غير صالح", description: "الرابط لازم يكون رابط Zoom صحيح (zoom.us/j/...)", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      url: form.url.trim(),
      is_active: form.is_active,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes),
      course_id: courseId ?? null,
      lesson_id: lessonId ?? null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("zoom_links" as any).update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("zoom_links" as any)
        .insert({ ...payload, created_by: user?.id }));
    }
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "تم التعديل" : "تمت الإضافة" });
    setOpen(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الرابط؟")) return;
    const { error } = await supabase.from("zoom_links" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    fetchLinks();
  };

  const toggleActive = async (l: ZoomLink) => {
    const { error } = await supabase
      .from("zoom_links" as any)
      .update({ is_active: !l.is_active })
      .eq("id", l.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    fetchLinks();
  };

  const formatWhen = (l: ZoomLink) => {
    if (!l.scheduled_at) return null;
    const d = new Date(l.scheduled_at);
    return d.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Card className="border-dashed" dir="rtl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-[15px] leading-7">
          <Settings className="h-4 w-4 text-primary" />
          إعدادات روابط Zoom {lessonId ? "لهذا الدرس" : "لهذه الدورة التدريبية"} (أدمن فقط)
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 ml-1" />
          إضافة
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Calendar className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              لا توجد روابط بعد — اضغط «إضافة» لإنشاء رابط جلسة جديد.
            </p>
          </div>
        ) : (
          links.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-background">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{l.title}</span>
                  {l.is_active ? (
                    <Badge variant="default" className="text-xs">مفعّل</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">معطّل</Badge>
                  )}
                </div>
                {formatWhen(l) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatWhen(l)}
                    </span>
                    {l.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {l.duration_minutes} دقيقة
                      </span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{l.url}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" asChild title="فتح">
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Switch checked={l.is_active} onCheckedChange={() => toggleActive(l)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(l)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(l.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل رابط Zoom" : "إضافة رابط Zoom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: جلسة مراجعة"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط *</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://zoom.us/j/..."
                dir="ltr"
              />
              {form.url.trim() && (
                isValidZoomUrl(form.url.trim()) ? (
                  <p className="text-xs text-green-600">✓ رابط Zoom صالح</p>
                ) : (
                  <p className="text-xs text-destructive">رابط غير صالح — لازم يبدأ بـ zoom.us/j/...</p>
                )
              )}

            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>موعد الجلسة (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>المدة (دقيقة)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>مفعّل</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ZoomLinksInlineManager;
