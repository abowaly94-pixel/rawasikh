import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFunctionErrorMessage } from "@/lib/functionError";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseBackup, Download, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

interface BackupSummary {
  generated_at: string;
  table_count: number;
  total_rows: number;
  auth_users_count: number;
}

const BackupPage = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [downloading, setDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupSummary | null>(null);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, userRole]);

  const handleBackup = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("db-full-backup");
      if (error) throw new Error(await getFunctionErrorMessage(error, "فشل أخذ النسخة الاحتياطية"));
      if (data?.error) throw new Error(data.error);

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `rawasikh-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setLastBackup({
        generated_at: data.generated_at,
        table_count: data.table_count,
        total_rows: data.total_rows,
        auth_users_count: Array.isArray(data.auth_users) ? data.auth_users.length : 0,
      });

      toast({
        title: "تم تجهيز النسخة الاحتياطية ✅",
        description: `اتحمّل ملف فيه ${data.table_count} جدول و${data.total_rows} صف بيانات`,
      });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حصل خطأ غير متوقع أثناء أخذ النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl space-y-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع للوحة التحكم
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <DatabaseBackup className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">النسخ الاحتياطي لقاعدة البيانات</CardTitle>
                <CardDescription>خد نسخة كاملة من بيانات المنصة يدويًا في أي وقت</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
              <p className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                هيتحمّل ملف JSON واحد فيه كل بيانات المنصة: الطلاب والمعلمين، الدورات التدريبية والدروس، نتائج الاختبارات،
                المدفوعات والاشتراكات، الشهادات، الحضور والغياب، وباقي الجداول — بالإضافة لقائمة كل الحسابات
                (الإيميلات وأرقام الهواتف) من غير كلمات السر (كلمات السر مش متاحة للتصدير أصلاً حتى لمدير النظام).
              </p>
              <p>
                احتفظ بالملف في مكان آمن على جهازك أو على Google Drive / OneDrive. العملية يدوية بالكامل — مفيش
                نسخ تلقائية بتتاخد، وكل ما تضغط الزرار بتاخد نسخة محدّثة لحظة الضغط.
              </p>
            </div>

            <Button onClick={handleBackup} disabled={downloading} size="lg" className="w-full gap-2">
              {downloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري تجهيز النسخة الاحتياطية... ده ممكن ياخد شوية ثواني
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  تحميل نسخة احتياطية كاملة الآن
                </>
              )}
            </Button>

            {lastBackup && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm space-y-1">
                <p className="font-medium text-green-700">آخر نسخة اتاخدت في الجلسة دي:</p>
                <p className="text-muted-foreground">
                  {new Date(lastBackup.generated_at).toLocaleString("ar-EG")} — {lastBackup.table_count} جدول،{" "}
                  {lastBackup.total_rows} صف بيانات، {lastBackup.auth_users_count} حساب
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BackupPage;
