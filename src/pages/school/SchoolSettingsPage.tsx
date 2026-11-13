import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SchoolData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const SchoolSettingsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchSchoolData();
    }
  }, [user, userRole]);

  const fetchSchoolData = async () => {
    try {
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (school) {
        setSchoolData(school);
        setName(school.name);
        setAddress(school.address || "");
        setPhone(school.phone || "");
        setEmail(school.email || "");
      }
    } catch (error) {
      console.error("Error fetching school data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schoolData || !name.trim()) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name,
          address,
          phone,
          email,
        })
        .eq("id", schoolData.id);

      if (error) throw error;
      toast({ title: "تم حفظ البيانات بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SchoolLayout schoolName={profile?.full_name || "مدرسة"}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">إعدادات المدرسة</h1>

        <Card>
          <CardHeader>
            <CardTitle>معلومات المدرسة</CardTitle>
            <CardDescription>تحديث بيانات المدرسة الأساسية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المدرسة</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
};

export default SchoolSettingsPage;
