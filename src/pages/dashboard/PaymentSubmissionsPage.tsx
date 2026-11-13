import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, Receipt, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PaymentSubmission {
  id: string;
  user_id: string;
  package_id: string;
  screenshot_url: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string | null };
  packages?: { name: string; price: number };
}

const PaymentSubmissionsPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!hasPermission("financials")) {
        navigate("/dashboard");
      } else {
        fetchSubmissions();
      }
    }
  }, [user, userRole, authLoading, navigate, hasPermission]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_submissions")
        .select(`
          *,
          packages:package_id(name, price)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const submissionsWithProfiles = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", sub.user_id)
            .single();
          return {
            ...sub,
            status: sub.status as "pending" | "approved" | "rejected",
            profiles: profileData
          };
        })
      );

      setSubmissions(submissionsWithProfiles);
    } catch (error: any) {
      toast.error("خطأ في تحميل طلبات الدفع");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = (submission: PaymentSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || "");
    setViewDialogOpen(true);
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedSubmission || !user) return;

    setProcessing(true);
    try {
      // Update submission status
      const { error: updateError } = await supabase
        .from("payment_submissions")
        .update({
          status,
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      // If approved, create user subscription
      if (status === "approved") {
        // Get package details for duration
        const { data: packageData, error: pkgError } = await supabase
          .from("packages")
          .select("duration_days")
          .eq("id", selectedSubmission.package_id)
          .single();

        if (pkgError) throw pkgError;

        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + packageData.duration_days);

        const { error: subError } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: selectedSubmission.user_id,
            package_id: selectedSubmission.package_id,
            payment_submission_id: selectedSubmission.id,
            ends_at: endsAt.toISOString(),
          });

        if (subError) throw subError;
      }

      toast.success(status === "approved" ? "تم قبول الطلب بنجاح" : "تم رفض الطلب");
      setViewDialogOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> في الانتظار</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> مقبول</Badge>;
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

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">طلبات التحويل</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} في الانتظار</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>جميع الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد طلبات تحويل
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الباقة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{submission.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{submission.packages?.name}</TableCell>
                      <TableCell>{submission.packages?.price} ج.م</TableCell>
                      <TableCell>
                        {format(new Date(submission.created_at), "d MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewDialog(submission)}
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب التحويل</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المستخدم</p>
                    <p className="font-medium">{selectedSubmission.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد</p>
                    <p className="font-medium">{selectedSubmission.profiles?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الباقة</p>
                    <p className="font-medium">{selectedSubmission.packages?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">السعر</p>
                    <p className="font-medium">{selectedSubmission.packages?.price} ج.م</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">صورة التحويل</p>
                  <img
                    src={selectedSubmission.screenshot_url}
                    alt="صورة التحويل"
                    className="max-h-[300px] rounded-lg border object-contain"
                  />
                </div>

                {selectedSubmission.status === "pending" && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">ملاحظات (اختياري)</p>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="أضف ملاحظات..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview("approved")}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 ml-2" />
                        قبول
                      </Button>
                      <Button
                        onClick={() => handleReview("rejected")}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 ml-2" />
                        رفض
                      </Button>
                    </div>
                  </>
                )}

                {selectedSubmission.status !== "pending" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الحالة: {getStatusBadge(selectedSubmission.status)}</p>
                    {selectedSubmission.admin_notes && (
                      <p className="mt-2">ملاحظات: {selectedSubmission.admin_notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSubmissionsPage;
