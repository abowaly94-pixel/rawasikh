import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, Eye, ClipboardCheck } from "lucide-react";

interface School {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  user_id: string;
}

const ManageSchoolsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "admin") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "admin") {
      fetchSchools();
    }
  }, [user, userRole]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!schoolName.trim() || !schoolEmail.trim() || !schoolPassword.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    if (schoolPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-school-user', {
        body: {
          email: schoolEmail,
          password: schoolPassword,
          schoolName: schoolName,
          phone: schoolPhone,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "تم إنشاء حساب المدرسة بنجاح" });
      resetForm();
      fetchSchools();
    } catch (error: any) {
      let message = "فشل في إنشاء الحساب";
      if (error.message.includes("already") || error.message.includes("exists")) {
        message = "هذا البريد الإلكتروني مسجل مسبقاً";
      }
      toast({ title: "خطأ", description: message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ is_active: !school.is_active })
        .eq("id", school.id);

      if (error) throw error;
      toast({ title: school.is_active ? "تم تعطيل المدرسة" : "تم تفعيل المدرسة" });
      fetchSchools();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المدرسة؟ سيتم حذف جميع البيانات المرتبطة بها.")) return;

    try {
      const { error } = await supabase
        .from("schools")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف المدرسة بنجاح" });
      fetchSchools();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setSchoolName("");
    setSchoolEmail("");
    setSchoolPassword("");
    setSchoolPhone("");
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">إدارة المدارس</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/level-assessments")}>
              <ClipboardCheck className="h-4 w-4 ml-2" />
              اختبارات التقييم
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              else setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة مدرسة
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مدرسة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المدرسة *</Label>
                  <Input
                    placeholder="مثال: مدرسة النور"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    placeholder="school@example.com"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور *</Label>
                  <PasswordInput
                    dir="ltr"
                    placeholder="••••••••"
                    value={schoolPassword}
                    onChange={(e) => setSchoolPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    dir="ltr"
                    placeholder="+966XXXXXXXXX"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateSchool} className="w-full">
                  إنشاء حساب المدرسة
                </Button>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة المدارس</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSchools.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد مدارس. قم بإضافة مدرسة جديدة.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المدرسة</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell dir="ltr" className="text-right">{school.email || "-"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{school.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={school.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(school)}
                        >
                          {school.is_active ? "نشط" : "معطل"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/schools/${school.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(school.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageSchoolsPage;
