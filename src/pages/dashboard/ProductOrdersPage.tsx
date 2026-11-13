import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Check, X, Eye } from "lucide-react";


interface Order {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  shipping_address: string | null;
  phone: string | null;
  notes: string | null;
  payment_receipt_url: string | null;
  created_at: string;
  user_id: string;
  product_id: string;
  products: { name: string; image_url: string | null } | null;
  profiles: { full_name: string; email: string | null } | null;
}


const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  approved: { label: "تمت الموافقة", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
  shipped: { label: "تم الشحن", variant: "outline" },
  delivered: { label: "تم التوصيل", variant: "default" },
};

const ProductOrdersPage = () => {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);


  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else if (userRole !== "admin") navigate("/dashboard");
      else fetchOrders();
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, products(name, image_url), profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("product_orders")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("تم تحديث حالة الطلب");
      fetchOrders();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
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
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">طلبات المنتجات</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>جميع الطلبات</CardTitle></CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإيصال</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>

                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const s = statusMap[order.status] || { label: order.status, variant: "outline" as const };
                    return (
                      <TableRow key={order.id}>
                        <TableCell>{(order.profiles as any)?.full_name || "غير معروف"}</TableCell>
                        <TableCell>{(order.products as any)?.name || "منتج محذوف"}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.total_price} ج.م</TableCell>
                        <TableCell className="max-w-[150px] truncate">{order.shipping_address || "-"}</TableCell>
                        <TableCell>{order.phone || "-"}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        <TableCell>
                          {order.payment_receipt_url ? (
                            <a href={order.payment_receipt_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                              عرض الإيصال
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString("ar-EG")}</TableCell>

                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "approved")}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => updateStatus(order.id, "rejected")}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {order.status === "approved" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "shipped")}>شحن</Button>
                            )}
                            {order.status === "shipped" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "delivered")}>تم التوصيل</Button>
                            )}
                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">العميل</p>
                    <p className="font-medium">{(selectedOrder.profiles as any)?.full_name || "غير معروف"}</p>
                    <p className="text-xs text-muted-foreground">{(selectedOrder.profiles as any)?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الحالة</p>
                    <Badge variant={(statusMap[selectedOrder.status] || { variant: "outline" as const }).variant}>
                      {(statusMap[selectedOrder.status] || { label: selectedOrder.status }).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المنتج</p>
                    <p className="font-medium">{(selectedOrder.products as any)?.name || "منتج محذوف"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الكمية</p>
                    <p className="font-medium">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الإجمالي</p>
                    <p className="font-medium">{selectedOrder.total_price} ج.م</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">التاريخ</p>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString("ar-EG")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الهاتف</p>
                    <p className="font-medium">{selectedOrder.phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">عنوان الشحن</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedOrder.shipping_address || "-"}</p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">ملاحظات</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                {(selectedOrder.products as any)?.image_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">صورة المنتج</p>
                    <img src={(selectedOrder.products as any).image_url} alt="" className="max-h-48 rounded-lg border object-contain" />
                  </div>
                )}

                {selectedOrder.payment_receipt_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">إيصال التحويل</p>
                    <a href={selectedOrder.payment_receipt_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedOrder.payment_receipt_url}
                        alt="إيصال التحويل"
                        className="max-h-96 rounded-lg border object-contain cursor-zoom-in"
                        onError={(e) => { (e.currentTarget.style.display = "none"); }}
                      />
                    </a>
                    <a href={selectedOrder.payment_receipt_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm mt-2 inline-block">
                      فتح الإيصال في نافذة جديدة
                    </a>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  {selectedOrder.status === "pending" && (
                    <>
                      <Button onClick={() => { updateStatus(selectedOrder.id, "approved"); setSelectedOrder(null); }} className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 ml-1" /> قبول
                      </Button>
                      <Button variant="destructive" onClick={() => { updateStatus(selectedOrder.id, "rejected"); setSelectedOrder(null); }}>
                        <X className="h-4 w-4 ml-1" /> رفض
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "approved" && (
                    <Button onClick={() => { updateStatus(selectedOrder.id, "shipped"); setSelectedOrder(null); }}>شحن</Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button onClick={() => { updateStatus(selectedOrder.id, "delivered"); setSelectedOrder(null); }}>تم التوصيل</Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ProductOrdersPage;

