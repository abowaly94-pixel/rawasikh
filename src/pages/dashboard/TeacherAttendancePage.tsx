import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, Calendar, Clock, Video, BookOpen, 
  CheckCircle, XCircle, Search, UserCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  lesson_id: string | null;
  session_id: string | null;
  attendance_type: string;
  date: string;
  status: string;
  joined_at: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  item_title: string;
  start_time: string;
  end_time: string;
}

const TeacherAttendancePage = () => {
  const { profile, userRole, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("lessons");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: lessonAttendance, isLoading: lessonsLoading } = useQuery({
    queryKey: ["teacher-lesson-attendance", selectedDate],
    queryFn: async () => {
      // Get all lessons for today's day of week
      const today = new Date(selectedDate);
      const dayOfWeek = today.getDay();

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, subject, start_time, end_time, teacher_id")
        .eq("day_of_week", dayOfWeek);

      if (!lessons || lessons.length === 0) return [];

      // Get teacher profiles
      const teacherIds = [...new Set(lessons.map(l => l.teacher_id).filter(Boolean))];
      const { data: profiles } = teacherIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", teacherIds)
        : { data: [] };

      // Get attendance records for this date
      const lessonIds = lessons.map(l => l.id);
      const { data: attendanceRecords } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("date", selectedDate)
        .eq("attendance_type", "lesson")
        .in("lesson_id", lessonIds);

      // Combine data
      return lessons.map(lesson => {
        const teacher = profiles?.find(p => p.id === lesson.teacher_id);
        const attendance = attendanceRecords?.find(a => a.lesson_id === lesson.id);
        
        return {
          id: attendance?.id || lesson.id,
          teacher_id: lesson.teacher_id,
          lesson_id: lesson.id,
          session_id: null,
          attendance_type: "lesson",
          date: selectedDate,
          status: attendance?.status || "absent",
          joined_at: attendance?.joined_at || null,
          teacher_name: teacher?.full_name || "غير معروف",
          teacher_avatar: teacher?.avatar_url || null,
          item_title: lesson.subject,
          start_time: lesson.start_time,
          end_time: lesson.end_time,
        } as TeacherAttendanceRecord;
      });
    },
  });

  const { data: sessionAttendance, isLoading: sessionsLoading } = useQuery({
    queryKey: ["teacher-session-attendance", selectedDate],
    queryFn: async () => {
      // Get all sessions for selected date
      const { data: sessions } = await supabase
        .from("online_sessions")
        .select("id, title, start_time, end_time, teacher_id")
        .eq("session_date", selectedDate);

      if (!sessions || sessions.length === 0) return [];

      // Get teacher profiles
      const teacherIds = [...new Set(sessions.map(s => s.teacher_id))];
      const { data: profiles } = teacherIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", teacherIds)
        : { data: [] };

      // Get attendance records
      const sessionIds = sessions.map(s => s.id);
      const { data: attendanceRecords } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("date", selectedDate)
        .eq("attendance_type", "session")
        .in("session_id", sessionIds);

      return sessions.map(session => {
        const teacher = profiles?.find(p => p.id === session.teacher_id);
        const attendance = attendanceRecords?.find(a => a.session_id === session.id);
        
        return {
          id: attendance?.id || session.id,
          teacher_id: session.teacher_id,
          lesson_id: null,
          session_id: session.id,
          attendance_type: "session",
          date: selectedDate,
          status: attendance?.status || "absent",
          joined_at: attendance?.joined_at || null,
          teacher_name: teacher?.full_name || "غير معروف",
          teacher_avatar: teacher?.avatar_url || null,
          item_title: session.title,
          start_time: session.start_time,
          end_time: session.end_time,
        } as TeacherAttendanceRecord;
      });
    },
  });

  const formatTime = (time: string) => time?.slice(0, 5) || "";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">حاضر</Badge>;
      case "late":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">متأخر</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">غائب</Badge>;
    }
  };

  const filterRecords = (records: TeacherAttendanceRecord[] | undefined) => {
    if (!records) return [];
    if (!searchTerm) return records;
    return records.filter(r => 
      r.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.item_title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStats = (records: TeacherAttendanceRecord[] | undefined) => {
    if (!records) return { total: 0, present: 0, absent: 0 };
    return {
      total: records.length,
      present: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
    };
  };

  const renderAttendanceTable = (records: TeacherAttendanceRecord[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      );
    }

    const filtered = filterRecords(records);
    const stats = getStats(records);

    if (filtered.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد حصص في هذا التاريخ</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">إجمالي</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-sm text-muted-foreground">حاضر</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5">
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">غائب</p>
            </CardContent>
          </Card>
        </div>

        {/* Records */}
        <div className="space-y-3">
          {filtered.map((record) => (
            <Card key={record.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={record.teacher_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {record.teacher_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{record.teacher_name}</h4>
                      <p className="text-sm text-muted-foreground">{record.item_title}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span dir="ltr">
                          {formatTime(record.start_time)} - {formatTime(record.end_time)}
                        </span>
                      </div>
                      {record.joined_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          انضم: {format(new Date(record.joined_at), "hh:mm a", { locale: ar })}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">حضور وغياب المعلمين</h1>
            <p className="text-muted-foreground">متابعة حضور المعلمين للحصص</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الحصة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="h-4 w-4" />
              حصص الفصول
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <Video className="h-4 w-4" />
              الحصص المباشرة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="mt-6">
            {renderAttendanceTable(lessonAttendance, lessonsLoading)}
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            {renderAttendanceTable(sessionAttendance, sessionsLoading)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendancePage;