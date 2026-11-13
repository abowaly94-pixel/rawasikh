import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, differenceInMinutes, isToday, isTomorrow } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Video, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Bell,
  BellRing,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface EnrolledSession {
  id: string;
  enrolled_at: string;
  status: string;
  session: {
    id: string;
    title: string;
    description: string;
    subject: string;
    session_date: string;
    start_time: string;
    end_time: string;
    meeting_link: string;
    meeting_type: string;
    is_free: boolean;
    price: number;
    teacher_id: string;
    thumbnail_url: string;
  };
}

const MySessionsPage = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [notifiedSessions, setNotifiedSessions] = useState<Set<string>>(new Set());

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_enrollments")
        .select(`
          id,
          enrolled_at,
          status,
          session:online_sessions (
            id,
            title,
            description,
            subject,
            session_date,
            start_time,
            end_time,
            meeting_link,
            meeting_type,
            is_free,
            price,
            teacher_id,
            thumbnail_url
          )
        `)
        .eq("user_id", user?.id)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return data as unknown as EnrolledSession[];
    },
    enabled: !!user?.id,
  });

  // Check for upcoming sessions and show notifications
  useEffect(() => {
    if (!enrollments) return;

    const checkUpcomingSessions = () => {
      const now = new Date();
      
      enrollments.forEach((enrollment) => {
        const session = enrollment.session;
        if (!session) return;

        const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
        const minutesUntilSession = differenceInMinutes(sessionDateTime, now);

        // Notify 30 minutes before
        if (minutesUntilSession > 0 && minutesUntilSession <= 30 && !notifiedSessions.has(session.id)) {
          toast.info(
            `تبدأ حصة "${session.title}" خلال ${minutesUntilSession} دقيقة!`,
            {
              duration: 10000,
              icon: <BellRing className="h-5 w-5 text-primary" />,
              action: session.meeting_link ? {
                label: "انضم الآن",
                onClick: () => window.open(session.meeting_link, "_blank"),
              } : undefined,
            }
          );
          setNotifiedSessions((prev) => new Set([...prev, session.id]));
        }

        // Notify 5 minutes before
        if (minutesUntilSession > 0 && minutesUntilSession <= 5 && !notifiedSessions.has(`${session.id}-5min`)) {
          toast.warning(
            `تبدأ حصة "${session.title}" خلال ${minutesUntilSession} دقيقة! استعد للانضمام`,
            {
              duration: 15000,
              icon: <AlertCircle className="h-5 w-5" />,
              action: session.meeting_link ? {
                label: "انضم الآن",
                onClick: () => window.open(session.meeting_link, "_blank"),
              } : undefined,
            }
          );
          setNotifiedSessions((prev) => new Set([...prev, `${session.id}-5min`]));
        }
      });
    };

    // Check immediately and then every minute
    checkUpcomingSessions();
    const interval = setInterval(checkUpcomingSessions, 60000);

    return () => clearInterval(interval);
  }, [enrollments, notifiedSessions]);

  const getSessionStatus = (sessionDate: string, startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(`${sessionDate}T${startTime}`);
    const end = new Date(`${sessionDate}T${endTime}`);

    if (now >= start && now <= end) {
      return { label: "جارية الآن", variant: "default" as const, icon: Video };
    } else if (now < start) {
      const minutesUntil = differenceInMinutes(start, now);
      if (minutesUntil <= 30) {
        return { label: `تبدأ خلال ${minutesUntil} دقيقة`, variant: "secondary" as const, icon: Bell };
      }
      return { label: "قادمة", variant: "outline" as const, icon: Clock };
    }
    return { label: "انتهت", variant: "secondary" as const, icon: CheckCircle };
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "اليوم";
    if (isTomorrow(date)) return "غداً";
    return format(date, "EEEE، d MMMM", { locale: ar });
  };

  const upcomingSessions = enrollments?.filter((e) => {
    if (!e.session) return false;
    const sessionEnd = new Date(`${e.session.session_date}T${e.session.end_time}`);
    return sessionEnd > new Date();
  }) || [];

  const pastSessions = enrollments?.filter((e) => {
    if (!e.session) return false;
    const sessionEnd = new Date(`${e.session.session_date}T${e.session.end_time}`);
    return sessionEnd <= new Date();
  }) || [];

  if (isLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حصصي المباشرة</h1>
          <p className="text-muted-foreground">الحصص التي اشتركت فيها</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          التنبيهات مفعلة
        </Badge>
      </div>

      {/* Upcoming Sessions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          الحصص القادمة ({upcomingSessions.length})
        </h2>
        
        {upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لم تشترك في أي حصص قادمة بعد
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcomingSessions.map((enrollment) => {
              const session = enrollment.session;
              if (!session) return null;
              
              const status = getSessionStatus(session.session_date, session.start_time, session.end_time);
              const StatusIcon = status.icon;

              return (
                <Card 
                  key={enrollment.id} 
                  className="overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-40 bg-muted">
                    {session.thumbnail_url ? (
                      <img 
                        src={session.thumbnail_url} 
                        alt={session.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Video className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                    <Badge variant={status.variant} className="absolute top-2 right-2 gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    {!session.is_free && (
                      <Badge className="absolute top-2 left-2 bg-primary">
                        {session.price} ج.م
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-1">{session.title}</CardTitle>
                    <Badge variant="outline" className="w-fit text-xs">{session.subject}</Badge>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-3">
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-xs mt-auto">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {getDateLabel(session.session_date)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </div>
                    </div>

                    {session.meeting_link && (
                      <Button 
                        className="w-full gap-2 mt-2" 
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Record attendance when joining
                          try {
                            const { error } = await supabase
                              .from("session_enrollments")
                              .update({ 
                                status: "attended"
                              })
                              .eq("id", enrollment.id);
                            
                            if (error) {
                              console.error("Error recording session attendance:", error);
                            } else {
                              toast.success("تم تسجيل حضورك بنجاح!");
                            }
                          } catch (error) {
                            console.error("Error recording session attendance:", error);
                          }
                          window.open(session.meeting_link, "_blank");
                        }}
                        disabled={status.label === "انتهت"}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {status.label === "جارية الآن" ? "انضم الآن" : "رابط الحصة"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5" />
            الحصص السابقة ({pastSessions.length})
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pastSessions.map((enrollment) => {
              const session = enrollment.session;
              if (!session) return null;

              return (
                <Card key={enrollment.id} className="opacity-75 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-muted">
                    {session.thumbnail_url ? (
                      <img 
                        src={session.thumbnail_url} 
                        alt={session.title}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5">
                        <Video className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm line-clamp-1">{session.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit text-xs">{session.subject}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(session.session_date), "d MMMM yyyy", { locale: ar })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default MySessionsPage;
