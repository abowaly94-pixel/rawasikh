import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, CheckCircle, XCircle, Clock, AlertCircle, Video, BookOpen, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ClassAttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string | null;
  joined_at: string | null;
  lesson: {
    subject: string;
    start_time: string;
    end_time: string;
  } | null;
  class: {
    name: string;
  };
}

interface SessionAttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  joined_at: string | null;
  session: {
    title: string;
    subject: string;
    session_date: string;
    start_time: string;
    end_time: string;
  };
}

const StudentAttendancePage = () => {
  const { user, profile, userRole, loading: authLoading } = useAuth();

  // Class attendance (manual by teacher)
  const { data: classAttendance, isLoading: classLoading } = useQuery({
    queryKey: ["student-class-attendance", user?.id],
    queryFn: async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!studentData) return [];

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          notes,
          joined_at,
          lesson_id,
          class_id
        `)
        .eq("student_id", studentData.id)
        .is("lesson_id", null) // Class attendance has no lesson_id
        .order("date", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) return [];

      const enrichedData = await Promise.all(
        data.map(async (record) => {
          const { data: classData } = await supabase
            .from("classes")
            .select("name")
            .eq("id", record.class_id)
            .single();

          return {
            ...record,
            lesson: null,
            class: classData,
          };
        })
      );

      return enrichedData as ClassAttendanceRecord[];
    },
    enabled: !!user?.id,
  });

  // Lesson attendance (automatic when joining scheduled lessons)
  const { data: lessonAttendance, isLoading: lessonLoading } = useQuery({
    queryKey: ["student-lesson-attendance", user?.id],
    queryFn: async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!studentData) return [];

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          notes,
          joined_at,
          lesson_id,
          class_id
        `)
        .eq("student_id", studentData.id)
        .not("lesson_id", "is", null) // Lesson attendance has lesson_id
        .order("date", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) return [];

      const enrichedData = await Promise.all(
        data.map(async (record) => {
          let lesson = null;
          if (record.lesson_id) {
            const { data: lessonData } = await supabase
              .from("lessons")
              .select("subject, start_time, end_time")
              .eq("id", record.lesson_id)
              .single();
            lesson = lessonData;
          }

          const { data: classData } = await supabase
            .from("classes")
            .select("name")
            .eq("id", record.class_id)
            .single();

          return {
            ...record,
            lesson,
            class: classData,
          };
        })
      );

      return enrichedData as ClassAttendanceRecord[];
    },
    enabled: !!user?.id,
  });

  // Session attendance (online sessions)
  const { data: sessionAttendance, isLoading: sessionLoading } = useQuery({
    queryKey: ["student-session-attendance", user?.id],
    queryFn: async () => {
      // Get enrolled sessions with their attendance status
      const { data: enrollments, error } = await supabase
        .from("session_enrollments")
        .select(`
          id,
          enrolled_at,
          status,
          session:online_sessions (
            id,
            title,
            subject,
            session_date,
            start_time,
            end_time
          )
        `)
        .eq("user_id", user?.id)
        .order("enrolled_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!enrollments) return [];

      // Map enrollments to attendance-like records
      const now = new Date();
      return enrollments.map((enrollment: any) => {
        const session = enrollment.session;
        if (!session) return null;

        const sessionEnd = new Date(`${session.session_date}T${session.end_time}`);
        const hasEnded = sessionEnd < now;
        
        // Determine status based on enrollment status
        let status: "present" | "absent" | "late" | "excused" = "present";
        let joined_at = null;

        if (enrollment.status === "attended") {
          status = "present";
          joined_at = enrollment.enrolled_at;
        } else if (hasEnded && enrollment.status === "enrolled") {
          status = "absent";
        } else {
          // Session not ended yet, show as enrolled
          return null;
        }

        return {
          id: enrollment.id,
          date: session.session_date,
          status,
          joined_at,
          session,
        };
      }).filter(Boolean) as SessionAttendanceRecord[];
    },
    enabled: !!user?.id,
  });

  const getStats = (records: { status: string }[] | undefined) => {
    if (!records) return { present: 0, absent: 0, late: 0, excused: 0 };
    return {
      present: records.filter((a) => a.status === "present").length,
      absent: records.filter((a) => a.status === "absent").length,
      late: records.filter((a) => a.status === "late").length,
      excused: records.filter((a) => a.status === "excused").length,
    };
  };

  const getAttendanceRate = (stats: { present: number; absent: number; late: number; excused: number }) => {
    const total = stats.present + stats.absent + stats.late + stats.excused;
    return total > 0 ? Math.round((stats.present / total) * 100) : 0;
  };

  const classStats = getStats(classAttendance);
  const lessonStats = getStats(lessonAttendance);
  const sessionStats = getStats(sessionAttendance);

  const statusConfig = {
    present: { label: "حاضر", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    absent: { label: "غائب", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
    late: { label: "متأخر", icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
    excused: { label: "معذور", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-100" },
  };

  const renderStats = (stats: { present: number; absent: number; late: number; excused: number }) => (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">حاضر</p>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">غائب</p>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">متأخر</p>
              <p className="text-2xl font-bold text-blue-600">{stats.late}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">نسبة الحضور</p>
              <p className="text-2xl font-bold text-primary">{getAttendanceRate(stats)}%</p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderClassRecords = () => {
    if (!classAttendance || classAttendance.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد سجلات حضور للفصل بعد</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {classAttendance.map((record) => {
          const config = statusConfig[record.status];
          const StatusIcon = config.icon;

          return (
            <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${config.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium">
                    {format(new Date(record.date), "EEEE، d MMMM yyyy", { locale: ar })}
                  </p>
                  <p className="text-sm text-muted-foreground">{record.class?.name || "غير محدد"}</p>
                </div>
              </div>
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLessonRecords = () => {
    if (!lessonAttendance || lessonAttendance.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد سجلات حضور لحصص الجدول بعد</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {lessonAttendance.map((record) => {
          const config = statusConfig[record.status];
          const StatusIcon = config.icon;

          return (
            <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${config.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium">
                    {format(new Date(record.date), "EEEE، d MMMM yyyy", { locale: ar })}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{record.class?.name || "غير محدد"}</span>
                    {record.lesson && (
                      <>
                        <span>•</span>
                        <span>{record.lesson.subject}</span>
                        <span>•</span>
                        <span>{record.lesson.start_time?.slice(0, 5)} - {record.lesson.end_time?.slice(0, 5)}</span>
                      </>
                    )}
                  </div>
                  {record.joined_at && (
                    <p className="text-xs text-green-600">
                      انضم في: {format(new Date(record.joined_at), "HH:mm", { locale: ar })}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSessionRecords = () => {
    if (!sessionAttendance || sessionAttendance.length === 0) {
      return (
        <div className="text-center py-12">
          <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد سجلات حضور للحصص المباشرة بعد</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sessionAttendance.map((record) => {
          const config = statusConfig[record.status];
          const StatusIcon = config.icon;

          return (
            <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${config.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium">{record.session.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{record.session.subject}</span>
                    <span>•</span>
                    <span>{format(new Date(record.date), "EEEE، d MMMM yyyy", { locale: ar })}</span>
                    <span>•</span>
                    <span>{record.session.start_time?.slice(0, 5)} - {record.session.end_time?.slice(0, 5)}</span>
                  </div>
                  {record.joined_at && (
                    <p className="text-xs text-green-600">
                      انضم في: {format(new Date(record.joined_at), "HH:mm", { locale: ar })}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  if (authLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الحضور والغياب</h1>
            <p className="text-muted-foreground">سجل حضورك وغيابك في الفصل والحصص</p>
          </div>
        </div>

        <Tabs defaultValue="class" className="space-y-6" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="class" className="gap-2">
              <Users className="h-4 w-4" />
              حضور الفصل
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="h-4 w-4" />
              حصص الجدول
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <Video className="h-4 w-4" />
              الحصص المباشرة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="space-y-6">
            {renderStats(classStats)}
            <Card>
              <CardHeader>
                <CardTitle>سجل حضور الفصل</CardTitle>
              </CardHeader>
              <CardContent>
                {classLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  renderClassRecords()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lessons" className="space-y-6">
            {renderStats(lessonStats)}
            <Card>
              <CardHeader>
                <CardTitle>سجل حضور حصص الجدول</CardTitle>
              </CardHeader>
              <CardContent>
                {lessonLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  renderLessonRecords()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            {renderStats(sessionStats)}
            <Card>
              <CardHeader>
                <CardTitle>سجل حضور الحصص المباشرة</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  renderSessionRecords()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendancePage;
