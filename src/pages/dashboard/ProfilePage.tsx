import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Camera, Save, Loader2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, buildWhatsappLink } from "@/lib/phone";

const profileSchema = z.object({
  full_name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  country_code: z.string().max(6).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const ProfilePage = () => {
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    country_code: DEFAULT_COUNTRY_CODE,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
      }));
      fetchFullProfile();
    }
  }, [profile, user]);

  const fetchFullProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const matchedCountry = COUNTRY_CODES.find(
          (c) => c.dial === (data as any).country_code || c.code === (data as any).country_code
        );
        setFormData({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          whatsapp: (data as any).whatsapp || "",
          country_code: matchedCountry?.code || DEFAULT_COUNTRY_CODE,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const validated = profileSchema.parse({
        full_name: formData.full_name,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        country_code: formData.country_code,
      });

      setSaving(true);

      const countryDial = COUNTRY_CODES.find((c) => c.code === validated.country_code)?.dial || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.full_name,
          phone: validated.phone || null,
          whatsapp: validated.whatsapp || null,
          country_code: countryDial,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم تحديث بيانات الملف الشخصي بنجاح",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving profile:", error);
        toast({
          title: "خطأ",
          description: "فشل في حفظ البيانات",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const validated = passwordSchema.parse(passwordData);

      setChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تغيير كلمة المرور بنجاح",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error changing password:", error);
        toast({
          title: "خطأ",
          description: "فشل في تغيير كلمة المرور",
          variant: "destructive",
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    admin: "مدير النظام",
    teacher: "مدرس",
    student: "طالب",
    parent: "ولي أمر",
    school: "مدرسة",
  };

  const profileContent = (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground">إدارة معلومات حسابك الشخصي</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(formData.full_name || "م")}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center sm:text-right">
              <h2 className="text-xl font-bold">{formData.full_name || "مستخدم"}</h2>
              <p className="text-muted-foreground">{formData.email}</p>
              <p className="text-sm text-primary mt-1">
                {roleLabels[userRole || "student"]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            المعلومات الشخصية
          </CardTitle>
          <CardDescription>تعديل بيانات الملف الشخصي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="أدخل اسمك الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="pr-9 bg-muted"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="pr-9"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_code">كود الدولة</Label>
              <Select
                value={formData.country_code}
                onValueChange={(value) => setFormData({ ...formData, country_code: value })}
              >
                <SelectTrigger id="country_code" dir="ltr">
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="whatsapp">رقم الواتساب</Label>
              <div className="relative">
                <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="pr-9"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                هذا الرقم يستخدمه المعلمون والإدارة للتواصل معك مباشرة عبر واتساب. تأكد أن كود الدولة بالأعلى صحيح حتى يعمل الرابط.
              </p>
              {(() => {
                const testLink = buildWhatsappLink(
                  formData.whatsapp,
                  COUNTRY_CODES.find((c) => c.code === formData.country_code)?.dial
                );
                return testLink ? (
                  <a
                    href={testLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline inline-flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" /> اختبار الرابط
                  </a>
                ) : formData.whatsapp ? (
                  <p className="text-xs text-destructive">تأكد من الرقم وكود الدولة — الرابط غير صالح حالياً.</p>
                ) : null;
              })()}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>تحديث كلمة المرور الخاصة بحسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
            <div></div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="gap-2"
            >
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              تغيير كلمة المرور
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">معرف الحساب</span>
              <span className="font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">تاريخ الإنشاء</span>
              <span>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("ar-SA")
                  : "-"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">آخر تسجيل دخول</span>
              <span>
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString("ar-SA")
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Use SchoolLayout for school role, DashboardLayout for others
  if (userRole === "school") {
    return (
      <SchoolLayout schoolName={profile?.full_name || "مدرسة"}>
        {profileContent}
      </SchoolLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      {profileContent}
    </DashboardLayout>
  );
};

export default ProfilePage;
