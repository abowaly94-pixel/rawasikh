import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Home } from "lucide-react";
import rawasikhLogo from "@/assets/rawasikh-logo.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase يضع التوكن في الـ hash ويُنشئ جلسة تلقائياً عبر detectSessionInUrl
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecoverySession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "كلمة مرور ضعيفة", description: "يجب أن تكون 6 أحرف على الأقل.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "غير متطابقتين", description: "كلمتا المرور غير متطابقتين.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم بنجاح", description: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن." });
        await supabase.auth.signOut();
        navigate("/auth");
      }
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err?.message || "تعذر التحديث", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#8592C7" }} dir="rtl">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center">
            <Link to="/" className="flex justify-center mb-2 mx-auto">
              <img src={rawasikhLogo} alt="رواسخ" className="h-20 w-auto" />
            </Link>
            <CardTitle className="text-2xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
            <CardDescription>
              {hasRecoverySession
                ? "أدخل كلمة المرور الجديدة لحسابك."
                : "جارٍ التحقق من رابط إعادة التعيين..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2 justify-end">
                  <Lock className="h-4 w-4" />
                  كلمة المرور الجديدة
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  disabled={!hasRecoverySession}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="flex items-center gap-2 justify-end">
                  <Lock className="h-4 w-4" />
                  تأكيد كلمة المرور
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  dir="ltr"
                  disabled={!hasRecoverySession}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !hasRecoverySession}>
                {isLoading ? "جارٍ الحفظ..." : "تحديث كلمة المرور"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <Home className="h-4 w-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
