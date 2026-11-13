import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowRight, CheckCircle, ImageIcon, ShoppingBag, CreditCard, Smartphone, Tag, X, Upload } from "lucide-react";
import { safeUploadName } from "@/lib/sanitizeUpload";


type AppliedDiscount = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  amount: number;
};

const CheckoutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalItems, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [walletPending, setWalletPending] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);


  const courseItems = useMemo(() => items.filter((i) => i.type === "course"), [items]);

  const { data: latestCoursePrices = {}, isLoading: pricesLoading } = useQuery({
    queryKey: ["checkout-course-prices", courseItems.map((i) => i.id).join("|")],
    queryFn: async () => {
      const courseIds = Array.from(new Set(courseItems.map((item) => item.id.split(":")[0]).filter(Boolean)));
      const levelIds = courseItems
        .map((item) => item.id.split(":")[1])
        .filter((levelId): levelId is string => Boolean(levelId));

      if (courseIds.length === 0) return {} as Record<string, number>;

      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, price")
        .in("id", courseIds);
      if (coursesError) throw coursesError;

      const { data: levels, error: levelsError } = levelIds.length > 0
        ? await supabase.from("course_levels").select("id, course_id, price").in("id", levelIds)
        : { data: [], error: null };
      if (levelsError) throw levelsError;

      const coursePriceById = new Map((courses || []).map((course) => [course.id, Number(course.price || 0)]));
      const levelPriceById = new Map(
        (levels || []).map((level) => [level.id, Number(level.price || 0) || coursePriceById.get(level.course_id) || 0])
      );

      return courseItems.reduce<Record<string, number>>((prices, item) => {
        const [courseId, levelId] = item.id.split(":");
        prices[item.id] = levelId ? levelPriceById.get(levelId) || 0 : coursePriceById.get(courseId) || 0;
        return prices;
      }, {});
    },
    enabled: courseItems.length > 0,
  });

  const pricedItems = items.map((item) => ({
    ...item,
    price: item.type === "course" ? latestCoursePrices[item.id] ?? item.price : item.price,
  }));
  const pricedTotalPrice = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.discount_type === "percentage"
      ? Math.min(pricedTotalPrice, (pricedTotalPrice * appliedDiscount.discount_value) / 100)
      : Math.min(pricedTotalPrice, appliedDiscount.discount_value)
    : 0;
  const finalTotalPrice = Math.max(0, pricedTotalPrice - discountAmount);
  const isFreeOrder = items.length > 0 && !pricesLoading && finalTotalPrice === 0;

  // Auto-remove discount if cart total drops below min_order_amount
  useEffect(() => {
    if (appliedDiscount && pricedTotalPrice === 0) setAppliedDiscount(null);
  }, [pricedTotalPrice, appliedDiscount]);

  const applyDiscountCode = async () => {
    const code = discountCodeInput.trim();
    if (!code) return toast.error("يرجى إدخال كود الخصم");
    setValidatingDiscount(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .ilike("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) return toast.error("كود الخصم غير صحيح");
      if (!data.is_active) return toast.error("كود الخصم غير مفعل");
      if (data.valid_until && new Date(data.valid_until) < new Date()) return toast.error("كود الخصم منتهي الصلاحية");
      if (data.valid_from && new Date(data.valid_from) > new Date()) return toast.error("كود الخصم غير مفعل بعد");
      if (data.max_uses && data.uses_count >= data.max_uses) return toast.error("تم استنفاد كود الخصم");
      if (Number(data.min_order_amount || 0) > pricedTotalPrice) {
        return toast.error(`الحد الأدنى للطلب ${data.min_order_amount} ج.م`);
      }
      const amount =
        data.discount_type === "percentage"
          ? (pricedTotalPrice * Number(data.discount_value)) / 100
          : Number(data.discount_value);
      setAppliedDiscount({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as "percentage" | "fixed",
        discount_value: Number(data.discount_value),
        amount: Math.min(pricedTotalPrice, amount),
      });
      toast.success(`تم تطبيق الخصم: ${data.discount_type === "percentage" ? data.discount_value + "%" : data.discount_value + " ج.م"}`);
    } catch (e: any) {
      toast.error("خطأ في التحقق من الكود: " + (e?.message || ""));
    } finally {
      setValidatingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCodeInput("");
  };

  const autoProcessedRef = useRef(false);

  const getCheckoutErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object") {
      const err = error as { message?: string; error?: string; details?: string; hint?: string };
      return err.message || err.error || err.details || err.hint || "خطأ غير معروف";
    }
    return "خطأ غير معروف";
  };

  const processFreeOrder = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const courseCheckoutItems = pricedItems.filter((i) => i.type === "course");
      const fullCourseItems = courseCheckoutItems.filter((i) => !i.id.includes(":"));
      const levelItems = courseCheckoutItems.filter((i) => i.id.includes(":"));

      if (fullCourseItems.length > 0) {
        const purchases = fullCourseItems.map((item) => ({
          user_id: user.id,
          course_id: item.id,
          amount_paid: 0,
          payment_status: "completed",
          payment_method: "free",
        }));
        const { error } = await supabase.from("course_purchases").insert(purchases);
        if (error && (error as { code?: string }).code !== "23505") throw error;
      }

      if (levelItems.length > 0) {
        const levelPurchases = levelItems.map((item) => {
          const [courseId, levelId] = item.id.split(":");
          return {
            user_id: user.id,
            course_id: courseId,
            level_id: levelId,
            amount_paid: 0,
            payment_status: "completed",
            payment_method: "free",
          };
        });
        const { error } = await supabase.from("course_level_purchases").insert(levelPurchases);
        if (error && (error as { code?: string }).code !== "23505") throw error;
      }

      clearCart();
      setOrderComplete(true);
      toast.success("تم تفعيل الدورة التدريبية بنجاح");
      setTimeout(() => navigate("/dashboard/my-courses"), 800);
    } catch (error: unknown) {
      console.error(error);
      toast.error("حدث خطأ: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      autoProcessedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isFreeOrder && user && !autoProcessedRef.current && !orderComplete) {
      autoProcessedRef.current = true;
      processFreeOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeOrder, user, orderComplete]);

  if (isFreeOrder && !orderComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {user ? "جاري تفعيل اشتراكك المجاني..." : "يرجى تسجيل الدخول لتفعيل الاشتراك المجاني"}
            </p>
            {!user && (
              <Button onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-20 w-20 text-muted-foreground/40 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">السلة فارغة</h2>
            <Button onClick={() => navigate("/store")}>
              <ArrowRight className="h-4 w-4 ml-2" />
              تصفح المتجر
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">تم إرسال طلبك بنجاح!</h2>
            <p className="text-muted-foreground">
              سيتم مراجعة طلبك والتواصل معك قريباً
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/store")}>متابعة التسوق</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>لوحة التحكم</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (walletPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            <Smartphone className="h-20 w-20 text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("checkoutWallet.pendingTitle")}</h2>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-lg text-start">
              <p className="text-sm mb-2">{t("checkoutWallet.pendingInstructions")}</p>
              <div className="flex items-center justify-between gap-2 bg-background rounded-md p-3 mt-2">
                <span className="text-lg font-bold tracking-wider" dir="ltr">01068633395</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("01068633395");
                    toast.success(t("checkoutWallet.copied"));
                  }}
                  className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  {t("checkoutWallet.copy")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{t("checkoutWallet.pendingReview")}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/store")}>متابعة التسوق</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>لوحة التحكم</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      navigate("/auth");
      return;
    }
    const hasProducts = items.some((i) => i.type === "product");
    if (hasProducts && !shippingAddress.trim()) {
      toast.error("يرجى إدخال عنوان الشحن");
      return;
    }
    if (!phone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!email.trim()) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (paymentMethod === "wallet" && finalTotalPrice > 0 && !receiptFile) {
      toast.error("يرجى رفع صورة إيصال التحويل");
      return;
    }

    setSubmitting(true);
    try {
      // Upload receipt first (wallet only)
      let receiptUrl: string | null = null;
      if (paymentMethod === "wallet" && receiptFile) {
        setUploadingReceipt(true);
        const path = `${user.id}/${safeUploadName(receiptFile.name)}`;
        const { error: upErr } = await supabase.storage
          .from("payment-screenshots")
          .upload(path, receiptFile, { upsert: false, contentType: receiptFile.type });
        setUploadingReceipt(false);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("payment-screenshots")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        receiptUrl = signed?.signedUrl || path;
      }

      const productItems = pricedItems.filter((i) => i.type === "product");
      const courseCheckoutItems = pricedItems.filter((i) => i.type === "course");


      // Create local orders first (status = pending)
      let firstReferenceType: string | null = null;
      let firstReferenceId: string | null = null;

      if (productItems.length > 0) {
        const orders = productItems.map((item) => ({
          user_id: user.id,
          product_id: item.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          shipping_address: shippingAddress.trim(),
          phone: phone.trim(),
          notes: notes.trim() || null,
          payment_receipt_url: receiptUrl,
        }));

        const { data: insertedOrders, error } = await supabase
          .from("product_orders")
          .insert(orders)
          .select();
        if (error) throw error;
        if (insertedOrders && insertedOrders.length > 0) {
          firstReferenceType = "product_order";
          firstReferenceId = insertedOrders[0].id;
        }
      }

      if (courseCheckoutItems.length > 0) {
        const fullCourseItems = courseCheckoutItems.filter((i) => !i.id.includes(":"));
        const levelItems = courseCheckoutItems.filter((i) => i.id.includes(":"));

        for (const item of fullCourseItems) {
          const { data: existingPurchase, error: existingError } = await supabase
            .from("course_purchases")
            .select("id, payment_status")
            .eq("user_id", user.id)
            .eq("course_id", item.id)
            .maybeSingle();
          if (existingError) throw existingError;

          if (existingPurchase?.payment_status === "completed") {
            throw new Error("هذه الدورة التدريبية مفعّلة بالفعل على حسابك");
          }

          let purchaseId = existingPurchase?.id;
          if (!purchaseId) {
            const { data: insertedPurchase, error } = await supabase
              .from("course_purchases")
              .insert({
                user_id: user.id,
                course_id: item.id,
                amount_paid: item.price,
                payment_status: "pending",
                payment_method: paymentMethod === "wallet" ? "wallet" : "card",
                payment_receipt_url: receiptUrl,
              })
              .select("id")
              .single();
            if (error) throw error;
            purchaseId = insertedPurchase.id;
          }


          if (!firstReferenceId && purchaseId) {
            firstReferenceType = "course_purchase";
            firstReferenceId = purchaseId;
          }
        }

        for (const item of levelItems) {
          const [courseId, levelId] = item.id.split(":");
          const { data: existingLevel, error: existingLevelError } = await supabase
            .from("course_level_purchases")
            .select("id, payment_status")
            .eq("user_id", user.id)
            .eq("level_id", levelId)
            .maybeSingle();
          if (existingLevelError) throw existingLevelError;

          if (existingLevel?.payment_status === "completed") {
            throw new Error("هذا المستوى مفعّل بالفعل على حسابك");
          }

          let levelPurchaseId = existingLevel?.id;
          if (!levelPurchaseId) {
            const { data: insertedLevel, error } = await supabase
              .from("course_level_purchases")
              .insert({
                user_id: user.id,
                course_id: courseId,
                level_id: levelId,
                amount_paid: item.price,
                payment_status: "pending",
                payment_method: paymentMethod === "wallet" ? "wallet" : "card",
                payment_receipt_url: receiptUrl,
              })
              .select("id")
              .single();
            if (error) throw error;
            levelPurchaseId = insertedLevel.id;
          }


          if (!firstReferenceId && levelPurchaseId) {
            firstReferenceType = "course_level_purchase";
            firstReferenceId = levelPurchaseId;
          }
        }
      }

      // Increment discount usage if applied
      if (appliedDiscount) {
        const { data: current } = await supabase
          .from("discount_codes")
          .select("uses_count")
          .eq("id", appliedDiscount.id)
          .maybeSingle();
        await supabase
          .from("discount_codes")
          .update({ uses_count: (current?.uses_count || 0) + 1 })
          .eq("id", appliedDiscount.id);
      }

      // If total is 0, no need to call Paymob
      if (finalTotalPrice === 0) {
        clearCart();
        setOrderComplete(true);
        return;
      }

      // Wallet payment: manual transfer outside platform — skip Paymob, mark as pending admin review
      if (paymentMethod === "wallet") {
        clearCart();
        setWalletPending(true);
        return;
      }

      // Call paymob-create-payment edge function (Intention API / Unified Checkout)
      const { data, error: fnError } = await supabase.functions.invoke(
        "paymob-create-payment",
        {
          body: {
            amount: finalTotalPrice,
            payment_method: paymentMethod,
            reference_type: firstReferenceType,
            reference_id: firstReferenceId,
            redirection_url: `${window.location.origin}/payment/callback`,
            billing_data: {
              first_name: firstName.trim() || "Customer",
              last_name: lastName.trim() || "Rawasikh",
              email: email.trim(),
              phone_number: phone.trim(),
              street: shippingAddress.trim() || "NA",
              city: "Cairo",
              country: "EG",
            },
            metadata: {
              cart_items: pricedItems.map((i) => ({ id: i.id, name: i.name, qty: i.quantity })),
            },
          },
        }
      );

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "فشل إنشاء عملية الدفع");

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error("لم يتم استلام رابط الدفع");
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error("حدث خطأ: " + getCheckoutErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 shell py-8">
        <Button variant="ghost" onClick={() => navigate("/cart")} className="mb-6">
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للسلة
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">إتمام الطلب</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">بيانات العميل</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الأول</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: أحمد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الاسم الأخير</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثال: محمد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              </div>
            </Card>

            {items.some((i) => i.type === "product") && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">بيانات الشحن</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>عنوان الشحن *</Label>
                    <Textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="أدخل العنوان بالتفصيل (المحافظة، المدينة، الشارع...)"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظات إضافية</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي ملاحظات خاصة بالطلب..."
                    />
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">طريقة الدفع</h3>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "card" | "wallet")}
                className="space-y-3"
              >
                <label
                  htmlFor="pm-card"
                  className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition"
                >
                  <RadioGroupItem value="card" id="pm-card" />
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">بطاقة ائتمان / فيزا / ماستركارد</p>
                    <p className="text-xs text-muted-foreground">دفع آمن عبر Paymob</p>
                  </div>
                </label>
                <label
                  htmlFor="pm-wallet"
                  className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition"
                >
                  <RadioGroupItem value="wallet" id="pm-wallet" />
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">محفظة إلكترونية</p>
                    <p className="text-xs text-muted-foreground">فودافون كاش، اتصالات كاش، أورانج موني</p>
                  </div>
                </label>
              </RadioGroup>
              {paymentMethod === "wallet" && (
                <div className="space-y-3 mt-4">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">💳 {t("checkoutWallet.receiveTitle")}</h4>
                    <div className="flex items-center justify-between gap-2 bg-background rounded-md p-3">
                      <span className="text-lg font-bold tracking-wider" dir="ltr">01068633395</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("01068633395");
                          toast.success(t("checkoutWallet.copied"));
                        }}
                        className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                      >
                        {t("checkoutWallet.copy")}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("checkoutWallet.instructions")}
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-background">
                    <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Upload className="h-4 w-4 text-primary" />
                      صورة إيصال التحويل <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      ارفع سكرين شوت لإيصال التحويل (فودافون كاش / انستاباي / أي محفظة) — مطلوب لمراجعة طلبك
                    </p>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {receiptFile && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="truncate">{receiptFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setReceiptFile(null)}
                          className="text-muted-foreground hover:text-destructive ms-auto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">{t("checkoutWallet.products")} ({totalItems})</h3>
              <div className="space-y-3">
                {pricedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{t("checkoutWallet.quantity")}: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-sm">{item.price * item.quantity} ج.م</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-24">
              <h3 className="text-lg font-bold text-foreground mb-4">ملخص الطلب</h3>

              <div className="mb-4 space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  كود الخصم
                </Label>
                {appliedDiscount ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="text-sm">
                      <p className="font-bold text-primary">{appliedDiscount.code}</p>
                      <p className="text-xs text-muted-foreground">
                        خصم{" "}
                        {appliedDiscount.discount_type === "percentage"
                          ? `${appliedDiscount.discount_value}%`
                          : `${appliedDiscount.discount_value} ج.م`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={removeDiscount}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value)}
                      placeholder="أدخل الكود"
                      onKeyDown={(e) => e.key === "Enter" && applyDiscountCode()}
                    />
                    <Button
                      variant="outline"
                      onClick={applyDiscountCode}
                      disabled={validatingDiscount || !discountCodeInput.trim()}
                    >
                      {validatingDiscount ? "..." : "تطبيق"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("checkoutWallet.products")} ({totalItems})</span>
                  <span>{pricedTotalPrice} ج.م</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم</span>
                    <span>- {discountAmount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary">{finalTotalPrice.toFixed(2)} ج.م</span>
                </div>
              </div>
              <Button className="w-full mt-6" size="lg" onClick={handleSubmit} disabled={submitting}>
                {uploadingReceipt ? "جاري رفع الإيصال..." : submitting ? (paymentMethod === "wallet" ? "جاري إرسال الطلب..." : "جاري التحويل لصفحة الدفع...") : paymentMethod === "wallet" ? `إرسال الطلب ${finalTotalPrice.toFixed(2)} ج.م` : `ادفع الآن ${finalTotalPrice.toFixed(2)} ج.م`}
              </Button>
              {!user && (
                <p className="text-xs text-destructive text-center mt-2">يرجى تسجيل الدخول أولاً</p>
              )}
              <p className="text-xs text-muted-foreground text-center mt-3">
                🔒 الدفع آمن ومشفّر عبر بوابة Paymob
              </p>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
