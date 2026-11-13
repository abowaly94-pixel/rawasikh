import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, ShoppingBag, Clock, CheckCircle, XCircle, Video, Edit } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CoursePurchaseRequest {
  id: string;
  user_id: string;
  course_id: string;
  level_id?: string | null;
  level_name?: string | null;
  amount_paid: number;
  payment_status: string;
  payment_method: string | null;
  payment_receipt_url?: string | null;
  purchased_at: string;
  request_kind: "course" | "level";
  profiles?: { full_name: string; email: string | null };
  courses?: { title: string; price: number; thumbnail_url: string | null };
}


const PAYMENT_STATUSES = [
  { value: "pending", label: "معلق", color: "outline" },
  { value: "completed", label: "مدفوع", color: "success" },
  { value: "rejected", label: "مرفوض", color: "destructive" },
];

const CourseRequestsPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<CoursePurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CoursePurchaseRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!(userRole === "admin" || hasPermission("course_requests"))) {
        navigate("/dashboard");
      } else {
        fetchRequests();
      }
    }
  }, [user, userRole, authLoading, hasPermission, navigate]);

  const fetchRequests = async () => {
    try {
      const [coursesRes, levelsRes] = await Promise.all([
        supabase
          .from("course_purchases")
          .select(`*, courses:course_id(title, price, thumbnail_url)`)
          .order("purchased_at", { ascending: false }),
        supabase
          .from("course_level_purchases")
          .select(`*, courses:course_id(title, price, thumbnail_url), course_levels:level_id(name)`)
          .order("purchased_at", { ascending: false }),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (levelsRes.error) throw levelsRes.error;

      const merged: any[] = [
        ...(coursesRes.data || []).map((r: any) => ({ ...r, request_kind: "course" })),
        ...(levelsRes.data || []).map((r: any) => ({
          ...r,
          request_kind: "level",
          level_name: r.course_levels?.name || null,
        })),
      ].sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());

      const userIds = Array.from(new Set(merged.map((r) => r.user_id).filter(Boolean)));
      const profilesById = new Map<string, { full_name: string; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        (profilesData || []).forEach((p: any) => profilesById.set(p.id, { full_name: p.full_name, email: p.email }));
      }
      const requestsWithProfiles = merged.map((req) => ({
        ...req,
        profiles: profilesById.get(req.user_id) || { full_name: "غير معروف", email: null },
      }));

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error("CourseRequests fetch error:", error);
      toast.error("خطأ في تحميل طلبات الدورات التدريبية: " + (error?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = (request: CoursePurchaseRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.payment_status);
    setViewDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedRequest || !user || !newStatus) return;

    setProcessing(true);
    try {
      const table = selectedRequest.request_kind === "level" ? "course_level_purchases" : "course_purchases";
      const { error: updateError } = await supabase
        .from(table)
        .update({ payment_status: newStatus })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      const statusLabel = PAYMENT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`تم تحديث حالة الطلب إلى: ${statusLabel}`);
      
      if (newStatus === "completed") {
        toast.success("تم التفعيل للمستخدم بنجاح");
      }
      
      setViewDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickStatusChange = async (request: CoursePurchaseRequest, status: string) => {
    try {
      const table = request.request_kind === "level" ? "course_level_purchases" : "course_purchases";
      const { error: updateError } = await supabase
        .from(table)
        .update({ payment_status: status })
        .eq("id", request.id);

      if (updateError) throw updateError;

      const statusLabel = PAYMENT_STATUSES.find(s => s.value === status)?.label || status;
      toast.success(`تم تحديث حالة الطلب إلى: ${statusLabel}`);
      
      if (status === "completed") {
        toast.success("تم التفعيل للمستخدم بنجاح");
      }
      
      fetchRequests();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> معلق</Badge>;
      case "completed":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> مدفوع</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const pendingCount = requests.filter(r => r.payment_status === "pending").length;
  const completedCount = requests.filter(r => r.payment_status === "completed").length;

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">طلبات الدورات التدريبية</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} معلق</Badge>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الطلبات
              </CardTitle>
              <ShoppingBag className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                معلق
              </CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{pendingCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                مدفوع
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>جميع الطلبات</CardTitle>
            <CardDescription>طلبات شراء الدورات التدريبية من المستخدمين - عند قبول الطلب تظهر الدورة التدريبية في حساب الطالب</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد طلبات دورات تدريبية
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الدورة التدريبية</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تغيير الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="max-w-[180px] truncate">{request.courses?.title}</span>
                              {request.request_kind === "level" && request.level_name && (
                                <Badge variant="secondary" className="text-xs w-fit mt-1">
                                  المستوى: {request.level_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.amount_paid} ج.م
                          {request.payment_receipt_url && (
                            <Badge variant="secondary" className="ms-2 text-xs">إيصال ✓</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {format(new Date(request.purchased_at), "d MMM yyyy", { locale: ar })}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.payment_status)}</TableCell>
                        <TableCell>
                          <Select
                            value={request.payment_status}
                            onValueChange={(value) => handleQuickStatusChange(request, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(request)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            عرض
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

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب الدورة التدريبية</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المستخدم</p>
                    <p className="font-medium">{selectedRequest.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد</p>
                    <p className="font-medium">{selectedRequest.profiles?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الدورة التدريبية</p>
                    <p className="font-medium">{selectedRequest.courses?.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">سعر الدورة التدريبية</p>
                    <p className="font-medium">{selectedRequest.courses?.price} ج.م</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                    <p className="font-medium text-green-600">{selectedRequest.amount_paid} ج.م</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                    <p className="font-medium">{selectedRequest.payment_method || "غير محدد"}</p>
                  </div>
                </div>

                {selectedRequest.courses?.thumbnail_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">صورة الدورة التدريبية</p>
                    <img
                      src={selectedRequest.courses.thumbnail_url}
                      alt={selectedRequest.courses.title}
                      className="max-h-[200px] rounded-lg border object-cover"
                    />
                  </div>
                )}

                {selectedRequest.payment_receipt_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">إيصال التحويل</p>
                    {/\.(pdf)(\?|$)/i.test(selectedRequest.payment_receipt_url) ? (
                      <a
                        href={selectedRequest.payment_receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-primary underline"
                      >
                        عرض ملف الإيصال (PDF)
                      </a>
                    ) : (
                      <a href={selectedRequest.payment_receipt_url} target="_blank" rel="noreferrer">
                        <img
                          src={selectedRequest.payment_receipt_url}
                          alt="إيصال التحويل"
                          className="max-h-[400px] rounded-lg border object-contain bg-muted"
                        />
                      </a>
                    )}
                  </div>
                )}


                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">تغيير حالة الطلب</p>
                  <div className="flex gap-3 items-center">
                    <Select
                      value={newStatus}
                      onValueChange={setNewStatus}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStatusChange}
                      disabled={processing || newStatus === selectedRequest.payment_status}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      حفظ التغيير
                    </Button>
                  </div>
                  {newStatus === "completed" && selectedRequest.payment_status !== "completed" && (
                    <p className="text-sm text-green-600">
                      ✓ عند القبول ستظهر الدورة التدريبية في حساب الطالب/المستخدم مباشرة
                    </p>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">الحالة الحالية: {getStatusBadge(selectedRequest.payment_status)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CourseRequestsPage;
