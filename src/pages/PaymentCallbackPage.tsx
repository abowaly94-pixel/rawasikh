import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const processedRef = useRef(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const orderId = searchParams.get("order");
    if (processedRef.current) return;
    processedRef.current = true;

    const checkStatus = async () => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Let our webhook process the signed Paymob response callback and update the purchase.
      if (searchParams.get("hmac")) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/paymob-webhook?${searchParams.toString()}`).catch(console.error);
      }

      if (success === "true") {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const { data } = orderId
            ? await supabase
                .from("payment_transactions")
                .select("status, reference_type, reference_id")
                .eq("paymob_order_id", String(orderId))
                .maybeSingle()
            : { data: null };

          if (data?.status === "success") {
            setStatus("success");
            setMessage("تم الدفع بنجاح وتم تفعيل الدورة التدريبية على حسابك.");
            clearCart();
            return;
          }
          await wait(1500);
        }

        setStatus("loading");
        setMessage("تم الدفع بنجاح، جاري تفعيل الدورة التدريبية خلال لحظات...");
        return;
      }
      if (success === "false") {
        setStatus("failed");
        setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.");
        return;
      }

      // Fallback: check DB by paymob_order_id
      if (orderId) {
        const { data } = await supabase
          .from("payment_transactions")
          .select("status")
          .eq("paymob_order_id", String(orderId))
          .maybeSingle();
        if (data?.status === "success") {
          setStatus("success");
          setMessage("تم الدفع بنجاح!");
          clearCart();
        } else if (data?.status === "failed") {
          setStatus("failed");
          setMessage("فشلت عملية الدفع.");
        } else {
          setStatus("loading");
          setMessage("جاري التحقق من حالة الدفع...");
        }
        return;
      }

      setStatus("failed");
      setMessage("لا يمكن تحديد حالة الدفع.");
    };

    checkStatus();
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md mx-auto">
          {status === "loading" && (
            <>
              <Loader2 className="h-20 w-20 text-primary mx-auto animate-spin" />
              <h2 className="text-2xl font-bold text-foreground">جاري التحقق من الدفع...</h2>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">تم الدفع بنجاح!</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/dashboard")}>لوحة التحكم</Button>
                <Button variant="outline" onClick={() => navigate("/store")}>
                  متابعة التسوق
                </Button>
              </div>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-20 w-20 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">فشلت عملية الدفع</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/checkout")}>إعادة المحاولة</Button>
                <Button variant="outline" onClick={() => navigate("/cart")}>
                  العودة للسلة
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCallbackPage;
