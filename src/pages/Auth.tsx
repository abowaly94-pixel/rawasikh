import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Lock, Mail, Phone, User, MessageCircle, Eye, EyeOff } from "lucide-react";
import { logActivity } from "@/lib/activityLogger";
import { Link } from "react-router-dom";
import rawasikhLogo from "@/assets/rawasikh-logo.png";
import { useTranslation } from "react-i18next";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

function AuthPasswordToggle({ visible, onToggle, label }: { visible: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={visible}
      className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      tabIndex={0}
    >
      {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </button>
  );
}

type AuthFieldErrors = Partial<Record<"fullName" | "email" | "password" | "phone" | "whatsapp", string>>;

const mapZodErrors = (error: z.ZodError): AuthFieldErrors => {
  const errors: AuthFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof AuthFieldErrors | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
};

const normalizePhone = (value: string) => value.trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");

const Auth = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const loginSchema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t("authPage.emailRequired"))
      .email(t("authPage.emailInvalidFormat")),
    password: z.string().min(1, t("authPage.passwordRequired")),
  });

  const registerSchema = z.object({
    fullName: z.string().trim().min(2, t("authPage.nameRequired")),
    email: z
      .string()
      .trim()
      .min(1, t("authPage.emailRequired"))
      .email(t("authPage.emailInvalidFormat")),
    password: z
      .string()
      .min(1, t("authPage.passwordRequired"))
      .min(6, t("authPage.passwordTooShort"))
      .regex(/\p{L}/u, t("authPage.passwordNeedsLetter"))
      .regex(/\d/, t("authPage.passwordNeedsNumber")),
    phone: z
      .string()
      .refine((value) => value === "" || /^\d{7,15}$/.test(value), t("authPage.phoneInvalid")),
    whatsapp: z
      .string()
      .min(1, t("authPage.whatsappRequired"))
      .regex(/^\d{7,15}$/, t("authPage.whatsappInvalid")),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState("");
  const [regWhatsapp, setRegWhatsapp] = useState("");
  const [regCountryCode, setRegCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginFieldErrors, setLoginFieldErrors] = useState<AuthFieldErrors>({});
  const [registerFieldErrors, setRegisterFieldErrors] = useState<AuthFieldErrors>({});

  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const regNameRef = useRef<HTMLInputElement>(null);
  const regEmailRef = useRef<HTMLInputElement>(null);
  const regPasswordRef = useRef<HTMLInputElement>(null);
  const regPhoneRef = useRef<HTMLInputElement>(null);
  const regWhatsappRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading, signIn, signUp, isDemo } = useAuth();

  // Set while a registration is in flight/succeeded so the auto-redirect
  // below does not send the freshly created account to the dashboard.
  const skipAuthRedirectRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (skipAuthRedirectRef.current) return;

    if (isDemo) {
      if (userRole === "school") navigate("/school");
      else navigate("/dashboard");
      return;
    }

    const checkRoleAndRedirect = async () => {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (roleData?.role === "school") navigate("/school");
      else navigate("/dashboard");
    };
    checkRoleAndRedirect();
  }, [user, userRole, authLoading, navigate, isDemo]);

  const focusFirstLoginError = (errors: AuthFieldErrors) => {
    if (errors.email) loginEmailRef.current?.focus();
    else if (errors.password) loginPasswordRef.current?.focus();
  };

  const focusFirstRegisterError = (errors: AuthFieldErrors) => {
    const field = (["fullName", "email", "password", "phone", "whatsapp"] as const).find(
      (key) => errors[key],
    );
    const refs = {
      fullName: regNameRef,
      email: regEmailRef,
      password: regPasswordRef,
      phone: regPhoneRef,
      whatsapp: regWhatsappRef,
    };
    if (field) refs[field].current?.focus();
  };

  const clearLoginFieldError = (field: keyof AuthFieldErrors) => {
    setLoginFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const clearRegisterFieldError = (field: keyof AuthFieldErrors) => {
    setRegisterFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors = mapZodErrors(parsed.error);
      setLoginFieldErrors(fieldErrors);
      focusFirstLoginError(fieldErrors);
      return;
    }

    setLoginFieldErrors({});
    setIsLoading(true);
    try {
      const { error } = await signIn(parsed.data.email, parsed.data.password);
      if (error) {
        let message = t("authPage.loginFailed");
        if (error.message.includes("Invalid login credentials")) message = t("authPage.invalidCreds");
        else if (error.message.includes("Email not confirmed")) message = t("authPage.emailNotConfirmed");
        setLoginError(message);
        toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
      } else {
        toast({ title: t("authPage.welcome"), description: t("authPage.loginSuccess") });
        logActivity({ actionType: "user_login", description: "تسجيل دخول مستخدم" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("authPage.loginFailed");
      setLoginError(message);
      toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const parsed = registerSchema.safeParse({
      fullName: regName,
      email: regEmail,
      password: regPassword,
      phone: normalizePhone(regPhone),
      whatsapp: normalizePhone(regWhatsapp),
    });
    if (!parsed.success) {
      const fieldErrors = mapZodErrors(parsed.error);
      setRegisterFieldErrors(fieldErrors);
      focusFirstRegisterError(fieldErrors);
      return;
    }

    setRegisterFieldErrors({});
    setIsLoading(true);
    try {
      const countryOption = COUNTRY_CODES.find((c) => c.code === regCountryCode);
      // Prevent the logged-in redirect from racing the homepage navigation.
      skipAuthRedirectRef.current = true;
      const { data, error } = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.fullName,
        null,
        {
          phone: parsed.data.phone,
          whatsapp: parsed.data.whatsapp,
          country_code: countryOption?.dial || "",
        }
      );
      if (error) {
        skipAuthRedirectRef.current = false;
        let message = t("authPage.registerFailed");
        if (error.message.includes("already registered")) message = t("authPage.alreadyRegistered");
        else if (error.message.includes("invalid") || error.message.includes("email_address_invalid")) message = t("authPage.invalidEmail");
        else if (error.message.includes("password")) message = t("authPage.weakPassword");
        setRegisterError(message);
        toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
      } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        // Supabase intentionally returns an obfuscated user with no identities
        // when the email is already registered and email confirmation is on.
        skipAuthRedirectRef.current = false;
        const message = t("authPage.alreadyRegistered");
        setRegisterError(message);
        toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
      } else if (data?.user) {
        // With email confirmation disabled Supabase returns a session right away
        // and the user is already signed in; otherwise they must confirm first.
        const signedIn = Boolean(data.session);
        toast({
          title: t("authPage.registerSuccess"),
          description: signedIn
            ? t("authPage.registerSuccessLoggedIn")
            : t("authPage.registerSuccessDesc"),
        });
        setRegName(""); setRegEmail(""); setRegPassword(""); setRegPhone(""); setRegWhatsapp(""); setRegCountryCode(DEFAULT_COUNTRY_CODE);
        // New accounts land on the public homepage, not the dashboard.
        navigate("/");
      } else {
        skipAuthRedirectRef.current = false;
        const message = t("authPage.registerFailed");
        setRegisterError(message);
        toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
      }
    } catch (error) {
      skipAuthRedirectRef.current = false;
      const message = error instanceof Error ? error.message : t("authPage.registerFailed");
      setRegisterError(message);
      toast({ title: t("authPage.errorTitle"), description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "أدخل البريد الإلكتروني",
        description: "من فضلك اكتب بريدك الإلكتروني في خانة الإيميل أولاً، ثم اضغط على نسيت كلمة المرور.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const origin = (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null")
        ? window.location.origin
        : "https://rawasikheg.com";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) {
        toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "تم إرسال الرابط",
          description: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقّق من البريد (وصندوق الـ Spam).",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر إرسال الرابط";
      toast({ title: "حدث خطأ", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const labelAlign = isRtl ? "justify-end" : "justify-start";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4 py-10" dir={isRtl ? "rtl" : "ltr"}>
      {/* Islamic geometric pattern — same as the footer */}
      <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(80% 90% at 90% 0%, hsl(var(--primary) / 0.28) 0%, transparent 55%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.16) 0%, transparent 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 end-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.28)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 start-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "hsl(var(--gold) / 0.16)" }}
        aria-hidden
      />

      {/* Decorative geometric diamonds */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/[0.06] md:block" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-gold/10 md:block" aria-hidden />
      <div className="pointer-events-none absolute left-[12%] top-[18%] h-3 w-3 rotate-45 border border-gold/40" aria-hidden />
      <div className="pointer-events-none absolute right-[14%] top-[22%] h-2 w-2 rotate-45 bg-gold/30" aria-hidden />
      <div className="pointer-events-none absolute bottom-[20%] left-[16%] h-2 w-2 rotate-45 bg-white/20" aria-hidden />
      <div className="pointer-events-none absolute bottom-[24%] right-[10%] h-3 w-3 rotate-45 border border-white/15" aria-hidden />
      <div className="pointer-events-none absolute left-[24%] top-[30%] h-1.5 w-1.5 rotate-45 bg-primary/40" aria-hidden />
      <div className="pointer-events-none absolute right-[24%] bottom-[32%] h-1.5 w-1.5 rotate-45 bg-gold/50" aria-hidden />

      <div className="relative z-10 w-full max-w-md space-y-5">
        <Card className="auth-card overflow-hidden shadow-2xl shadow-black/30">
          <div className="h-1 bg-gradient-to-r from-primary via-gold to-primary" aria-hidden />
          <CardHeader className="text-center">
            <Link to="/" className="flex justify-center mb-2 mx-auto group">
              <img src={rawasikhLogo} alt="رواسخ" className="h-20 w-auto transition-transform group-hover:scale-105" />
            </Link>
            <CardTitle className="text-2xl font-bold">{t("authPage.systemTitle")}</CardTitle>
            <CardDescription>{t("authPage.systemDesc")}</CardDescription>
            <div className="rule-gold mx-auto" aria-hidden />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("authPage.tabLogin")}</TabsTrigger>
                <TabsTrigger value="register">{t("authPage.tabRegister")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4" noValidate aria-label={t("authPage.tabLogin")}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Mail className="h-4 w-4" aria-hidden />
                      {t("authPage.email")}
                    </Label>
                    <Input
                      ref={loginEmailRef}
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearLoginFieldError("email");
                      }}
                      required
                      dir="ltr"
                      autoComplete="email"
                      aria-invalid={loginFieldErrors.email ? true : undefined}
                      aria-describedby={
                        [loginFieldErrors.email ? "login-email-error" : null, loginError ? "login-error" : null]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                    {loginFieldErrors.email && (
                      <p id="login-email-error" className="text-xs text-destructive" role="alert">
                        {loginFieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Lock className="h-4 w-4" aria-hidden />
                      {t("authPage.password")}
                    </Label>
                    <div className="relative">
                      <Input
                        ref={loginPasswordRef}
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearLoginFieldError("password");
                        }}
                        required
                        dir="ltr"
                        autoComplete="current-password"
                        className="pl-12"
                        aria-invalid={loginFieldErrors.password ? true : undefined}
                        aria-describedby={
                          [loginFieldErrors.password ? "login-password-error" : null, loginError ? "login-error" : null]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                      />
                      <AuthPasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} label={showPassword ? t("authPage.hidePassword") : t("authPage.showPassword")} />
                    </div>
                    {loginFieldErrors.password && (
                      <p id="login-password-error" className="text-xs text-destructive" role="alert">
                        {loginFieldErrors.password}
                      </p>
                    )}
                  </div>
                  {loginError && (
                    <p id="login-error" className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive" role="alert">
                      {loginError}
                    </p>
                  )}
                  <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                        {t("authPage.loading")}
                      </span>
                    ) : (
                      t("authPage.loginBtn")
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="min-h-[44px] px-2 text-sm text-primary hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-md"
                    >
                      هل نسيت كلمة المرور؟
                    </button>
                  </div>
                </form>
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">{t("authPage.teacherNote")}</p>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4" noValidate aria-label={t("authPage.tabRegister")}>
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className={`flex items-center gap-2 ${labelAlign}`}>
                      <User className="h-4 w-4" aria-hidden />
                      {t("authPage.fullName")}
                    </Label>
                    <Input
                      ref={regNameRef}
                      id="reg-name"
                      type="text"
                      placeholder={t("authPage.fullNamePlaceholder")}
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        clearRegisterFieldError("fullName");
                      }}
                      required
                      autoComplete="name"
                      aria-invalid={registerFieldErrors.fullName ? true : undefined}
                      aria-describedby={registerFieldErrors.fullName ? "reg-name-error" : undefined}
                    />
                    {registerFieldErrors.fullName && (
                      <p id="reg-name-error" className="text-xs text-destructive" role="alert">
                        {registerFieldErrors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Mail className="h-4 w-4" aria-hidden />
                      {t("authPage.email")}
                    </Label>
                    <Input
                      ref={regEmailRef}
                      id="reg-email"
                      type="email"
                      placeholder="example@email.com"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        clearRegisterFieldError("email");
                      }}
                      required
                      dir="ltr"
                      autoComplete="email"
                      aria-invalid={registerFieldErrors.email ? true : undefined}
                      aria-describedby={registerFieldErrors.email ? "reg-email-error" : undefined}
                    />
                    {registerFieldErrors.email && (
                      <p id="reg-email-error" className="text-xs text-destructive" role="alert">
                        {registerFieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Lock className="h-4 w-4" aria-hidden />
                      {t("authPage.password")}
                    </Label>
                    <div className="relative">
                      <Input
                        ref={regPasswordRef}
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          clearRegisterFieldError("password");
                        }}
                        required
                        dir="ltr"
                        autoComplete="new-password"
                        className="pl-12"
                        aria-invalid={registerFieldErrors.password ? true : undefined}
                        aria-describedby={
                          registerFieldErrors.password
                            ? "reg-password-hint reg-password-error"
                            : "reg-password-hint"
                        }
                      />
                      <AuthPasswordToggle visible={showRegPassword} onToggle={() => setShowRegPassword((v) => !v)} label={showRegPassword ? t("authPage.hidePassword") : t("authPage.showPassword")} />
                    </div>
                    <p id="reg-password-hint" className="text-xs text-muted-foreground">{t("authPage.passwordHint")}</p>
                    {registerFieldErrors.password && (
                      <p id="reg-password-error" className="text-xs text-destructive" role="alert">
                        {registerFieldErrors.password}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Phone className="h-4 w-4" aria-hidden />
                      {t("authPage.phone")}
                    </Label>
                    <Input
                      ref={regPhoneRef}
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="01xxxxxxxxx"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        clearRegisterFieldError("phone");
                      }}
                      dir="ltr"
                      autoComplete="tel"
                      aria-invalid={registerFieldErrors.phone ? true : undefined}
                      aria-describedby={registerFieldErrors.phone ? "reg-phone-error" : undefined}
                    />
                    {registerFieldErrors.phone && (
                      <p id="reg-phone-error" className="text-xs text-destructive" role="alert">
                        {registerFieldErrors.phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-country" className={`flex items-center gap-2 ${labelAlign}`}>
                      <Phone className="h-4 w-4" aria-hidden />
                      {t("authPage.countryCode")}
                    </Label>
                    <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                      <SelectTrigger id="reg-country" dir="ltr">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label} ({c.dial})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-whatsapp" className={`flex items-center gap-2 ${labelAlign}`}>
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      {t("authPage.whatsapp")}
                    </Label>
                    <Input
                      ref={regWhatsappRef}
                      id="reg-whatsapp"
                      type="tel"
                      inputMode="tel"
                      placeholder="01xxxxxxxxx"
                      value={regWhatsapp}
                      onChange={(e) => {
                        setRegWhatsapp(e.target.value);
                        clearRegisterFieldError("whatsapp");
                      }}
                      required
                      dir="ltr"
                      autoComplete="tel"
                      aria-invalid={registerFieldErrors.whatsapp ? true : undefined}
                      aria-describedby={
                        registerFieldErrors.whatsapp
                          ? "reg-whatsapp-hint reg-whatsapp-error"
                          : "reg-whatsapp-hint"
                      }
                    />
                    <p id="reg-whatsapp-hint" className="text-xs text-muted-foreground">{t("authPage.whatsappHint")}</p>
                    {registerFieldErrors.whatsapp && (
                      <p id="reg-whatsapp-error" className="text-xs text-destructive" role="alert">
                        {registerFieldErrors.whatsapp}
                      </p>
                    )}
                  </div>
                  {registerError && (
                    <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive" role="alert">
                      {registerError}
                    </p>
                  )}
                  <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                        {t("authPage.loading")}
                      </span>
                    ) : (
                      t("authPage.registerBtn")
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("authPage.generalAccountNote")}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <div className="text-center">
          <div className="mx-auto mb-3 h-px w-24 bg-white/15" aria-hidden />
          <p className="text-[12px] leading-6 text-white/50">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="mt-2 flex items-center justify-center gap-5 text-[12px] text-white/45">
            <a href="mailto:info@rawasikheg.com" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              info@rawasikheg.com
            </a>
            <a href="tel:+201033441054" className="inline-flex items-center gap-1.5 transition-colors hover:text-white" dir="ltr">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              +20 103 344 1054
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
