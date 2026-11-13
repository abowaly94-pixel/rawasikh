import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Users, UserCheck, ClipboardCheck, ShoppingCart, DollarSign, Eye,
  TicketPercent, Activity, TrendingUp, TrendingDown, Sparkles, Globe, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

type KPI = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  hint?: string;
};

/* Restrained brand palette: royal blue, gilded gold, ink and muted slate. */
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--gold))",
  "hsl(224 52% 62%)",
  "hsl(var(--ink))",
  "hsl(39 44% 64%)",
  "hsl(var(--muted-foreground))",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
};

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

const ChartHeading = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <CardHeader className="border-b border-border/70 bg-paper/60">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary ring-1 ring-inset ring-primary/10">
        {icon}
      </span>
      <div className="min-w-0">
        <CardTitle className="text-[16px] font-bold">{title}</CardTitle>
        <CardDescription className="text-[12.5px]">{description}</CardDescription>
      </div>
    </div>
  </CardHeader>
);

const PlatformStatsPage = () => {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [revenue30d, setRevenue30d] = useState<any[]>([]);
  const [signups30d, setSignups30d] = useState<any[]>([]);
  const [usersByRole, setUsersByRole] = useState<any[]>([]);
  const [contentMix, setContentMix] = useState<any[]>([]);
  const [salesMix, setSalesMix] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [activity7d, setActivity7d] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else if (userRole !== "admin") navigate("/dashboard");
      else fetchAll();
    }
  }, [user, userRole, authLoading]);

  const countAll = (table: string, filter?: (q: any) => any) => {
    let q: any = supabase.from(table as any).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    return q.then((r: any) => r.count || 0);
  };

  const fetchAll = async () => {
    try {
      const now = new Date();
      const d30 = subDays(now, 30).toISOString();
      const d60 = subDays(now, 60).toISOString();
      const d7 = subDays(now, 7).toISOString();

      const [
        totalUsers, students, teachers, parentsC, admins,
        totalCourses, publishedCourses, totalLessons,
        totalQuizzes1, totalQuizzes2, quizAttempts, examAttempts, schoolAttempts,
        totalSchools, totalClasses, totalSubjects,
        totalProducts, productOrders, coursePurchasesC,
        totalBlog, publishedBlog, blogComments, blogLikes,
        totalSessions, sessionEnroll, discountCodesC,
        purchasesData, ordersData, profilesData, blogViewsData,
        purchases30, purchases60_30, orders30, orders60_30,
        activityData, topBlogData, blogRawViews, visitStats,
      ] = await Promise.all([
        countAll("profiles"),
        countAll("user_roles", (q) => q.eq("role", "student")),
        countAll("user_roles", (q) => q.eq("role", "teacher")),
        countAll("user_roles", (q) => q.eq("role", "parent")),
        countAll("user_roles", (q) => q.eq("role", "admin")),
        countAll("courses"),
        countAll("courses", (q) => q.eq("is_published", true)),
        countAll("course_lessons"),
        countAll("course_quizzes"),
        countAll("subject_quizzes"),
        countAll("quiz_attempts"),
        countAll("exam_attempts"),
        countAll("school_assessment_attempts"),
        countAll("schools"),
        countAll("classes"),
        countAll("subjects"),
        countAll("products"),
        countAll("product_orders"),
        countAll("course_purchases", (q) => q.eq("payment_status", "completed")),
        countAll("blog_posts"),
        countAll("blog_posts", (q) => q.eq("is_published", true)),
        countAll("blog_post_comments"),
        countAll("blog_post_likes"),
        countAll("online_sessions"),
        countAll("session_enrollments"),
        countAll("discount_codes", (q) => q.eq("is_active", true)),
        supabase.from("course_purchases").select("amount_paid, purchased_at").eq("payment_status", "completed").gte("purchased_at", d30),
        supabase.from("product_orders").select("total_price, created_at").gte("created_at", d30),
        supabase.from("profiles").select("created_at").gte("created_at", d30),
        supabase.from("blog_posts").select("view_count"),
        supabase.from("course_purchases").select("amount_paid").eq("payment_status", "completed").gte("purchased_at", d30),
        supabase.from("course_purchases").select("amount_paid").eq("payment_status", "completed").gte("purchased_at", d60).lt("purchased_at", d30),
        supabase.from("product_orders").select("total_price").gte("created_at", d30),
        supabase.from("product_orders").select("total_price").gte("created_at", d60).lt("created_at", d30),
        supabase.from("activity_logs").select("created_at, action_type").gte("created_at", d7),
        supabase.from("blog_posts").select("id, title, view_count").eq("is_published", true).order("view_count", { ascending: false }).limit(5),
        supabase.from("blog_posts").select("view_count"),
        supabase.rpc("get_site_visit_stats", { days_back: 30 }),
      ]);

      const visitorsRow = (visitStats.data && visitStats.data[0]) || { unique_visitors: 0, total_views: 0 };

      const totalQuizzes = totalQuizzes1 + totalQuizzes2;
      const totalBlogViews = (blogRawViews.data || []).reduce((s: number, r: any) => s + Number(r.view_count || 0), 0);

      // 30-day revenue timeline
      const dayMap: Record<string, { date: string; "دورات تدريبية": number; منتجات: number; إجمالي: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        const key = format(d, "yyyy-MM-dd");
        dayMap[key] = { date: format(d, "d MMM", { locale: ar }), "دورات تدريبية": 0, منتجات: 0, إجمالي: 0 };
      }
      (purchasesData.data || []).forEach((p: any) => {
        const k = format(startOfDay(new Date(p.purchased_at)), "yyyy-MM-dd");
        if (dayMap[k]) { dayMap[k]["دورات تدريبية"] += Number(p.amount_paid || 0); dayMap[k].إجمالي += Number(p.amount_paid || 0); }
      });
      (ordersData.data || []).forEach((o: any) => {
        const k = format(startOfDay(new Date(o.created_at)), "yyyy-MM-dd");
        if (dayMap[k]) { dayMap[k].منتجات += Number(o.total_price || 0); dayMap[k].إجمالي += Number(o.total_price || 0); }
      });
      setRevenue30d(Object.values(dayMap));

      // Signups 30d
      const signMap: Record<string, { date: string; مستخدمين: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        signMap[format(d, "yyyy-MM-dd")] = { date: format(d, "d MMM", { locale: ar }), مستخدمين: 0 };
      }
      (profilesData.data || []).forEach((p: any) => {
        const k = format(startOfDay(new Date(p.created_at)), "yyyy-MM-dd");
        if (signMap[k]) signMap[k].مستخدمين += 1;
      });
      setSignups30d(Object.values(signMap));

      // Users by role
      setUsersByRole([
        { name: "طلاب", value: students, fill: CHART_COLORS[0] },
        { name: "معلمين", value: teachers, fill: CHART_COLORS[1] },
        { name: "أولياء أمور", value: parentsC, fill: CHART_COLORS[2] },
        { name: "مدراء", value: admins, fill: CHART_COLORS[3] },
      ]);

      // Content mix
      setContentMix([
        { name: "دورات تدريبية", value: totalCourses, fill: CHART_COLORS[0] },
        { name: "حصص تعليمية", value: totalLessons, fill: CHART_COLORS[1] },
        { name: "كويزات", value: totalQuizzes, fill: CHART_COLORS[2] },
        { name: "اختبارات", value: quizAttempts + examAttempts, fill: CHART_COLORS[3] },
        { name: "مقالات", value: totalBlog, fill: CHART_COLORS[4] },
        { name: "منتجات", value: totalProducts, fill: CHART_COLORS[5] },
      ]);

      // Sales mix
      setSalesMix([
        { name: "شراء دورات تدريبية", value: coursePurchasesC, fill: CHART_COLORS[0] },
        { name: "طلبات منتجات", value: productOrders, fill: CHART_COLORS[1] },
      ]);

      // Top posts
      setTopPosts(topBlogData.data || []);

      // Activity 7 days
      const actMap: Record<string, { date: string; نشاطات: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        actMap[format(d, "yyyy-MM-dd")] = { date: format(d, "EEE", { locale: ar }), نشاطات: 0 };
      }
      (activityData.data || []).forEach((a: any) => {
        const k = format(startOfDay(new Date(a.created_at)), "yyyy-MM-dd");
        if (actMap[k]) actMap[k].نشاطات += 1;
      });
      setActivity7d(Object.values(actMap));

      // Engagement radial
      const maxE = Math.max(totalBlogViews, blogLikes, blogComments, 1);
      setEngagement([
        { name: "مشاهدات", value: totalBlogViews, fill: CHART_COLORS[0] },
        { name: "إعجابات", value: blogLikes, fill: CHART_COLORS[4] },
        { name: "تعليقات", value: blogComments, fill: CHART_COLORS[2] },
      ]);

      // KPIs with 30d vs previous 30d trend
      const rev30 = (purchases30.data || []).reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0) +
                    (orders30.data || []).reduce((s: number, r: any) => s + Number(r.total_price || 0), 0);
      const revPrev = (purchases60_30.data || []).reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0) +
                      (orders60_30.data || []).reduce((s: number, r: any) => s + Number(r.total_price || 0), 0);
      const revTrend = revPrev === 0 ? (rev30 > 0 ? 100 : 0) : Math.round(((rev30 - revPrev) / revPrev) * 100);

      const totalRevenue = (purchasesData.data || []).reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0) +
                           (ordersData.data || []).reduce((s: number, r: any) => s + Number(r.total_price || 0), 0);

      setKpis([
        { label: "زوار الموقع", value: Number(visitorsRow.unique_visitors), icon: <Globe className="h-5 w-5" />, hint: `${Number(visitorsRow.total_views).toLocaleString()} مشاهدة صفحة — آخر 30 يوم` },
        { label: "إيرادات آخر 30 يوم", value: `${rev30.toLocaleString()} ج.م`, icon: <DollarSign className="h-5 w-5" />, trend: revTrend, hint: "مقارنة بالـ 30 يوم السابقة" },
        { label: "إجمالي المستخدمين", value: totalUsers, icon: <Users className="h-5 w-5" />, hint: `${(profilesData.data || []).length} مستخدم جديد` },
        { label: "المبيعات النشطة", value: coursePurchasesC + productOrders, icon: <ShoppingCart className="h-5 w-5" />, hint: `${coursePurchasesC} دورة تدريبية + ${productOrders} منتج` },
        { label: "محتوى المنصة", value: totalCourses + totalLessons + totalBlog, icon: <Sparkles className="h-5 w-5" />, hint: `${totalCourses} دورة تدريبية + ${totalLessons} حصة` },
        { label: "مشاهدات المدونة", value: totalBlogViews, icon: <Eye className="h-5 w-5" />, hint: `${publishedBlog} مقال منشور` },
        { label: "محاولات الاختبارات", value: quizAttempts + examAttempts + schoolAttempts, icon: <ClipboardCheck className="h-5 w-5" />, hint: "كل الاختبارات والكويزات" },
        { label: "أكواد خصم نشطة", value: discountCodesC, icon: <TicketPercent className="h-5 w-5" />, hint: "متاحة للاستخدام حالياً" },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير"}>
      <div className="space-y-6">
        {/* Header */}
        <section className="panel-ink p-6 md:p-7">
          <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
          <div
            className="pointer-events-none absolute -top-24 -start-16 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "hsl(var(--gold) / 0.14)" }}
            aria-hidden
          />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-white/[0.06] text-gold">
              <BarChart3 className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">إحصائيات المنصة</h1>
              <div className="divider-gold mt-3 h-px w-28" aria-hidden />
              <p className="mt-3 text-sm text-white/70 md:text-base">نظرة تفاعلية شاملة على أداء المنصة</p>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <article key={k.label} className="surface-card group p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary ring-1 ring-inset ring-primary/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  {k.icon}
                </span>
                {typeof k.trend === "number" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
                      k.trend >= 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {k.trend >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                    {Math.abs(k.trend)}%
                  </span>
                )}
              </div>
              <div className="nums mt-4 text-2xl font-bold text-foreground md:text-3xl">
                {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-foreground/85">{k.label}</div>
              {k.hint && <div className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{k.hint}</div>}
            </article>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card className="overflow-hidden">
          <ChartHeading
            icon={<DollarSign className="h-5 w-5" aria-hidden />}
            title="الإيرادات — آخر 30 يوم"
            description="الدورات التدريبية والمنتجات يومياً"
          />
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenue30d}>
                <defs>
                  <linearGradient id="revCourses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revProducts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                <XAxis dataKey="date" tick={AXIS_TICK} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="دورات تدريبية" stroke={CHART_COLORS[0]} fill="url(#revCourses)" strokeWidth={2} />
                <Area type="monotone" dataKey="منتجات" stroke={CHART_COLORS[1]} fill="url(#revProducts)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2-column charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Signups */}
          <Card className="overflow-hidden">
            <ChartHeading
              icon={<Users className="h-5 w-5" aria-hidden />}
              title="المستخدمين الجدد"
              description="آخر 30 يوم"
            />
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={signups30d}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis dataKey="date" tick={AXIS_TICK} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }} />
                  <Line type="monotone" dataKey="مستخدمين" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Users by role Pie */}
          <Card className="overflow-hidden">
            <ChartHeading
              icon={<UserCheck className="h-5 w-5" aria-hidden />}
              title="توزيع المستخدمين"
              description="حسب الدور"
            />
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={usersByRole}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {usersByRole.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Content mix bars */}
          <Card className="overflow-hidden">
            <ChartHeading
              icon={<Sparkles className="h-5 w-5" aria-hidden />}
              title="محتوى المنصة"
              description="عدد العناصر في كل قسم"
            />
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={contentMix} layout="vertical">
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} opacity={0.6} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={110} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {contentMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity 7d */}
          <Card className="overflow-hidden">
            <ChartHeading
              icon={<Activity className="h-5 w-5" aria-hidden />}
              title="نشاط المنصة"
              description="آخر 7 أيام"
            />
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activity7d}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
                  <Bar dataKey="نشاطات" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top posts + Sales mix */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top posts */}
          <Card className="overflow-hidden lg:col-span-2">
            <ChartHeading
              icon={<Eye className="h-5 w-5" aria-hidden />}
              title="الأكثر مشاهدة"
              description="أعلى 5 مقالات"
            />
            <CardContent className="space-y-4 pt-6">
              {topPosts.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">لا توجد بيانات بعد</p>
              ) : topPosts.map((p, i) => {
                const max = Math.max(...topPosts.map((x) => x.view_count || 0), 1);
                const pct = ((p.view_count || 0) / max) * 100;
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                            i === 0
                              ? "bg-gold/15 text-gold-strong ring-1 ring-inset ring-gold/30"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </div>
                        <span className="truncate font-medium text-foreground">{p.title}</span>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" aria-hidden /> {(p.view_count || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Sales mix radial */}
          <Card className="overflow-hidden">
            <ChartHeading
              icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
              title="توزيع المبيعات"
              description="دورات تدريبية vs منتجات"
            />
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={salesMix} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={10}>
                    {salesMix.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlatformStatsPage;
