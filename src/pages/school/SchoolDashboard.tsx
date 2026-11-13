import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, GraduationCap, Layers, ClipboardCheck, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActionTypeLabel, getActionTypeIcon } from "@/lib/activityLogger";

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user_name: string;
}

const SchoolDashboard = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    stages: 0,
    subjects: 0,
    activeAssessments: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchStats();
    }
  }, [user, userRole]);

  const fetchStats = async () => {
    try {
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!school) return;

      const [studentsRes, teachersRes, stagesRes, subjectsRes, assessmentsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("school_teachers").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("educational_stages").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("school_level_assessments").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("is_active", true),
      ]);

      setStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        stages: stagesRes.count || 0,
        subjects: subjectsRes.count || 0,
        activeAssessments: assessmentsRes.count || 0,
      });

      // Fetch recent activity logs
      const { data: logsData } = await supabase
        .from("activity_logs")
        .select("id, action_type, description, created_at, user_id")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(l => l.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

        setRecentLogs(logsData.map(l => ({
          id: l.id,
          action_type: l.action_type,
          description: l.description,
          created_at: l.created_at,
          user_name: profileMap.get(l.user_id) || "غير محدد",
        })));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  const statsData = [
    { title: "الطلاب", value: stats.students, description: "طالب مسجل", icon: <GraduationCap className="h-6 w-6" /> },
    { title: "المعلمين", value: stats.teachers, description: "معلم", icon: <Users className="h-6 w-6" /> },
    { title: "المراحل الدراسية", value: stats.stages, description: "مرحلة", icon: <Layers className="h-6 w-6" /> },
    { title: "المواد", value: stats.subjects, description: "مادة دراسية", icon: <BookOpen className="h-6 w-6" /> },
    { title: "الاختبارات النشطة", value: stats.activeAssessments, description: "اختبار فعال", icon: <ClipboardCheck className="h-6 w-6" /> },
  ];

  return (
    <SchoolLayout schoolName={profile?.full_name || "مدرسة"}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statsData.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="text-primary">{stat.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              آخر النشاطات
            </CardTitle>
            <CardDescription>آخر 10 نشاطات داخل المدرسة</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا توجد نشاطات مسجلة بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-10"></TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{getActionTypeIcon(log.action_type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getActionTypeLabel(log.action_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("ar")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
};

export default SchoolDashboard;
