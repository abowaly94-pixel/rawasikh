import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Shield, ExternalLink, GraduationCap, Briefcase } from "lucide-react";
import arDefaults from "@/i18n/locales/ar.json";
import ContentEditor from "@/components/site-content/ContentEditor";
import { OVERRIDES_KEY, deepMerge, loadAndApplyOverrides } from "@/lib/i18nOverrides";

type Audience = "student" | "teacher";

const KEY_BY_AUDIENCE: Record<Audience, string> = {
  student: "policiesPage",
  teacher: "policiesPageTeacher",
};

const pickKeys = (src: any, keys: string[]) => {
  const out: any = {};
  keys.forEach((k) => {
    if (src && src[k] !== undefined) out[k] = JSON.parse(JSON.stringify(src[k]));
  });
  return out;
};

const ManagePoliciesPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState<any>({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audience, setAudience] = useState<Audience>("student");

  const activeKey = KEY_BY_AUDIENCE[audience];
  const POLICIES_KEYS = useMemo(() => [activeKey], [activeKey]);

  useEffect(() => {
    if (!loading && (!user || !(userRole === "admin" || hasPermission("policies")))) navigate("/dashboard");
  }, [user, userRole, loading, hasPermission, navigate]);

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", OVERRIDES_KEY)
        .maybeSingle();
      try {
        setOverrides(data?.setting_value ? JSON.parse(data.setting_value) : {});
      } catch {
        setOverrides({});
      }
    } catch (error) {
      console.error("Error fetching policies content:", error);
    } finally {
      setFetching(false);
    }
  };

  // Merged content shown in the editor (defaults + saved overrides)
  const mergedContent = useMemo(
    () => deepMerge(JSON.parse(JSON.stringify(arDefaults)), overrides),
    [overrides]
  );

  const pageContent = pickKeys(mergedContent, POLICIES_KEYS);
  const defaultPageContent = pickKeys(arDefaults, POLICIES_KEYS);

  const handleChange = (v: any) => {
    const newOverrides = { ...overrides };
    POLICIES_KEYS.forEach((k) => {
      if (v[k] !== undefined) newOverrides[k] = v[k];
    });
    setOverrides(newOverrides);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newOverrides = { ...overrides };
      POLICIES_KEYS.forEach((k) => {
        newOverrides[k] = mergedContent[k];
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
      toast({
        title: "تم الحفظ",
        description:
          audience === "teacher"
            ? "تم تحديث محتوى سياسات المحاضرين"
            : "تم تحديث محتوى سياسات الطلاب",
      });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const label = audience === "teacher" ? "سياسات المحاضرين" : "سياسات الطلاب";
    if (!confirm(`سيتم إعادة محتوى ${label} إلى النصوص الافتراضية. هل أنت متأكدة؟`)) return;
    setSaving(true);
    try {
      const newOverrides = { ...overrides };
      POLICIES_KEYS.forEach((k) => delete newOverrides[k]);
      const json = JSON.stringify(newOverrides);
      const { error } = await supabase
        .from("site_settings")
        .upsert({ setting_key: OVERRIDES_KEY, setting_value: json }, { onConflict: "setting_key" });
      if (error) throw error;
      setOverrides(newOverrides);
      try {
        localStorage.setItem(OVERRIDES_KEY, json);
      } catch {}
      window.location.reload();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setSaving(false);
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              السياسات
            </h1>
            <p className="text-muted-foreground">
              عدّل محتوى سياسات الطلاب وسياسات المحاضرين (الخصوصية، الشروط والأحكام، الدفع/الأجور، إخلاء المسؤولية، الملكية الفكرية) بشكل منفصل في أي وقت.
            </p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <a href="/policies" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              معاينة الصفحة
            </a>
          </Button>
        </div>

        <Tabs value={audience} onValueChange={(v) => setAudience(v as Audience)}>
          <TabsList>
            <TabsTrigger value="student" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              سياسات الطلاب
            </TabsTrigger>
            <TabsTrigger value="teacher" className="gap-2">
              <Briefcase className="h-4 w-4" />
              سياسات المحاضرين
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>
              {audience === "teacher" ? "محتوى سياسات المحاضرين" : "محتوى سياسات الطلاب"}
            </CardTitle>
            <CardDescription>
              يمكنك إضافة أو حذف بنود من أي قسم، وتعديل العناوين والفقرات كما تشائين. لكل من الطلاب والمحاضرين محتوى مستقل تماماً.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContentEditor
              key={activeKey}
              value={pageContent}
              defaultValue={defaultPageContent}
              onChange={handleChange}
            />
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ التغييرات
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
                <RotateCcw className="h-4 w-4" /> استعادة الافتراضي
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagePoliciesPage;
