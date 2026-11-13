import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package } from "lucide-react";

interface PackageType {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  bank_account_info: string | null;
  is_active: boolean;
  created_at: string;
}

const ManagePackagesPage = () => {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(0);
  const [bankAccountInfo, setBankAccountInfo] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole !== "admin") {
        navigate("/dashboard");
      } else {
        fetchPackages();
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل الباقات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDurationDays(30);
    setPrice(0);
    setBankAccountInfo("");
    setIsActive(true);
    setEditingPackage(null);
  };

  const openEditDialog = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setDurationDays(pkg.duration_days);
    setPrice(pkg.price);
    setBankAccountInfo(pkg.bank_account_info || "");
    setIsActive(pkg.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم الباقة");
      return;
    }

    try {
      const packageData = {
        name: name.trim(),
        description: description.trim() || null,
        duration_days: durationDays,
        price,
        bank_account_info: bankAccountInfo.trim() || null,
        is_active: isActive,
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("packages")
          .update(packageData)
          .eq("id", editingPackage.id);

        if (error) throw error;
        toast.success("تم تحديث الباقة بنجاح");
      } else {
        const { error } = await supabase
          .from("packages")
          .insert(packageData);

        if (error) throw error;
        toast.success("تم إضافة الباقة بنجاح");
      }

      setDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;

    try {
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف الباقة بنجاح");
      fetchPackages();
    } catch (error: any) {
      toast.error("حدث خطأ في الحذف: " + error.message);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">إدارة الباقات</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة باقة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>اسم الباقة *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: الباقة الأساسية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف الباقة..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المدة (بالأيام) *</Label>
                    <Input
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السعر *</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>معلومات الحساب البنكي / طريقة التحويل</Label>
                  <Textarea
                    value={bankAccountInfo}
                    onChange={(e) => setBankAccountInfo(e.target.value)}
                    placeholder="رقم الحساب البنكي، اسم البنك، أو أي طريقة دفع أخرى..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label>الباقة مفعلة</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingPackage ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الباقات</CardTitle>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد باقات بعد
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المدة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.duration_days} يوم</TableCell>
                      <TableCell>{pkg.price} ج.م</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {pkg.is_active ? "مفعلة" : "معطلة"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(pkg)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(pkg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

export default ManagePackagesPage;
