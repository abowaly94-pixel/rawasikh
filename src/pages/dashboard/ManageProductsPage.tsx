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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ShoppingCart, ImageIcon, ClipboardList, Check, X, Package, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

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

const ManageProductsPage = () => {
  const { user, userRole, profile, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [stockQuantity, setStockQuantity] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else if (!(userRole === "admin" || hasPermission("products"))) navigate("/dashboard");
      else {
        fetchProducts();
        fetchOrders();
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch {
      toast.error("خطأ في تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, products(name, image_url), profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch {
      toast.error("خطأ في تحميل الطلبات");
    } finally {
      setOrdersLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(0); setImageUrl("");
    setCategory(""); setStockQuantity(0); setIsActive(true); setEditingProduct(null);
  };

  const openEditDialog = (p: Product) => {
    setEditingProduct(p); setName(p.name); setDescription(p.description || "");
    setPrice(p.price); setImageUrl(p.image_url || ""); setCategory(p.category || "");
    setStockQuantity(p.stock_quantity); setIsActive(p.is_active); setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المنتج"); return; }
    try {
      const productData = {
        name: name.trim(), description: description.trim() || null, price,
        image_url: imageUrl.trim() || null, category: category.trim() || null,
        stock_quantity: stockQuantity, is_active: isActive,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("تم تحديث المنتج بنجاح");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast.success("تم إضافة المنتج بنجاح");
      }
      setDialogOpen(false); resetForm(); fetchProducts();
    } catch (error: any) {
      toast.error("حدث خطأ: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم حذف المنتج بنجاح"); fetchProducts();
    } catch (error: any) {
      toast.error("حدث خطأ في الحذف: " + error.message);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("product_orders")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("تم تحديث حالة الطلب"); fetchOrders();
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

  const pendingOrdersCount = orders.filter(o => o.status === "pending").length;

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">المنتجات</h1>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              إدارة المنتجات
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              الطلبات
              {pendingOrdersCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[20px] h-5">
                  {pendingOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة منتج جديد</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>اسم المنتج *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: كتاب الرياضيات" />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المنتج..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>السعر *</Label>
                        <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} min={0} step="0.01" />
                      </div>
                      <div className="space-y-2">
                        <Label>الكمية المتاحة *</Label>
                        <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)} min={0} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>التصنيف</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: كتب، أدوات..." />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الصورة</Label>
                      <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                      <Label>المنتج متاح للبيع</Label>
                    </div>
                    <Button onClick={handleSubmit} className="w-full">{editingProduct ? "تحديث" : "إضافة"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader><CardTitle>قائمة المنتجات</CardTitle></CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد منتجات بعد</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصورة</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>التصنيف</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.category || "-"}</TableCell>
                          <TableCell>{p.price} ج.م</TableCell>
                          <TableCell>{p.stock_quantity}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${p.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {p.is_active ? "متاح" : "غير متاح"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(p)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>جميع الطلبات</CardTitle></CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : orders.length === 0 ? (
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
                            <TableCell>{new Date(order.created_at).toLocaleDateString("ar-EG")}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {order.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "approved")}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, "rejected")}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {order.status === "approved" && (
                                  <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "shipped")}>شحن</Button>
                                )}
                                {order.status === "shipped" && (
                                  <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "delivered")}>تم التوصيل</Button>
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
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
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
                      <Button onClick={() => { updateOrderStatus(selectedOrder.id, "approved"); setSelectedOrder(null); }} className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 ml-1" /> قبول
                      </Button>
                      <Button variant="destructive" onClick={() => { updateOrderStatus(selectedOrder.id, "rejected"); setSelectedOrder(null); }}>
                        <X className="h-4 w-4 ml-1" /> رفض
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "approved" && (
                    <Button onClick={() => { updateOrderStatus(selectedOrder.id, "shipped"); setSelectedOrder(null); }}>شحن</Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button onClick={() => { updateOrderStatus(selectedOrder.id, "delivered"); setSelectedOrder(null); }}>تم التوصيل</Button>
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

export default ManageProductsPage;
