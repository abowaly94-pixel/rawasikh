import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Video, Calendar, Clock, Users, ExternalLink, Pencil, Trash2, UserPlus, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface OnlineSession {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  teacher_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  meeting_type: "google_meet" | "zoom" | "other";
  max_students: number;
  price: number;
  is_free: boolean;
  is_active: boolean;
  thumbnail_url: string | null;
  created_at: string;
  teacher?: { full_name: string };
  enrollment_count?: number;
  is_enrolled?: boolean;
}

// Generate time options from 06:00 to 23:30 in 30-minute intervals
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      times.push(`${h}:${m}:00`);
    }
  }
  return times;
};

const OnlineSessionsPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<OnlineSession | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    session_date: "",
    start_time: "",
    end_time: "",
    meeting_link: "",
    meeting_type: "google_meet" as "google_meet" | "zoom" | "other",
    max_students: 30,
    price: 0,
    is_free: true,
    thumbnail_url: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["online_sessions", userRole, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("online_sessions")
        .select("*")
        .eq("is_active", true)
        .order("session_date", { ascending: true });

      // For teachers, show only their sessions
      if (userRole === "teacher") {
        query = query.eq("teacher_id", user?.id);
      }

      const { data: sessionsData, error } = await query;
      if (error) throw error;

      // Get teacher names and enrollment counts
      const enrichedSessions = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Get teacher name
          const { data: teacherData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", session.teacher_id)
            .single();

          // Get enrollment count
          const { count } = await supabase
            .from("session_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id);

          // Check if current user is enrolled
          let isEnrolled = false;
          if (user && userRole !== "teacher" && userRole !== "admin") {
            const { data: enrollmentData } = await supabase
              .from("session_enrollments")
              .select("id")
              .eq("session_id", session.id)
              .eq("user_id", user.id)
              .maybeSingle();
            isEnrolled = !!enrollmentData;
          }

          return {
            ...session,
            teacher: teacherData,
            enrollment_count: count || 0,
            is_enrolled: isEnrolled,
          };
        })
      );

      return enrichedSessions as OnlineSession[];
    },
    enabled: !!user,
  });

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("online_sessions").insert({
        ...data,
        teacher_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online_sessions"] });
      toast.success("تم إنشاء الحصة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إنشاء الحصة");
    },
  });

  // Update session mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("online_sessions")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online_sessions"] });
      toast.success("تم تحديث الحصة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الحصة");
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("online_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online_sessions"] });
      toast.success("تم حذف الحصة بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف الحصة");
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("session_enrollments").insert({
        session_id: sessionId,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online_sessions"] });
      toast.success("تم الاشتراك في الحصة بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الاشتراك");
    },
  });

  // Unenroll mutation
  const unenrollMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("session_enrollments")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online_sessions"] });
      toast.success("تم إلغاء الاشتراك");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إلغاء الاشتراك");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject: "",
      session_date: "",
      start_time: "",
      end_time: "",
      meeting_link: "",
      meeting_type: "google_meet",
      max_students: 30,
      price: 0,
      is_free: true,
      thumbnail_url: "",
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setEditingSession(null);
  };

  const handleEdit = (session: OnlineSession) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || "",
      subject: session.subject,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      meeting_link: session.meeting_link || "",
      meeting_type: session.meeting_type,
      max_students: session.max_students,
      price: session.price,
      is_free: session.is_free,
      thumbnail_url: session.thumbnail_url || "",
    });
    setThumbnailPreview(session.thumbnail_url || null);
    setThumbnailFile(null);
    setIsDialogOpen(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return formData.thumbnail_url || null;
    
    const { sanitizeExt } = await import("@/lib/sanitizeUpload");
    const fileExt = sanitizeExt(thumbnailFile.name, "jpg");
    const fileName = `session-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('lesson-thumbnails')
      .upload(fileName, thumbnailFile);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('lesson-thumbnails')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.session_date) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    setUploading(true);
    try {
      const thumbnailUrl = await uploadThumbnail();
      const dataWithThumbnail = { ...formData, thumbnail_url: thumbnailUrl };
      
      if (editingSession) {
        updateMutation.mutate({ id: editingSession.id, data: dataWithThumbnail });
      } else {
        createMutation.mutate(dataWithThumbnail);
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const canManageSessions = userRole === "admin" || userRole === "teacher";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الحصص الأونلاين</h1>
            <p className="text-muted-foreground mt-1">
              {canManageSessions ? "إدارة جدول الحصص الأونلاين" : "اشترك في الحصص المتاحة"}
            </p>
          </div>
          {canManageSessions && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة حصة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSession ? "تعديل الحصة" : "إضافة حصة جديدة"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">عنوان الحصة *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="مثال: مراجعة الرياضيات"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">المادة *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="مثال: الرياضيات"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">وصف الحصة</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="وصف مختصر للحصة"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session_date">التاريخ *</Label>
                      <Input
                        id="session_date"
                        type="date"
                        value={formData.session_date}
                        onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>وقت البداية *</Label>
                      <Select
                        value={formData.start_time}
                        onValueChange={(value) => setFormData({ ...formData, start_time: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="اختر الوقت">
                            {formData.start_time ? (
                              <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formData.start_time.slice(0, 5)}
                              </span>
                            ) : (
                              "-- : --"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time.slice(0, 5)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>وقت النهاية *</Label>
                      <Select
                        value={formData.end_time}
                        onValueChange={(value) => setFormData({ ...formData, end_time: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="اختر الوقت">
                            {formData.end_time ? (
                              <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formData.end_time.slice(0, 5)}
                              </span>
                            ) : (
                              "-- : --"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time.slice(0, 5)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meeting_type">نوع الاجتماع</Label>
                      <Select
                        value={formData.meeting_type}
                        onValueChange={(value: "google_meet" | "zoom" | "other") => 
                          setFormData({ ...formData, meeting_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google_meet">Google Meet</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting_link">رابط الاجتماع</Label>
                      <Input
                        id="meeting_link"
                        value={formData.meeting_link}
                        onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                        placeholder="https://meet.google.com/..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_students">الحد الأقصى للطلاب</Label>
                      <Input
                        id="max_students"
                        type="number"
                        value={formData.max_students}
                        onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">السعر (ج.م)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        disabled={formData.is_free}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_free"
                      checked={formData.is_free}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked, price: checked ? 0 : formData.price })}
                    />
                    <Label htmlFor="is_free">حصة مجانية</Label>
                  </div>

                  {/* Thumbnail Upload */}
                  <div className="space-y-2">
                    <Label>الصورة المصغرة</Label>
                    <div className="flex items-center gap-4">
                      {thumbnailPreview ? (
                        <div className="relative">
                          <img 
                            src={thumbnailPreview} 
                            alt="معاينة الصورة" 
                            className="w-24 h-16 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                              setFormData(prev => ({ ...prev, thumbnail_url: "" }));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center w-24 h-16 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleThumbnailChange}
                          />
                          <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        </label>
                      )}
                      <span className="text-sm text-muted-foreground">
                        اختر صورة مصغرة للحصة (اختياري)
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
                      {uploading ? "جاري الرفع..." : editingSession ? "تحديث" : "إنشاء"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="space-y-3 pt-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {session.thumbnail_url ? (
                  <div className="relative h-32 overflow-hidden">
                    <img 
                      src={session.thumbnail_url} 
                      alt={session.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      variant={session.is_free ? "secondary" : "default"} 
                      className="absolute top-2 right-2"
                    >
                      {session.is_free ? "مجاني" : `${session.price} ج.م`}
                    </Badge>
                  </div>
                ) : (
                  <CardHeader className="bg-gradient-to-l from-primary/10 to-primary/5 pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant={session.is_free ? "secondary" : "default"} className="mb-2">
                          {session.is_free ? "مجاني" : `${session.price} ج.م`}
                        </Badge>
                      </div>
                      <Video className="h-8 w-8 text-primary/60" />
                    </div>
                  </CardHeader>
                )}
                <CardContent className="pt-4 space-y-3">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {session.description || "لا يوجد وصف"}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(session.session_date), "EEEE، d MMMM yyyy", { locale: ar })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{session.enrollment_count} / {session.max_students} طالب</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline">{session.subject}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {session.teacher?.full_name}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {canManageSessions && session.teacher_id === user?.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(session)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذه الحصة؟")) {
                              deleteMutation.mutate(session.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {session.meeting_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Record teacher attendance when joining
                          if (userRole === "teacher" && session.teacher_id === user?.id) {
                            try {
                              const today = new Date().toISOString().split('T')[0];
                              // Check if attendance already recorded
                              const { data: existing } = await supabase
                                .from("teacher_attendance")
                                .select("id")
                                .eq("teacher_id", user.id)
                                .eq("session_id", session.id)
                                .eq("date", today)
                                .maybeSingle();
                              
                              if (!existing) {
                                const { error } = await supabase
                                  .from("teacher_attendance")
                                  .insert({
                                    teacher_id: user.id,
                                    session_id: session.id,
                                    date: today,
                                    status: "present",
                                    attendance_type: "online_session",
                                    joined_at: new Date().toISOString(),
                                  });
                                
                                if (!error) {
                                  toast.success("تم تسجيل حضورك بنجاح!");
                                }
                              }
                            } catch (error) {
                              console.error("Error recording teacher attendance:", error);
                            }
                          }
                          window.open(session.meeting_link, "_blank");
                        }}
                      >
                        <ExternalLink className="h-4 w-4 ml-1" />
                        انضم
                      </Button>
                    )}

                    {!canManageSessions && (
                      session.is_enrolled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unenrollMutation.mutate(session.id)}
                          disabled={unenrollMutation.isPending}
                        >
                          إلغاء الاشتراك
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => enrollMutation.mutate(session.id)}
                          disabled={enrollMutation.isPending || (session.enrollment_count || 0) >= session.max_students}
                        >
                          <UserPlus className="h-4 w-4 ml-1" />
                          اشترك
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Video className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد حصص متاحة
            </h3>
            <p className="text-muted-foreground mb-6">
              {canManageSessions ? "ابدأ بإنشاء أول حصة أونلاين" : "لا توجد حصص متاحة حالياً"}
            </p>
            {canManageSessions && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة حصة
              </Button>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OnlineSessionsPage;
