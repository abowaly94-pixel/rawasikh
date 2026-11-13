import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Search, Trash2, UserPlus } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface CourseRow {
  id: string;
  title: string;
  price: number | null;
}

interface Grant {
  id: string;
  user_id: string;
  course_id: string;
  amount_paid: number;
  payment_method: string | null;
  payment_status: string;
  purchased_at: string;
  profiles?: { full_name: string; email: string | null } | null;
  courses?: { title: string } | null;
}

const GrantCoursesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, profile, loading, hasPermission } = useAuth();

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !(userRole === "admin" || hasPermission("grant_courses"))) navigate("/dashboard");
  }, [user, userRole, loading, hasPermission, navigate]);

  useEffect(() => {
    if (user && (userRole === "admin" || hasPermission("grant_courses"))) {
      loadCourses();
      loadGrants();
    }
  }, [user, userRole, hasPermission]);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, price")
      .order("title");
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setCourses((data || []) as CourseRow[]);
  };

  const loadGrants = async () => {
    const { data, error } = await supabase
      .from("course_purchases")
      .select("*, profiles:user_id(full_name, email), courses:course_id(title)")
      .eq("payment_method", "admin_gift")
      .order("purchased_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      return;
    }
    setGrants((data || []) as unknown as Grant[]);
  };

  const searchUsers = async () => {
    const q = search.trim();
    if (!q) {
      setUsers([]);
      return;
    }
    setIsSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);
    setIsSearching(false);
    if (error) {
      toast({ title: "خطأ في البحث", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((data || []) as Profile[]);
    if (!data || data.length === 0) {
      toast({ title: "لا يوجد مستخدم", description: "لم يتم العثور على مستخدمين" });
    }
  };

  const grantCourse = async () => {
    if (!selectedUser || !selectedCourse) {
      toast({ title: "بيانات ناقصة", description: "اختر مستخدماً ودورة تدريبية", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    // Check if already has access
    const { data: existing } = await supabase
      .from("course_purchases")
      .select("id, payment_status")
      .eq("user_id", selectedUser.id)
      .eq("course_id", selectedCourse)
      .maybeSingle();

    if (existing) {
      setIsSubmitting(false);
      toast({
        title: "موجود بالفعل",
        description: "هذا المستخدم لديه الدورة التدريبية بالفعل",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("course_purchases").insert({
      user_id: selectedUser.id,
      course_id: selectedCourse,
      amount_paid: 0,
      payment_method: "admin_gift",
      payment_status: "completed",
    });
    setIsSubmitting(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "تم بنجاح 🎁",
      description: `تم منح الدورة التدريبية للمستخدم ${selectedUser.full_name}`,
    });
    setSelectedUser(null);
    setSearch("");
    setUsers([]);
    setSelectedCourse("");
    loadGrants();
  };

  const revokeGrant = async (grantId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء وصول المستخدم للدورة التدريبية؟")) return;
    const { error } = await supabase.from("course_purchases").delete().eq("id", grantId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الإلغاء", description: "تم إلغاء الوصول للدورة التدريبية" });
    loadGrants();
  };

  const selectedCourseTitle = useMemo(
    () => courses.find((c) => c.id === selectedCourse)?.title,
    [courses, selectedCourse]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "الأدمن"}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">منح الدورات التدريبية مجاناً</h1>
            <p className="text-muted-foreground text-sm">
              أضف دورة تدريبية لأي مستخدم بدون الحاجة لدفع أو طلب مسبق
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              منح جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>الدورة التدريبية</Label>
                <SearchableSelect
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: `${c.title}${c.price ? ` — ${c.price} ج.م` : " — مجاني"}`,
                  }))}
                  placeholder="اختر دورة تدريبية"
                  searchPlaceholder="ابحث باسم الدورة التدريبية..."
                  emptyText="لا توجد دورات تدريبية مطابقة"
                />
              </div>

              <div className="space-y-2">
                <Label>ابحث عن المستخدم (اسم / إيميل / موبايل)</Label>
                <div className="flex gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                    placeholder="اكتب اسم أو إيميل..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={searchUsers}
                    disabled={isSearching}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {users.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-right p-3 hover:bg-muted transition-colors ${
                      selectedUser?.id === u.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email || "بدون إيميل"} {u.phone ? `• ${u.phone}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  سيتم منح{" "}
                  <span className="font-bold text-primary">
                    {selectedCourseTitle || "..."}
                  </span>{" "}
                  للمستخدم{" "}
                  <span className="font-bold">{selectedUser.full_name}</span>
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={grantCourse}
                disabled={!selectedUser || !selectedCourse || isSubmitting}
                size="lg"
              >
                <Gift className="ml-2 h-4 w-4" />
                {isSubmitting ? "جاري المنح..." : "منح الدورة التدريبية"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الدورات التدريبية الممنوحة</CardTitle>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا يوجد أي منح حالياً</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">الإيميل</TableHead>
                      <TableHead className="text-right">الدورة التدريبية</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grants.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">
                          {g.profiles?.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {g.profiles?.email || "—"}
                        </TableCell>
                        <TableCell>{g.courses?.title || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(g.purchased_at).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                            {g.payment_status === "completed" ? "مفعّل" : g.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeGrant(g.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GrantCoursesPage;
