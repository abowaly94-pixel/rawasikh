import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlatformStatsPage from "./dashboard/PlatformStatsPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, GraduationCap, Calendar, School, ClipboardCheck, Activity, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActionTypeLabel, getActionTypeIcon } from "@/lib/activityLogger";
import { cn } from "@/lib/utils";

interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  schools: number;
  activeAssessments: number;
  todayLessons: number;
}

interface RecentLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user_name: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user, userRole, profile, loading, isDemo } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    students: 0, teachers: 0, classes: 0, schools: 0, activeAssessments: 0, todayLessons: 0,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole === "school") {
      navigate("/school");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole && !isDemo) {
      fetchDashboardData();
    } else if (isDemo) {
      // Set demo data
      setStats({
        students: 45,
        teachers: 8,
        classes: 6,
        schools: 3,
        activeAssessments: 12,
        todayLessons: 4,
      });
      setRecentLogs([
        { id: "1", action_type: "student_enrolled", description: "تسجيل طالب جديد في الصف الأول", created_at: new Date().toISOString(), user_name: "مدير تجريبي" },
        { id: "2", action_type: "assessment_created", description: "إنشاء اختبار تقييم مستوى الرياضيات", created_at: new Date(Date.now() - 3600000).toISOString(), user_name: "معلم تجريبي" },
        { id: "3", action_type: "attendance_recorded", description: "تسجيل حضور الحصة الثانية", created_at: new Date(Date.now() - 7200000).toISOString(), user_name: "معلم تجريبي" },
      ]);
      setStatsLoading(false);
    }
  }, [user, userRole, isDemo]);

  // Latest in-app notifications + unread count, refreshed live.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsLoading(false);
      return;
    }

    let active = true;

    const fetchNotifications = async () => {
      const [listRes, countRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, body, link, read_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null),
      ]);
      if (!active) return;
      setNotifications((listRes.data as NotificationItem[]) || []);
      setUnreadCount(countRes.count || 0);
      setNotificationsLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`dashboard-notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllNotificationsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.read_at) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notification.link) navigate(notification.link);
  };

  const fetchDashboardData = async () => {
    try {
      if (userRole === "admin") {
        const [studentsRes, teachersRes, classesRes, schoolsRes, assessmentsRes] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
          supabase.from("classes").select("id", { count: "exact", head: true }),
          supabase.from("schools").select("id", { count: "exact", head: true }),
          supabase.from("school_level_assessments").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        setStats({
          students: studentsRes.count || 0,
          teachers: teachersRes.count || 0,
          classes: classesRes.count || 0,
          schools: schoolsRes.count || 0,
          activeAssessments: assessmentsRes.count || 0,
          todayLessons: 0,
        });

        // Fetch recent activity logs (admin sees all)
        const { data: logsData } = await supabase
          .from("activity_logs")
          .select("id, action_type, description, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(10);

        if (logsData && logsData.length > 0) {
          const userIds = [...new Set(logsData.map(l => l.user_id))];
          const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
          setRecentLogs(logsData.map(l => ({
            id: l.id, action_type: l.action_type, description: l.description,
            created_at: l.created_at, user_name: profileMap.get(l.user_id) || "غير محدد",
          })));
        }
      } else if (userRole === "teacher") {
        const [classesRes, sessionsRes] = await Promise.all([
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", user!.id),
          supabase.from("online_sessions").select("id", { count: "exact", head: true }).eq("teacher_id", user!.id),
        ]);
        setStats(prev => ({ ...prev, classes: classesRes.count || 0, todayLessons: sessionsRes.count || 0 }));
      } else if (userRole === "student") {
        const { data: student } = await supabase.from("students").select("id, school_id, class_id").eq("user_id", user!.id).maybeSingle();
        if (student) {
          const [attemptsRes] = await Promise.all([
            supabase.from("school_assessment_attempts").select("id", { count: "exact", head: true }).eq("student_id", student.id),
          ]);
          setStats(prev => ({ ...prev, activeAssessments: attemptsRes.count || 0 }));
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Admin sees the full platform stats dashboard as the main view
  if (userRole === "admin") {
    return <PlatformStatsPage />;
  }

  const getStatsForRole = () => {
    if (userRole === "teacher") {
      return [
        { title: "فصولي", value: stats.classes, description: "فصل دراسي", icon: <BookOpen className="h-6 w-6" /> },
        { title: "الحصص", value: stats.todayLessons, description: "حصة", icon: <Calendar className="h-6 w-6" /> },
      ];
    }
    if (userRole === "student") {
      return [
        { title: "اختباراتي", value: stats.activeAssessments, description: "محاولة اختبار", icon: <ClipboardCheck className="h-6 w-6" /> },
      ];
    }
    return [];
  };

  const roleStats = getStatsForRole();

  return (
    <DashboardLayout userRole={userRole} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {!userRole && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>مرحبًا بك في رواسخ</CardTitle>
              <CardDescription>
                تم إنشاء حسابك كمستخدم عام. يمكنك تحديث بياناتك من صفحة الملف الشخصي، وسيحدد مدير النظام دورك وصلاحياتك لاحقًا.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {roleStats.length > 0 && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(roleStats.length, 5)} gap-4`}>
            {roleStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className="text-primary">{stat.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{statsLoading ? "..." : stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                آخر النشاطات
              </CardTitle>
              <CardDescription>
                {recentLogs.length > 0 ? "آخر 10 نشاطات" : "لا توجد نشاطات حديثة"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">ستظهر النشاطات هنا</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-lg mt-0.5">{getActionTypeIcon(log.action_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{log.user_name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("ar")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  الإشعارات
                </CardTitle>
                <CardDescription>
                  {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات جديدة"}
                </CardDescription>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={markAllNotificationsRead}>
                  تحديد الكل كمقروء
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">ستظهر الإشعارات هنا</p>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg p-2 text-start transition-colors hover:bg-muted/60",
                        !notification.read_at && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          notification.read_at ? "bg-border" : "bg-primary",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{notification.title}</span>
                        {notification.body && (
                          <span className="block truncate text-xs text-muted-foreground">{notification.body}</span>
                        )}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
