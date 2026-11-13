import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Clock, ImagePlus, X, Link } from "lucide-react";
import { z } from "zod";

interface Lesson {
  id: string;
  class_id: string;
  teacher_id: string | null;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  thumbnail_url: string | null;
  meeting_link: string | null;
  class_name?: string;
  teacher_name?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  full_name: string;
}

const daysOfWeek = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

const lessonSchema = z.object({
  class_id: z.string().uuid("يرجى اختيار الفصل"),
  teacher_id: z.string().uuid().optional().nullable(),
  subject: z.string().min(1, "اسم المادة مطلوب").max(100),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, "وقت البداية مطلوب"),
  end_time: z.string().min(1, "وقت النهاية مطلوب"),
  thumbnail_url: z.string().optional().nullable(),
  meeting_link: z.string().url("يرجى إدخال رابط صحيح").optional().nullable().or(z.literal("")),
});

const SchedulePage = () => {
  const { userRole, profile, user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [formData, setFormData] = useState({
    class_id: "",
    teacher_id: "",
    subject: "",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "08:45",
    thumbnail_url: "",
    meeting_link: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLessons();
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;

      // Fetch related data
      const classIds = [...new Set((data || []).map(l => l.class_id))];
      const teacherIds = [...new Set((data || []).filter(l => l.teacher_id).map(l => l.teacher_id))];

      const [classesRes, teachersRes] = await Promise.all([
        classIds.length > 0 
          ? supabase.from("classes").select("id, name").in("id", classIds)
          : { data: [] },
        teacherIds.length > 0 
          ? supabase.from("profiles").select("id, full_name").in("id", teacherIds)
          : { data: [] },
      ]);

      const lessonsWithDetails = (data || []).map(lesson => ({
        ...lesson,
        class_name: classesRes.data?.find(c => c.id === lesson.class_id)?.name || "-",
        teacher_name: teachersRes.data?.find(t => t.id === lesson.teacher_id)?.full_name || "-",
      }));

      setLessons(lessonsWithDetails);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الجدول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("id, name");
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", roles.map(r => r.user_id));
        setTeachers(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
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
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('lesson-thumbnails')
      .upload(fileName, thumbnailFile);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('lesson-thumbnails')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      
      // For teachers, automatically assign themselves as the teacher
      const teacherId = userRole === "teacher" ? user?.id : (formData.teacher_id || null);

      // Upload thumbnail if exists
      const thumbnailUrl = await uploadThumbnail();

      const validated = lessonSchema.parse({
        ...formData,
        teacher_id: teacherId,
        thumbnail_url: thumbnailUrl,
      });

      if (editingLesson) {
        const { error } = await supabase
          .from("lessons")
          .update({
            class_id: validated.class_id,
            teacher_id: validated.teacher_id,
            subject: validated.subject,
            day_of_week: validated.day_of_week,
            start_time: validated.start_time,
            end_time: validated.end_time,
            thumbnail_url: validated.thumbnail_url,
            meeting_link: validated.meeting_link || null,
          })
          .eq("id", editingLesson.id);

        if (error) throw error;
        toast({ title: "تم التحديث", description: "تم تحديث الحصة بنجاح" });
      } else {
        const { error } = await supabase
          .from("lessons")
          .insert({
            class_id: validated.class_id,
            teacher_id: validated.teacher_id,
            subject: validated.subject,
            day_of_week: validated.day_of_week,
            start_time: validated.start_time,
            end_time: validated.end_time,
            thumbnail_url: validated.thumbnail_url,
            meeting_link: validated.meeting_link || null,
          });

        if (error) throw error;
        toast({ title: "تم الإضافة", description: "تم إضافة الحصة بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLessons();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving lesson:", error);
        toast({
          title: "خطأ",
          description: "فشل في حفظ الحصة",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;

    try {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;

      setLessons((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف الحصة بنجاح" });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الحصة",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      class_id: lesson.class_id,
      teacher_id: lesson.teacher_id || "",
      subject: lesson.subject,
      day_of_week: lesson.day_of_week,
      start_time: lesson.start_time.slice(0, 5),
      end_time: lesson.end_time.slice(0, 5),
      thumbnail_url: lesson.thumbnail_url || "",
      meeting_link: lesson.meeting_link || "",
    });
    setThumbnailPreview(lesson.thumbnail_url || null);
    setThumbnailFile(null);
    setIsDialogOpen(true);
  };

  const openAddDialog = (day: number) => {
    resetForm();
    setFormData(prev => ({ ...prev, day_of_week: day }));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLesson(null);
    setFormData({
      class_id: "",
      teacher_id: "",
      subject: "",
      day_of_week: selectedDay,
      start_time: "08:00",
      end_time: "08:45",
      thumbnail_url: "",
      meeting_link: "",
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const getLessonsForDay = (day: number) => {
    return lessons.filter(l => l.day_of_week === day).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const canManage = userRole === "admin" || userRole === "teacher";

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">الجدول الدراسي</h1>
            <p className="text-muted-foreground">عرض وإدارة الحصص الدراسية</p>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة حصة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLesson ? "تعديل الحصة" : "إضافة حصة جديدة"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اليوم *</Label>
                      <Select
                        value={formData.day_of_week.toString()}
                        onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الفصل *</Label>
                      <Select
                        value={formData.class_id}
                        onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>المادة *</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="مثال: الرياضيات"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>وقت البداية *</Label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>وقت النهاية *</Label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Only show teacher selection for admins */}
                    {userRole === "admin" ? (
                      <div className="space-y-2">
                        <Label>المدرس</Label>
                        <Select
                          value={formData.teacher_id || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, teacher_id: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="اختر المدرس" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="none">بدون مدرس</SelectItem>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                  {/* Meeting Link */}
                  <div className="space-y-2">
                    <Label>لينك الميتنج</Label>
                    <div className="relative">
                      <Link className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.meeting_link}
                        onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                        placeholder="https://meet.google.com/..."
                        className="pr-10"
                        dir="ltr"
                      />
                    </div>
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSubmit} disabled={uploading}>
                    {uploading ? "جاري الرفع..." : editingLesson ? "تحديث" : "إضافة"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {daysOfWeek.slice(0, 6).map((day) => (
            <Button
              key={day.value}
              variant={selectedDay === day.value ? "default" : "outline"}
              onClick={() => setSelectedDay(day.value)}
              className="min-w-[80px]"
            >
              {day.label}
            </Button>
          ))}
        </div>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {daysOfWeek.find(d => d.value === selectedDay)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : getLessonsForDay(selectedDay).length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حصص في هذا اليوم</p>
                {canManage && (
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => openAddDialog(selectedDay)}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة حصة
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {getLessonsForDay(selectedDay).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {lesson.thumbnail_url && (
                        <img 
                          src={lesson.thumbnail_url} 
                          alt={lesson.subject}
                          className="w-16 h-12 object-cover rounded-md"
                        />
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
                        <Clock className="h-4 w-4" />
                        <span dir="ltr">
                          {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{lesson.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline">{lesson.class_name}</Badge>
                          {lesson.teacher_name !== "-" && (
                            <span>• {lesson.teacher_name}</span>
                          )}
                          {lesson.meeting_link && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary p-0 h-auto"
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Record teacher attendance when joining
                                if (userRole === "teacher" && lesson.teacher_id === user?.id) {
                                  try {
                                    const today = new Date().toISOString().split('T')[0];
                                    // Check if attendance already recorded
                                    const { data: existing } = await supabase
                                      .from("teacher_attendance")
                                      .select("id")
                                      .eq("teacher_id", user.id)
                                      .eq("lesson_id", lesson.id)
                                      .eq("date", today)
                                      .maybeSingle();
                                    
                                    if (!existing) {
                                      const { error } = await supabase
                                        .from("teacher_attendance")
                                        .insert({
                                          teacher_id: user.id,
                                          lesson_id: lesson.id,
                                          date: today,
                                          status: "present",
                                          attendance_type: "scheduled_lesson",
                                          joined_at: new Date().toISOString(),
                                        });
                                      
                                      if (!error) {
                                        toast({
                                          title: "تم التسجيل",
                                          description: "تم تسجيل حضورك بنجاح!",
                                        });
                                      }
                                    }
                                  } catch (error) {
                                    console.error("Error recording teacher attendance:", error);
                                  }
                                }
                                window.open(lesson.meeting_link, "_blank");
                              }}
                            >
                              <Link className="h-3 w-3 ml-1" />
                              رابط الحصة
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lesson)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الأسبوع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {daysOfWeek.slice(0, 6).map((day) => {
                const dayLessons = getLessonsForDay(day.value);
                return (
                  <div
                    key={day.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDay === day.value ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedDay(day.value)}
                  >
                    <div className="font-medium text-sm">{day.label}</div>
                    <div className="text-2xl font-bold mt-1">{dayLessons.length}</div>
                    <div className="text-xs text-muted-foreground">حصة</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SchedulePage;
