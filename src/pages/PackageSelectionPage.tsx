import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, Upload, Check, Clock, XCircle, ArrowRight } from "lucide-react";

interface PackageType {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  bank_account_info: string | null;
}

interface PaymentStatus {
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
}

const PackageSelectionPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<PaymentStatus | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else {
        checkUserStatus();
        fetchPackages();
      }
    }
  }, [user, authLoading, navigate]);

  const checkUserStatus = async () => {
    if (!user) return;

    try {
      // Check for active subscription
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gte("ends_at", new Date().toISOString())
        .maybeSingle();

      if (subscription) {
        setHasActiveSubscription(true);
        navigate("/dashboard");
        return;
      }

      // Check for pending submission
      const { data: submission } = await supabase
        .from("payment_submissions")
        .select("status, admin_notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submission) {
        setExistingSubmission({
          status: submission.status as "pending" | "approved" | "rejected",
          admin_notes: submission.admin_notes
        });
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل الباقات");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !screenshotFile || !user) {
      toast.error("يرجى اختيار باقة ورفع صورة التحويل");
      return;
    }

    setSubmitting(true);
    try {
      // Upload screenshot
      const { sanitizeExt } = await import("@/lib/sanitizeUpload");
      const fileExt = sanitizeExt(screenshotFile.name, "jpg");
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(fileName, screenshotFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payment-screenshots")
        .getPublicUrl(fileName);

      // Create payment submission
      const { error: submitError } = await supabase
        .from("payment_submissions")
        .insert({
          user_id: user.id,
          package_id: selectedPackage.id,
          screenshot_url: urlData.publicUrl,
        });

      if (submitError) throw submitError;

      toast.success("تم إرسال طلب التحويل بنجاح! سيتم مراجعته قريباً.");
      setExistingSubmission({ status: "pending", admin_notes: null });
      setSelectedPackage(null);
      setScreenshotFile(null);
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show status if there's an existing submission
  if (existingSubmission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {existingSubmission.status === "pending" && (
              <>
                <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <CardTitle>طلبك قيد المراجعة</CardTitle>
                <CardDescription>
                  تم إرسال طلب التحويل الخاص بك وهو قيد المراجعة من قبل الإدارة.
                  سيتم إشعارك فور الموافقة.
                </CardDescription>
              </>
            )}
            {existingSubmission.status === "approved" && (
              <>
                <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle>تم قبول طلبك!</CardTitle>
                <CardDescription>
                  مبروك! تم تفعيل اشتراكك بنجاح.
                </CardDescription>
                <Button onClick={() => navigate("/dashboard")} className="mt-4">
                  الذهاب للوحة التحكم
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </>
            )}
            {existingSubmission.status === "rejected" && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <CardTitle>تم رفض الطلب</CardTitle>
                <CardDescription>
                  {existingSubmission.admin_notes || "تم رفض طلب التحويل. يرجى المحاولة مرة أخرى."}
                </CardDescription>
                <Button 
                  onClick={() => setExistingSubmission(null)} 
                  className="mt-4"
                >
                  إعادة المحاولة
                </Button>
              </>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Package className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">اختر باقتك</h1>
          <p className="text-muted-foreground mt-2">
            اختر الباقة المناسبة لك وأكمل عملية الدفع
          </p>
        </div>

        {packages.length === 0 ? (
          <Card className="text-center p-8">
            <CardDescription>لا توجد باقات متاحة حالياً</CardDescription>
          </Card>
        ) : (
          <>
            {/* Package Selection */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pkg.name}
                      {selectedPackage?.id === pkg.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </CardTitle>
                    {pkg.description && (
                      <CardDescription>{pkg.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {pkg.price} <span className="text-sm font-normal">ج.م</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.duration_days} يوم
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Section */}
            {selectedPackage && (
              <Card>
                <CardHeader>
                  <CardTitle>إتمام عملية الدفع</CardTitle>
                  <CardDescription>
                    قم بالتحويل للحساب المذكور ثم ارفع صورة إيصال التحويل
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedPackage.bank_account_info && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">معلومات التحويل:</h4>
                      <p className="whitespace-pre-wrap text-sm">
                        {selectedPackage.bank_account_info}
                      </p>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      💳 رقم المحفظة الإلكترونية للتحويل
                    </h4>
                    <div className="flex items-center justify-between gap-2 bg-background rounded-md p-3">
                      <span className="text-lg font-bold tracking-wider" dir="ltr">01068633395</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("01068633395");
                          toast.success("تم نسخ رقم المحفظة");
                        }}
                        className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                      >
                        نسخ
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      حوّل المبلغ على الرقم أعلاه (فودافون كاش / انستاباي) ثم ارفع صورة الإيصال بالأسفل.
                    </p>
                  </div>


                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>المبلغ المطلوب:</span>
                      <span className="text-xl font-bold">{selectedPackage.price} ج.م</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>رفع صورة إيصال التحويل *</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="screenshot-upload"
                      />
                      <label
                        htmlFor="screenshot-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        {screenshotFile ? (
                          <span className="text-primary font-medium">
                            {screenshotFile.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            اضغط لرفع صورة الإيصال
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!screenshotFile || submitting}
                    className="w-full"
                    size="lg"
                  >
                    {submitting ? "جاري الإرسال..." : "إرسال طلب التفعيل"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PackageSelectionPage;
