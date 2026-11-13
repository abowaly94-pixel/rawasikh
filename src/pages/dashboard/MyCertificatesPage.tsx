import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Award, Download, Pencil } from "lucide-react";

interface Certificate {
  id: string;
  course_title: string;
  certificate_number: string;
  honorific: string | null;
  issued_at: string;
}

const MyCertificatesPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: certificates, isLoading } = useQuery({
    queryKey: ["my_certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, course_title, certificate_number, honorific, issued_at")
        .eq("student_id", user!.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!user,
  });

  // ===== Edit honorific (title/prefix, e.g. "المهندس", "د.") dialog =====
  const [honorificOpen, setHonorificOpen] = useState(false);
  const [honorificCertId, setHonorificCertId] = useState("");
  const [honorificValue, setHonorificValue] = useState("");
  const [honorificSaving, setHonorificSaving] = useState(false);

  const openHonorificDialog = (cert: Certificate) => {
    setHonorificCertId(cert.id);
    setHonorificValue(cert.honorific || "");
    setHonorificOpen(true);
  };

  const saveHonorific = async () => {
    setHonorificSaving(true);
    const { error } = await supabase.rpc("set_certificate_honorific", {
      p_certificate_id: honorificCertId,
      p_honorific: honorificValue.trim(),
    });
    setHonorificSaving(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "تم الحفظ", description: "تم تحديث اللقب على الشهادة" });
    setHonorificOpen(false);
    queryClient.invalidateQueries({ queryKey: ["my_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["certificate"] });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "المستخدم"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">شهاداتي</h1>
          <p className="text-muted-foreground mt-1">
            الشهادات التي حصلت عليها تلقائياً بعد إتمام الدورات
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : certificates && certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-2">
                      {cert.course_title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {cert.certificate_number}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    تاريخ الإصدار:{" "}
                    {new Date(cert.issued_at).toLocaleDateString("ar-EG")}
                  </p>
                  <button
                    type="button"
                    onClick={() => openHonorificDialog(cert)}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {cert.honorific ? `اللقب على الشهادة: ${cert.honorific}` : "إضافة لقب قبل اسمك (مهندس، د.، ...)"}
                  </button>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to={`/certificate/${cert.id}`}>
                      <Download className="ml-2 h-4 w-4" />
                      عرض وتحميل الشهادة
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Award className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد شهادات بعد
            </h3>
            <p className="text-muted-foreground mb-6">
              أكمل دروس الدورة واجتز اختباراتها لتحصل على شهادتك تلقائياً
            </p>
            <Button asChild>
              <Link to="/dashboard/my-courses">دوراتي التدريبية</Link>
            </Button>
          </Card>
        )}
      </div>

      {/* ===== Edit honorific dialog ===== */}
      <Dialog open={honorificOpen} onOpenChange={setHonorificOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>اللقب على الشهادة</DialogTitle>
            <DialogDescription>
              لو حابب يظهر لقبك قبل اسمك على الشهادة (زي: المهندس، الدكتور، الأستاذ...) اكتبه هنا.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>اللقب</Label>
            <Input
              placeholder="مثال: المهندس"
              value={honorificValue}
              onChange={(e) => setHonorificValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              اسيبه فاضي لو مش عايز يظهر أي لقب قبل اسمك.
          </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHonorificOpen(false)}>إلغاء</Button>
            <Button onClick={saveHonorific} disabled={honorificSaving}>
              {honorificSaving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyCertificatesPage;
