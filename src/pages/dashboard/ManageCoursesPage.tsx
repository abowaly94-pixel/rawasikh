import { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Eye, EyeOff, Layers, Upload, X, ImageIcon, GraduationCap, Video, FileText } from "lucide-react";
import MultiCurrencyPriceEditor from "@/components/MultiCurrencyPriceEditor";
import type { PricesMap } from "@/lib/coursePrice";
import CaptionsManager from "@/components/CaptionsManager";

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor_name?: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  captions_url?: string | null;
  price: number;
  is_published: boolean;
  is_featured: boolean;
  category_id: string | null;
  instructor_id: string | null;
  created_at: string;
  has_levels?: boolean;
  requires_level_assessment?: boolean;
  level_assessment_id?: string | null;
  prices?: PricesMap | null;
  price_label?: string | null;
  display_order?: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface TeacherOpt {
  id: string;
  full_name: string;
}

const NONE_INSTRUCTOR = "__none__";

const ManageCoursesPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructor_name: "",
    instructor_id: NONE_INSTRUCTOR,
    thumbnail_url: "",
    preview_video_url: "",
    captions: [] as Array<{ lang: string; label: string; url: string }>,
    price: 0,
    category_id: "",
    is_published: false,
    is_featured: false,
    has_levels: false,
    requires_level_assessment: false,
    level_assessment_id: "",
    prices: {} as PricesMap,
    price_label: "",
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCaptions, setUploadingCaptions] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && !(userRole === "admin" || userRole === "teacher" || hasPermission("courses"))) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [user, loading, userRole, hasPermission, navigate]);

  const { data: courses, isLoading } = useQuery({
    // Scoped by role: a teacher only ever gets their OWN courses back, so
    // this must be part of the cache key.
    queryKey: ["admin_courses", userRole, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      // Teachers manage only the courses linked to their own account. Without
      // this filter, the public "Anyone can view published courses" policy
      // (required for the storefront) would let this query return every
      // course on the platform, not just the teacher's own.
      if (userRole === "teacher") {
        query = query.eq("instructor_id", user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user && (userRole === "admin" || userRole === "teacher" || hasPermission("courses")),
  });

  // Every account with the "teacher" role — this is what the "Linked teacher
  // account" dropdown below is built from, so a course can be assigned to
  // any current OR future teacher without ever touching this code again.
  const { data: teacherAccounts = [] } = useQuery({
    queryKey: ["courses_teacher_accounts"],
    queryFn: async () => {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (roleError) throw roleError;
      const ids = [...new Set((roleRows || []).map((r: any) => r.user_id))];
      if (ids.length === 0) return [] as TeacherOpt[];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
        .order("full_name");
      if (profilesError) throw profilesError;
      return (profilesData || []) as TeacherOpt[];
    },
    enabled: userRole === "admin" || hasPermission("courses"),
  });

  const { data: categories } = useQuery({
    queryKey: ["course_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: levelAssessments } = useQuery({
    queryKey: ["level_assessments_for_courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_level_assessments")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: courseData, error } = await supabase.from("courses").insert({
        title: data.title,
        description: data.description || null,
        instructor_name: data.instructor_name?.trim() || null,
        thumbnail_url: data.thumbnail_url || null,
        preview_video_url: data.preview_video_url || null,
        captions: data.captions as any,
        price: data.price,
        prices: (data.prices ?? {}) as any,
        price_label: data.price_label?.trim() ? data.price_label.trim() : null,
        category_id: data.category_id || null,
        is_published: data.is_published,
        is_featured: data.is_featured,
        has_levels: data.has_levels,
        requires_level_assessment: data.requires_level_assessment,
        level_assessment_id: data.level_assessment_id || null,
        instructor_id: data.instructor_id !== NONE_INSTRUCTOR ? data.instructor_id : user?.id,
      }).select().single();
      if (error) throw error;
      return courseData;
    },
    onSuccess: (courseData) => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      toast.success("تم إنشاء الدورة التدريبية بنجاح");
      resetForm();
      setIsDialogOpen(false);
      // If course has levels, go to manage levels page first
      if ((courseData as any).has_levels) {
        navigate(`/dashboard/courses/${courseData.id}/levels`);
      } else {
        navigate(`/dashboard/courses/${courseData.id}/content`);
      }
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إنشاء الدورة التدريبية");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: data.title,
          description: data.description || null,
          instructor_name: data.instructor_name?.trim() || null,
          thumbnail_url: data.thumbnail_url || null,
          preview_video_url: data.preview_video_url || null,
          captions: data.captions as any,
          price: data.price,
          prices: (data.prices ?? {}) as any,
          price_label: data.price_label?.trim() ? data.price_label.trim() : null,
          category_id: data.category_id || null,
          is_published: data.is_published,
          is_featured: data.is_featured,
          has_levels: data.has_levels,
          requires_level_assessment: data.requires_level_assessment,
          level_assessment_id: data.level_assessment_id || null,
          instructor_id: data.instructor_id !== NONE_INSTRUCTOR ? data.instructor_id : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      toast.success("تم تحديث الدورة التدريبية بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الدورة التدريبية");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      toast.success("تم حذف الدورة التدريبية بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف الدورة التدريبية");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, display_order }: { id: string; display_order: number }) => {
      const { error } = await supabase
        .from("courses")
        .update({ display_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("تم تحديث الترتيب");
    },
    onError: () => {
      toast.error("تعذّر حفظ الترتيب");
    },
  });

  // Courses per row setting
  const { data: perRowSetting } = useQuery({
    queryKey: ["site_setting", "courses_per_row"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "courses_per_row")
        .maybeSingle();
      return (data?.setting_value as string) || "3";
    },
  });
  const [perRow, setPerRow] = useState<string>("3");
  useEffect(() => { if (perRowSetting) setPerRow(perRowSetting); }, [perRowSetting]);

  const savePerRow = async (value: string) => {
    setPerRow(value);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ setting_key: "courses_per_row", setting_value: value }, { onConflict: "setting_key" });
    if (error) {
      toast.error("تعذّر حفظ عدد الأعمدة");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site_setting", "courses_per_row"] });
    toast.success("تم حفظ عدد الأعمدة");
  };


  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      instructor_name: "",
      instructor_id: NONE_INSTRUCTOR,
      thumbnail_url: "",
      preview_video_url: "",
      captions: [],
      price: 0,
      category_id: "",
      is_published: false,
      is_featured: false,
      has_levels: false,
      requires_level_assessment: false,
      level_assessment_id: "",
      prices: {},
      price_label: "",
    });
    setEditingCourse(null);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const { safeUploadName } = await import("@/lib/sanitizeUpload");
      const fileName = safeUploadName(file.name, "jpg");
      const { data, error } = await supabase.storage
        .from("lesson-thumbnails")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lesson-thumbnails")
        .getPublicUrl(data.path);

      setFormData({ ...formData, thumbnail_url: urlData.publicUrl });
      toast.success("تم رفع الصورة بنجاح");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  const removeThumbnail = () => {
    setFormData({ ...formData, thumbnail_url: "" });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("يرجى اختيار ملف فيديو");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("حجم الفيديو يجب أن يكون أقل من 50 ميجابايت");
      return;
    }

    setUploadingVideo(true);
    try {
      const fileName = `course-videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: false, contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(data.path);

      setFormData({ ...formData, preview_video_url: urlData.publicUrl });
      toast.success("تم رفع الفيديو بنجاح");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("حدث خطأ أثناء رفع الفيديو");
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };

  const removeVideo = () => {
    setFormData({ ...formData, preview_video_url: "" });
  };







  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      instructor_name: course.instructor_name || "",
      instructor_id: course.instructor_id || NONE_INSTRUCTOR,
      thumbnail_url: course.thumbnail_url || "",
      preview_video_url: (course as any).preview_video_url || "",
      captions: ((course as any).captions as any) || [],
      price: course.price,
      category_id: course.category_id || "",
      is_published: course.is_published,
      is_featured: course.is_featured,
      has_levels: !!course.has_levels,
      requires_level_assessment: !!course.requires_level_assessment,
      level_assessment_id: course.level_assessment_id || "",
      prices: (course.prices as PricesMap) || {},
      price_label: (course as any).price_label || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان الدورة التدريبية");
      return;
    }
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: formData });
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الدورات التدريبية</h1>
            <p className="text-muted-foreground mt-1">إنشاء وتعديل وترتيب الدورات التدريبية</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">عدد الدورات التدريبية في الصف:</Label>
            <Select value={perRow} onValueChange={savePerRow}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة دورة تدريبية
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "تعديل الدورة التدريبية" : "إضافة دورة تدريبية جديدة"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الدورة التدريبية *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="أدخل عنوان الدورة التدريبية"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructor_name">اسم الدكتور / المدرس (نص يظهر للطلاب)</Label>
                  <Input
                    id="instructor_name"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    placeholder="مثال: د. أحمد محمد"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحساب المرتبط بالدورة التدريبية (صلاحيات المدرّس)</Label>
                  <SearchableSelect
                    value={formData.instructor_id}
                    onValueChange={(v) => setFormData({ ...formData, instructor_id: v })}
                    options={[
                      { value: NONE_INSTRUCTOR, label: "بدون ربط (أنا كأدمن)" },
                      ...teacherAccounts.map((t) => ({ value: t.id, label: t.full_name })),
                    ]}
                    placeholder="اختر حساب المدرّس"
                    searchPlaceholder="ابحث عن مدرّس..."
                    emptyText="لا يوجد حسابات مدرّسين مطابقة"
                  />
                  <p className="text-xs text-muted-foreground">
                    ده اللي بيحدد فعليًا مين يقدر يشوف تسليمات الطلاب والحضور والاختبارات الخاصة بهذه الدورة التدريبية من حساب المدرّس —
                    منفصل عن الاسم النصي اللي فوق. لو مش مربوط بحساب مدرّس صح، المدرّس مش هيقدر يشوف بيانات دورته التدريبية.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف الدورة التدريبية</Label>
                  <Textarea
                    id="description"
                    dir="auto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="أدخل وصف الدورة التدريبية"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الصورة المصغرة</Label>
                  {formData.thumbnail_url ? (
                    <div className="relative">
                      <img
                        src={formData.thumbnail_url}
                        alt="صورة الدورة التدريبية"
                        className="w-full aspect-video object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2 h-8 w-8"
                        onClick={removeThumbnail}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={thumbnailInputRef}
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={uploadingThumbnail}
                        className="w-full h-32 border-dashed flex flex-col gap-2"
                      >
                        {uploadingThumbnail ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            <span>جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <span>اضغط لرفع صورة</span>
                            <span className="text-xs text-muted-foreground">PNG, JPG حتى 5MB</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>فيديو معاينة قصير (يظهر كواجهة للدورة التدريبية ويشتغل تلقائيًا)</Label>
                  {formData.preview_video_url ? (
                    <div className="relative">
                      <video
                        src={formData.preview_video_url}
                        className="w-full aspect-video object-cover rounded-lg border bg-black"
                        autoPlay
                        muted
                        loop
                        playsInline
                        controls
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2 h-8 w-8"
                        onClick={removeVideo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/ogg"
                        ref={videoInputRef}
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploadingVideo}
                        className="w-full h-32 border-dashed flex flex-col gap-2"
                      >
                        {uploadingVideo ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            <span>جاري رفع الفيديو...</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-8 w-8 text-muted-foreground" />
                            <span>اضغط لرفع فيديو قصير</span>
                            <span className="text-xs text-muted-foreground">MP4, WebM حتى 50MB — يفضّل 10-30 ثانية</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    لو أضفت فيديو، هيتشغل تلقائيًا (بدون صوت) كواجهة للدورة التدريبية بدل الصورة المصغرة.
                  </p>
                </div>

                <CaptionsManager
                  value={formData.captions}
                  onChange={(next) => setFormData({ ...formData, captions: next })}
                  uploadPath={`course-preview/${editingCourse?.id || "new"}`}
                  disabled={!formData.preview_video_url}
                />
                {!formData.preview_video_url && (
                  <p className="text-xs text-muted-foreground">
                    ارفع الفيديو الأساسي أولاً — الترجمة تعمل فقط مع الفيديوهات المرفوعة مباشرة (ليست روابط Drive/YouTube).
                  </p>
                )}





                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر الأساسي (ج.م)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">يستخدم كاحتياطي ولعملية الدفع</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">التصنيف</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_label">نص بديل للسعر (اختياري)</Label>
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

                {/* Levels system */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="has_levels" className="text-base font-semibold">
                        دورة تدريبية متعددة المستويات
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        فعّل لو الدورة التدريبية مقسمة إلى مستويات (مبتدئ، متوسط، متقدم...) كل مستوى بسعر مختلف
                      </p>
                    </div>
                    <Switch
                      id="has_levels"
                      checked={formData.has_levels}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_levels: checked })}
                    />
                  </div>

                  {formData.has_levels && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="requires_assessment" className="text-base">
                            اختبار تحديد المستوى إجباري
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            لو مفعّل، الطالب لازم يعمل الاختبار قبل الشراء
                          </p>
                        </div>
                        <Switch
                          id="requires_assessment"
                          checked={formData.requires_level_assessment}
                          onCheckedChange={(checked) => setFormData({ ...formData, requires_level_assessment: checked })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assessment_id">اختبار تحديد المستوى المرتبط</Label>
                        <Select
                          value={formData.level_assessment_id || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, level_assessment_id: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر اختبار تحديد المستوى" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون</SelectItem>
                            {levelAssessments?.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label htmlFor="is_published">منشور</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">مميز</Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCourse ? "تحديث" : "إنشاء"}
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
        ) : courses && courses.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-24">الترتيب</TableHead>
                    <TableHead className="text-right">الدورة التدريبية</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow 
                      key={course.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/courses/${course.id}/content`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          defaultValue={course.display_order ?? 0}
                          className="w-20 h-8 text-center"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            if (val !== (course.display_order ?? 0)) {
                              updateOrderMutation.mutate({ id: course.id, display_order: val });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            {course.is_featured && (
                              <Badge variant="secondary" className="text-xs">مميز</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {course.has_levels ? (
                          <Badge
                            variant="outline"
                            className="gap-1 cursor-pointer hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/courses/${course.id}/levels`);
                            }}
                          >
                            <GraduationCap className="h-3 w-3" />
                            عدة مستويات
                          </Badge>
                        ) : course.price === 0 ? (
                          <Badge variant="outline">مجاني</Badge>
                        ) : (
                          `${course.price} ج.م`
                        )}
                      </TableCell>
                      <TableCell>
                        {course.is_published ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            <Eye className="h-3 w-3 ml-1" />
                            منشور
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 ml-1" />
                            مسودة
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(course.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {course.has_levels && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/dashboard/courses/${course.id}/levels`)}
                              title="إدارة المستويات"
                            >
                              <GraduationCap className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/courses/${course.id}/content`)}
                            title="إدارة المحتوى"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          {/* Only show edit/delete for course owner or admin */}
                          {(course.instructor_id === user?.id || userRole === "admin") && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(course)}
                                title="تعديل الدورة التدريبية"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="حذف الدورة التدريبية"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف هذه الدورة التدريبية؟")) {
                                    deleteMutation.mutate(course.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد دورات تدريبية
            </h3>
            <p className="text-muted-foreground mb-6">
              ابدأ بإنشاء أول دورة تدريبية
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة دورة تدريبية
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageCoursesPage;
