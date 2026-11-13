import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CoursePurchaseIncome {
  id: string;
  user_id: string;
  course_id: string;
  amount_paid: number;
  purchased_at: string;
  profiles?: { full_name: string };
  courses?: { title: string };
}

const AccountingPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [coursePurchases, setCoursePurchases] = useState<CoursePurchaseIncome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!hasPermission("financials")) {
        navigate("/dashboard");
      } else {
        fetchData();
      }
    }
  }, [user, userRole, authLoading, navigate, hasPermission]);

  const fetchData = async () => {
    try {
      // Fetch course purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("course_purchases")
        .select(`
          *,
          courses:course_id(title)
        `)
        .eq("payment_status", "completed")
        .order("purchased_at", { ascending: false });

      if (purchasesError) throw purchasesError;

      // Fetch profiles for course purchases
      const purchasesWithProfiles = await Promise.all(
        (purchasesData || []).map(async (purchase) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", purchase.user_id)
            .single();
          return {
            ...purchase,
            profiles: profileData
          };
        })
      );

      setCoursePurchases(purchasesWithProfiles);
    } catch (error: any) {
      toast.error("خطأ في تحميل البيانات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalCoursesIncome = coursePurchases.reduce(
    (sum, purchase) => sum + (purchase.amount_paid || 0),
    0
  );
  const totalIncome = totalCoursesIncome;

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
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">الحسابات</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الإيرادات
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalIncome.toLocaleString()} ج.م</div>
              <p className="text-xs text-muted-foreground mt-1">
                من جميع المصادر
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إيرادات الدورات التدريبية
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{totalCoursesIncome.toLocaleString()} ج.م</div>
              <p className="text-xs text-muted-foreground mt-1">
                {coursePurchases.length} عملية شراء
              </p>
            </CardContent>
          </Card>
        </div>


        {/* Course Purchases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              إيرادات الدورات التدريبية
            </CardTitle>
            <CardDescription>قائمة جميع عمليات شراء الدورات التدريبية</CardDescription>
          </CardHeader>
          <CardContent>
            {coursePurchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد عمليات شراء بعد
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الدورة التدريبية</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>تاريخ الشراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coursePurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">
                        {purchase.profiles?.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{purchase.courses?.title}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {purchase.amount_paid.toLocaleString()} ج.م
                      </TableCell>
                      <TableCell>
                        {format(new Date(purchase.purchased_at), "d MMM yyyy", { locale: ar })}
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

export default AccountingPage;
