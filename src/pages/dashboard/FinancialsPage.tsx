import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
  BellRing,
} from "lucide-react";
import WhatsAppContactButton from "@/components/WhatsAppContactButton";

interface StudentOption {
  user_id: string;
  full_name: string;
  whatsapp?: string | null;
  country_code?: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

interface Payment {
  id: string;
  plan_id: string;
  amount: number;
  paid_at: string;
  channel: string;
  reference: string | null;
  notes: string | null;
  source: string;
}

interface Plan {
  id: string;
  student_id: string;
  course_id: string;
  total_amount: number;
  notes: string | null;
  next_due_date: string | null;
  student_name?: string;
  student_whatsapp?: string | null;
  student_country_code?: string | null;
  course_title?: string;
  paid?: number;
}

type FilterKey = "all" | "outstanding" | "overdue" | "due_soon" | "unpaid";

const channelLabels: Record<string, string> = {
  site: "عبر الموقع",
  cash: "كاش",
  bank_transfer: "تحويل بنكي",
  vodafone_cash: "فودافون كاش",
  instapay: "InstaPay",
  other: "أخرى",
};

const emptyPlanForm = { studentId: "", courseId: "", totalAmount: "", paidAmount: "", notes: "", nextDueDate: "" };
const emptyPaymentForm = { amount: "", paidAt: new Date().toISOString().slice(0, 10), channel: "cash", reference: "", notes: "" };

const FinancialsPage = () => {
  const { user, profile, userRole, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [savingPlan, setSavingPlan] = useState(false);

  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !hasPermission("financials"))) navigate("/dashboard");
  }, [user, userRole, loading, navigate, hasPermission]);

  const fetchAll = async () => {
    setFetching(true);
    try {
      const [{ data: studentsData }, { data: coursesData }, { data: plansData }, { data: paymentsData }] =
        await Promise.all([
          supabase.from("students").select("user_id").not("user_id", "is", null),
          supabase.from("courses").select("id, title").order("title"),
          supabase.from("course_payment_plans").select("*").order("created_at", { ascending: false }),
          supabase.from("course_payments").select("*").order("paid_at", { ascending: false }),
        ]);

      const userIds = [...new Set((studentsData || []).map((s) => s.user_id).filter(Boolean))] as string[];
      const { data: profilesData } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, whatsapp, phone, country_code").in("id", userIds)
        : { data: [] };

      const studentOptions: StudentOption[] = userIds.map((uid) => {
        const p = profilesData?.find((pr: any) => pr.id === uid) as any;
        return {
          user_id: uid,
          full_name: p?.full_name || "طالب",
          whatsapp: p?.whatsapp || p?.phone || null,
          country_code: p?.country_code || null,
        };
      });
      setStudents(studentOptions);
      setCourses((coursesData as CourseOption[]) || []);

      const paymentsByPlan: Record<string, Payment[]> = {};
      (paymentsData || []).forEach((p: any) => {
        if (!paymentsByPlan[p.plan_id]) paymentsByPlan[p.plan_id] = [];
        paymentsByPlan[p.plan_id].push(p);
      });
      setPayments(paymentsByPlan);

      const plansWithDetails: Plan[] = (plansData || []).map((p: any) => {
        const st = studentOptions.find((s) => s.user_id === p.student_id);
        return {
          ...p,
          student_name: st?.full_name || "طالب",
          student_whatsapp: st?.whatsapp || null,
          student_country_code: st?.country_code || null,
          course_title: coursesData?.find((c: any) => c.id === p.course_id)?.title || "دورة تدريبية",
          paid: (paymentsByPlan[p.id] || []).reduce((sum, x) => sum + Number(x.amount), 0),
        };
      });
      setPlans(plansWithDetails);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => new Date(new Date().toDateString()), []);
  const soon = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  const remainingOf = (p: Plan) => Number(p.total_amount) - (p.paid || 0);

  const isOverdue = (p: Plan) => !!p.next_due_date && remainingOf(p) > 0 && new Date(p.next_due_date) < today;
  const isDueSoon = (p: Plan) =>
    !!p.next_due_date && remainingOf(p) > 0 && new Date(p.next_due_date) >= today && new Date(p.next_due_date) <= soon;
  const isUnpaid = (p: Plan) => (p.paid || 0) === 0 && Number(p.total_amount) > 0;
  const isOutstanding = (p: Plan) => remainingOf(p) > 0;

  const counts = useMemo(
    () => ({
      all: plans.length,
      outstanding: plans.filter(isOutstanding).length,
      overdue: plans.filter(isOverdue).length,
      due_soon: plans.filter(isDueSoon).length,
      unpaid: plans.filter(isUnpaid).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans]
  );

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = plans;
    if (filter === "outstanding") list = list.filter(isOutstanding);
    else if (filter === "overdue") list = list.filter(isOverdue);
    else if (filter === "due_soon") list = list.filter(isDueSoon);
    else if (filter === "unpaid") list = list.filter(isUnpaid);
    if (!q) return list;
    return list.filter(
      (p) => (p.student_name || "").toLowerCase().includes(q) || (p.course_title || "").toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, search, filter]);

  const totals = useMemo(() => {
    const totalAgreed = plans.reduce((sum, p) => sum + Number(p.total_amount), 0);
    const totalPaid = plans.reduce((sum, p) => sum + (p.paid || 0), 0);
    // Clamp each plan at 0 before summing: a student who overpaid one plan
    // (remainingOf < 0) must not silently cancel out what other students
    // still genuinely owe. See remainingOf() for the per-plan figure that
    // can go negative on overpayment.
    const totalRemaining = plans.reduce((sum, p) => sum + Math.max(0, remainingOf(p)), 0);
    return { totalAgreed, totalPaid, totalRemaining };
  }, [plans]);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
    setPlanOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      studentId: plan.student_id,
      courseId: plan.course_id,
      totalAmount: String(plan.total_amount),
      paidAmount: "",
      notes: plan.notes || "",
      nextDueDate: plan.next_due_date || "",
    });
    setPlanOpen(true);
  };

  const savePlan = async () => {
    if (!planForm.studentId || !planForm.courseId || !planForm.totalAmount) {
      toast({ title: "بيانات ناقصة", description: "اختر الطالب والدورة التدريبية والمبلغ الإجمالي", variant: "destructive" });
      return;
    }
    setSavingPlan(true);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("course_payment_plans")
          .update({
            total_amount: Number(planForm.totalAmount),
            notes: planForm.notes.trim() || null,
            next_due_date: planForm.nextDueDate || null,
            // if the due date changed, clear the "reminder already sent" marker so a new reminder can fire
            last_reminder_sent_date:
              planForm.nextDueDate !== (editingPlan.next_due_date || "") ? null : undefined,
          })
          .eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        // The DB only allows ONE payment plan per (student, course) pair
        // (UNIQUE constraint) — the upsert below silently merges into an
        // existing plan for that pair instead of creating a visibly-new
        // one, which was confusing admins into thinking their new plan had
        // vanished. Detect that case up front and say so clearly.
        const { data: existingPlan } = await supabase
          .from("course_payment_plans")
          .select("id")
          .eq("student_id", planForm.studentId)
          .eq("course_id", planForm.courseId)
          .maybeSingle();

        if (existingPlan) {
          toast({
            title: "الخطة دي موجودة بالفعل",
            description:
              "الطالب/ة ده عنده خطة دفع مسجلة بالفعل على نفس الدورة التدريبية، مش هتتضاف خطة جديدة منفصلة — البيانات هتتحدّث في نفس الخطة القديمة لأن النظام بيسمح بخطة واحدة بس لكل طالب في كل دورة تدريبية.",
          });
        }

        const { data: inserted, error } = await supabase
          .from("course_payment_plans")
          .upsert(
            {
              student_id: planForm.studentId,
              course_id: planForm.courseId,
              total_amount: Number(planForm.totalAmount),
              notes: planForm.notes.trim() || null,
              next_due_date: planForm.nextDueDate || null,
              created_by: user!.id,
            },
            { onConflict: "student_id,course_id" }
          )
          .select("id")
          .single();
        if (error) throw error;

        const paidNow = Number(planForm.paidAmount) || 0;
        if (paidNow > 0 && inserted) {
          const { error: paymentError } = await supabase.from("course_payments").insert({
            plan_id: inserted.id,
            amount: paidNow,
            paid_at: new Date().toISOString().slice(0, 10),
            channel: "cash",
            source: "manual",
            recorded_by: user!.id,
          });
          if (paymentError) throw paymentError;
        }
      }
      toast({ title: "تم الحفظ" });
      setPlanOpen(false);
      fetchAll();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("حذف خطة الدفع دي وكل سجل المدفوعات المرتبط بيها؟")) return;
    const { error } = await supabase.from("course_payment_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    fetchAll();
  };

  const addPayment = async () => {
    if (!detailsPlan || !paymentForm.amount) {
      toast({ title: "بيانات ناقصة", description: "أدخل مبلغ الدفعة", variant: "destructive" });
      return;
    }
    setSavingPayment(true);
    const { error } = await supabase.from("course_payments").insert({
      plan_id: detailsPlan.id,
      amount: Number(paymentForm.amount),
      paid_at: paymentForm.paidAt,
      channel: paymentForm.channel,
      reference: paymentForm.reference.trim() || null,
      notes: paymentForm.notes.trim() || null,
      source: "manual",
      recorded_by: user!.id,
    });
    setSavingPayment(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم تسجيل الدفعة" });
    setPaymentForm(emptyPaymentForm);
    fetchAll();
    // keep dialog open, refresh detailsPlan reference after refetch
  };

  const deletePayment = async (id: string) => {
    if (!confirm("حذف هذه الدفعة؟")) return;
    const { error } = await supabase.from("course_payments").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    fetchAll();
  };

  // Keep the details dialog in sync with fresh data after any change
  useEffect(() => {
    if (detailsPlan) {
      const fresh = plans.find((p) => p.id === detailsPlan.id);
      if (fresh) setDetailsPlan(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              الماليات
            </h1>
            <p className="text-muted-foreground">
              متابعة مدفوعات كل طالب لكل دورة تدريبية، سواء دفع من خلال الموقع أو دفع نقدي/تحويل تم تسجيله يدوياً
            </p>
          </div>
          <Button onClick={openNewPlan} className="gap-2">
            <Plus className="h-4 w-4" />
            خطة دفع جديدة
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المتفق عليه</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalAgreed.toLocaleString()} ج.م</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المحصّل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totals.totalPaid.toLocaleString()} ج.م</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المتبقي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totals.totalRemaining.toLocaleString()} ج.م</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث باسم الطالب أو الدورة التدريبية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "الكل", count: counts.all },
                { key: "outstanding", label: "عليهم متبقي", count: counts.outstanding },
                { key: "overdue", label: "متأخرين", count: counts.overdue },
                { key: "due_soon", label: "مستحق قريبًا", count: counts.due_soon },
                { key: "unpaid", label: "لسه مدفعوش", count: counts.unpaid },
              ] as { key: FilterKey; label: string; count: number }[]
            ).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
                className="gap-1"
              >
                {f.label}
                <Badge variant="secondary" className="text-xs">{f.count}</Badge>
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">خطط الدفع ({filteredPlans.length})</CardTitle>
            <CardDescription>اضغط على أي صف لعرض سجل المدفوعات وإضافة دفعة جديدة</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد خطط دفع بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطالب</TableHead>
                    <TableHead>الدورة التدريبية</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>المدفوع</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>القسط القادم</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((p) => {
                    const remaining = Number(p.total_amount) - (p.paid || 0);
                    const isSettled = remaining <= 0;
                    const overdue = isOverdue(p);
                    const dueSoon = isDueSoon(p);
                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailsPlan(p)}>
                        <TableCell className="font-medium">{p.student_name}</TableCell>
                        <TableCell>{p.course_title}</TableCell>
                        <TableCell>{Number(p.total_amount).toLocaleString()} ج.م</TableCell>
                        <TableCell className="text-green-600">{(p.paid || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell
                          className={
                            remaining > 0
                              ? "text-destructive font-medium"
                              : remaining < 0
                              ? "text-blue-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {remaining < 0
                            ? `دفع زيادة ${Math.abs(remaining).toLocaleString()} ج.م`
                            : `${remaining.toLocaleString()} ج.م`}
                        </TableCell>
                        <TableCell>
                          {p.next_due_date ? (
                            <Badge
                              variant={overdue ? "destructive" : dueSoon ? "secondary" : "outline"}
                              className="gap-1 whitespace-nowrap"
                            >
                              {overdue ? <BellRing className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {new Date(p.next_due_date).toLocaleDateString("ar-EG")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const planPayments = payments[p.id] || [];
                            if (planPayments.length === 0) {
                              return <span className="text-xs text-muted-foreground">—</span>;
                            }
                            const hasSite = planPayments.some((pay) => pay.source === "site");
                            const hasManual = planPayments.some((pay) => pay.source !== "site");
                            if (hasSite && hasManual) {
                              return <Badge variant="outline" className="whitespace-nowrap">أونلاين + يدوي</Badge>;
                            }
                            if (hasSite) {
                              return <Badge variant="secondary" className="whitespace-nowrap">دفع عبر الموقع</Badge>;
                            }
                            return <Badge variant="outline" className="whitespace-nowrap">تسجيل يدوي</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>
                          {isSettled ? (
                            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> مكتمل</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> متبقي</Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <WhatsAppContactButton
                              phone={p.student_whatsapp}
                              countryDial={p.student_country_code}
                              message={
                                remaining > 0
                                  ? `مرحباً ${p.student_name}، تذكير بخصوص باقي قسط دورة "${p.course_title}" التدريبية (المتبقي ${remaining.toLocaleString()} ج.م).`
                                  : undefined
                              }
                            />
                            <Button size="icon" variant="ghost" onClick={() => openEditPlan(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deletePlan(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* Create / edit plan */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "تعديل خطة الدفع" : "خطة دفع جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الطالب *</Label>
              <SearchableSelect
                value={planForm.studentId}
                onValueChange={(v) => setPlanForm({ ...planForm, studentId: v })}
                options={students.map((s) => ({ value: s.user_id, label: s.full_name }))}
                placeholder="اختر الطالب"
                searchPlaceholder="ابحثي بالاسم..."
                emptyText="لا يوجد طلاب مطابقين"
                disabled={!!editingPlan}
              />
            </div>
            <div className="space-y-2">
              <Label>الدورة التدريبية *</Label>
              <SearchableSelect
                value={planForm.courseId}
                onValueChange={(v) => setPlanForm({ ...planForm, courseId: v })}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                placeholder="اختر الدورة التدريبية"
                searchPlaceholder="ابحثي باسم الدورة التدريبية..."
                emptyText="لا توجد دورات تدريبية مطابقة"
                disabled={!!editingPlan}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ الإجمالي المتفق عليه *</Label>
                <Input
                  type="number"
                  min={0}
                  value={planForm.totalAmount}
                  onChange={(e) => setPlanForm({ ...planForm, totalAmount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{editingPlan ? "المدفوع حتى الآن" : "تم دفعه (اختياري)"}</Label>
                {editingPlan ? (
                  <Input type="number" value={editingPlan.paid || 0} disabled className="bg-muted" />
                ) : (
                  <Input
                    type="number"
                    min={0}
                    value={planForm.paidAmount}
                    onChange={(e) => setPlanForm({ ...planForm, paidAmount: e.target.value })}
                    placeholder="0"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>المتبقي</Label>
              <Input
                type="text"
                disabled
                className="bg-muted font-bold"
                value={(
                  (Number(planForm.totalAmount) || 0) -
                  (editingPlan ? (editingPlan.paid || 0) : (Number(planForm.paidAmount) || 0))
                ).toLocaleString("ar-EG")}
              />
            </div>
            <div className="space-y-2">
              <Label>موعد استحقاق القسط القادم (اختياري)</Label>
              <Input
                type="date"
                value={planForm.nextDueDate}
                onChange={(e) => setPlanForm({ ...planForm, nextDueDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                هيوصلك إشعار في الموقع لما الموعد ده ييجي، طول ما لسه في مبلغ متبقي
              </p>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)} disabled={savingPlan}>
              إلغاء
            </Button>
            <Button onClick={savePlan} disabled={savingPlan}>
              {savingPlan ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment history + add payment */}
      <Dialog open={!!detailsPlan} onOpenChange={(o) => !o && setDetailsPlan(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              سجل مدفوعات {detailsPlan?.student_name} — {detailsPlan?.course_title}
            </DialogTitle>
          </DialogHeader>

          {detailsPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="font-bold">{Number(detailsPlan.total_amount).toLocaleString()} ج.م</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="font-bold text-green-600">{(detailsPlan.paid || 0).toLocaleString()} ج.م</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className="font-bold text-destructive">
                    {(Number(detailsPlan.total_amount) - (detailsPlan.paid || 0)).toLocaleString()} ج.م
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm shrink-0">موعد القسط القادم:</Label>
                <Input
                  type="date"
                  className="h-8 max-w-[160px]"
                  defaultValue={detailsPlan.next_due_date || ""}
                  onBlur={async (e) => {
                    const value = e.target.value || null;
                    if (value === detailsPlan.next_due_date) return;
                    const { error } = await supabase
                      .from("course_payment_plans")
                      .update({ next_due_date: value, last_reminder_sent_date: null })
                      .eq("id", detailsPlan.id);
                    if (error) {
                      toast({ title: "خطأ", description: error.message, variant: "destructive" });
                      return;
                    }
                    fetchAll();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">سجل الدفعات</Label>
                {(payments[detailsPlan.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد دفعات مسجلة بعد</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {(payments[detailsPlan.id] || []).map((pay) => (
                      <div key={pay.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-background text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{Number(pay.amount).toLocaleString()} ج.م</span>
                            <Badge variant="outline" className="text-xs">{channelLabels[pay.channel] || pay.channel}</Badge>
                            {pay.source === "site" && <Badge variant="secondary" className="text-xs">تلقائي (الموقع)</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pay.paid_at).toLocaleDateString("ar-EG")}
                            {pay.reference ? ` • ${pay.reference}` : ""}
                          </p>
                          {pay.notes && <p className="text-xs text-muted-foreground">{pay.notes}</p>}
                        </div>
                        {pay.source === "manual" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => deletePayment(pay.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">إضافة دفعة جديدة</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">المبلغ *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">التاريخ</Label>
                    <Input
                      type="date"
                      value={paymentForm.paidAt}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">طريقة الدفع</Label>
                    <Select
                      value={paymentForm.channel}
                      onValueChange={(v) => setPaymentForm({ ...paymentForm, channel: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">كاش</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                        <SelectItem value="instapay">InstaPay</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">مرجع (اختياري)</Label>
                    <Input
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="رقم إيصال مثلاً"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ملاحظات (اختياري)</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={addPayment} disabled={savingPayment} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  {savingPayment ? "جاري الحفظ..." : "تسجيل الدفعة"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinancialsPage;
