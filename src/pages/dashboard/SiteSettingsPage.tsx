import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Image, Loader2, Trash2, Video, Save, FileText, RotateCcw } from "lucide-react";
import arDefaults from "@/i18n/locales/ar.json";
import ContentEditor from "@/components/site-content/ContentEditor";
import { OVERRIDES_KEY, deepMerge, loadAndApplyOverrides } from "@/lib/i18nOverrides";

const toYouTubeEmbed = (url: string): string => {
  if (!url) return url;
  try {
    const trimmed = url.trim();
    if (trimmed.includes("/embed/")) return trimmed;
    let id = "";
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) id = u.pathname.replace("/", "");
    else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) id = u.searchParams.get("v") || "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/shorts/")[1];
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1];
    }
    return id ? `https://www.youtube.com/embed/${id}` : trimmed;
  } catch {
    return url;
  }
};

// Which top-level i18n keys belong to each editable page
const HOME_KEYS = [
  "hero",
  "aboutSection",
  "whyUs",
  "services",
  "testimonials",
  "cta",
];
const ABOUT_KEYS = ["aboutPage"];
const SERVICES_KEYS = ["servicesPage"];

const pickKeys = (src: any, keys: string[]) => {
  const out: any = {};
  keys.forEach((k) => {
    if (src && src[k] !== undefined) out[k] = JSON.parse(JSON.stringify(src[k]));
  });
  return out;
};

const SiteSettingsPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [homeVideoUrl, setHomeVideoUrl] = useState<string>("");
  const [aboutVideoUrl, setAboutVideoUrl] = useState<string>("");
  const [savingHomeVideo, setSavingHomeVideo] = useState(false);
  const [savingAboutVideo, setSavingAboutVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [overrides, setOverrides] = useState<any>({});
  const [savingContent, setSavingContent] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !(userRole === "admin" || hasPermission("site_settings")))) navigate("/dashboard");
  }, [user, userRole, loading, hasPermission, navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["hero_image_url", "home_video_url", "about_video_url", OVERRIDES_KEY]);
      const map = Object.fromEntries((data || []).map((r: any) => [r.setting_key, r.setting_value]));
      setHeroImageUrl(map.hero_image_url || null);
      setHomeVideoUrl(map.home_video_url || "");
      setAboutVideoUrl(map.about_video_url || "");
      try {
        setOverrides(map[OVERRIDES_KEY] ? JSON.parse(map[OVERRIDES_KEY]) : {});
      } catch {
        setOverrides({});
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setFetching(false);
    }
  };

  // Merged content shown in the editor (defaults + saved overrides)
  const mergedContent = useMemo(
    () => deepMerge(JSON.parse(JSON.stringify(arDefaults)), overrides),
    [overrides]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const fileExt = sanitizeExt(file.name, "jpg");
      const fileName = `hero-image-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ setting_key: "hero_image_url", setting_value: publicUrl }, { onConflict: "setting_key" });
      if (upsertError) throw upsertError;
      setHeroImageUrl(publicUrl);
      toast({ title: "تم بنجاح", description: "تم تحديث صورة الصفحة الرئيسية" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: null })
        .eq("setting_key", "hero_image_url");
      if (error) throw error;
      setHeroImageUrl(null);
      toast({ title: "تم بنجاح", description: "تم إزالة الصورة" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const saveVideo = async (key: "home_video_url" | "about_video_url", value: string) => {
    const setSaving = key === "home_video_url" ? setSavingHomeVideo : setSavingAboutVideo;
    setSaving(true);
    try {
      const normalized = value.trim() ? toYouTubeEmbed(value.trim()) : null;
      const { error } = await supabase
        .from("site_settings")
        .upsert({ setting_key: key, setting_value: normalized }, { onConflict: "setting_key" });
      if (error) throw error;
      if (key === "home_video_url") setHomeVideoUrl(normalized || "");
      else setAboutVideoUrl(normalized || "");
      toast({ title: "تم الحفظ", description: "تم تحديث رابط الفيديو" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save content overrides for the keys belonging to one page
  const saveContent = async (
    pageKey: "home" | "about" | "services",
    pageKeys: string[],
    pageContent: any
  ) => {
    setSavingContent(pageKey);
    try {
      const newOverrides = { ...overrides };
      pageKeys.forEach((k) => {
        newOverrides[k] = pageContent[k];
      });
      const json = JSON.stringify(newOverrides);
      const { error } = await supabase
        .from("site_settings")
        .upsert({ setting_key: OVERRIDES_KEY, setting_value: json }, { onConflict: "setting_key" });
      if (error) throw error;
      setOverrides(newOverrides);
      try {
        localStorage.setItem(OVERRIDES_KEY, json);
      } catch {}
      await loadAndApplyOverrides();
      toast({ title: "تم الحفظ", description: "تم تحديث محتوى الصفحة" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSavingContent(null);
    }
  };

  const resetContent = async (pageKey: string, pageKeys: string[]) => {
    if (!confirm("سيتم إعادة المحتوى إلى النصوص الافتراضية. هل أنت متأكد؟")) return;
    setSavingContent(pageKey);
    try {
      const newOverrides = { ...overrides };
      pageKeys.forEach((k) => delete newOverrides[k]);
      const json = JSON.stringify(newOverrides);
      const { error } = await supabase
        .from("site_settings")
        .upsert({ setting_key: OVERRIDES_KEY, setting_value: json }, { onConflict: "setting_key" });
      if (error) throw error;
      setOverrides(newOverrides);
      try {
        localStorage.setItem(OVERRIDES_KEY, json);
      } catch {}
      // Reload page so the i18n bundle is fully reset
      window.location.reload();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setSavingContent(null);
    }
  };

  if (loading || fetching) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
          <p className="text-muted-foreground">
            تعديل كامل لمحتوى الصفحات (الرئيسية / من نحن / خدماتنا)، الصور والفيديوهات.
          </p>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">محتوى الصفحات</TabsTrigger>
            <TabsTrigger value="media">الصور والفيديو</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Tabs defaultValue="home" className="space-y-4">
              <TabsList>
                <TabsTrigger value="home">الصفحة الرئيسية</TabsTrigger>
                <TabsTrigger value="about">من نحن</TabsTrigger>
                <TabsTrigger value="services">خدماتنا</TabsTrigger>
              </TabsList>

              {[
                { key: "home" as const, keys: HOME_KEYS, label: "الصفحة الرئيسية" },
                { key: "about" as const, keys: ABOUT_KEYS, label: "صفحة من نحن" },
                { key: "services" as const, keys: SERVICES_KEYS, label: "صفحة خدماتنا" },
              ].map(({ key, keys, label }) => {
                const pageContent = pickKeys(mergedContent, keys);
                const defaultPageContent = pickKeys(arDefaults, keys);
                return (
                  <TabsContent key={key} value={key}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {label}
                            </CardTitle>
                            <CardDescription>
                              عدّل العناوين، الفقرات، البطاقات، والقوائم. الصور والفيديوهات في تبويب "الصور والفيديو".
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ContentEditor
                          value={pageContent}
                          defaultValue={defaultPageContent}
                          onChange={(v) => {
                            // Update local merged state by merging the page slice back into overrides
                            const newOverrides = { ...overrides };
                            keys.forEach((k) => {
                              if ((v as any)[k] !== undefined) newOverrides[k] = (v as any)[k];
                            });
                            setOverrides(newOverrides);
                          }}
                        />
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            onClick={() => saveContent(key, keys, mergedContent)}
                            disabled={savingContent === key}
                            className="gap-2"
                          >
                            {savingContent === key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            حفظ التغييرات
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => resetContent(key, keys)}
                            disabled={savingContent === key}
                            className="gap-2"
                          >
                            <RotateCcw className="h-4 w-4" /> استعادة الافتراضي
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  صورة الصفحة الرئيسية (Hero)
                </CardTitle>
                <CardDescription>
                  الصورة في القسم الرئيسي. يُفضل صورة بخلفية شفافة (PNG).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                    {heroImageUrl ? (
                      <img src={heroImageUrl} alt="صورة الرئيسية" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">الصورة الافتراضية مستخدمة</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Label htmlFor="hero-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? "جاري الرفع..." : "رفع صورة جديدة"}
                      </div>
                      <Input id="hero-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </Label>
                    {heroImageUrl && (
                      <Button variant="outline" onClick={handleRemove} className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> إزالة الصورة
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" /> فيديو قسم "من نحن" في الصفحة الرئيسية
                </CardTitle>
                <CardDescription>رابط يوتيوب (watch / youtu.be / shorts / embed).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="home-video">رابط الفيديو</Label>
                  <Input
                    id="home-video"
                    dir="ltr"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={homeVideoUrl}
                    onChange={(e) => setHomeVideoUrl(e.target.value)}
                  />
                </div>
                {homeVideoUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden border border-border max-w-2xl">
                    <iframe src={toYouTubeEmbed(homeVideoUrl)} className="w-full h-full" allowFullScreen title="معاينة" />
                  </div>
                )}
                <Button onClick={() => saveVideo("home_video_url", homeVideoUrl)} disabled={savingHomeVideo} className="gap-2">
                  {savingHomeVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" /> فيديو صفحة "من نحن"
                </CardTitle>
                <CardDescription>الفيديو الرئيسي في صفحة من نحن.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="about-video">رابط الفيديو</Label>
                  <Input
                    id="about-video"
                    dir="ltr"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={aboutVideoUrl}
                    onChange={(e) => setAboutVideoUrl(e.target.value)}
                  />
                </div>
                {aboutVideoUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden border border-border max-w-2xl">
                    <iframe src={toYouTubeEmbed(aboutVideoUrl)} className="w-full h-full" allowFullScreen title="معاينة" />
                  </div>
                )}
                <Button onClick={() => saveVideo("about_video_url", aboutVideoUrl)} disabled={savingAboutVideo} className="gap-2">
                  {savingAboutVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SiteSettingsPage;
