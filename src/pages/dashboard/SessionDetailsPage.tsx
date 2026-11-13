import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format, differenceInMinutes } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Video, 
  Calendar, 
  Clock, 
  ExternalLink, 
  ArrowRight,
  User,
  BookOpen,
  Users,
  DollarSign,
  CheckCircle,
  Bell,
  Mail,
  Phone
} from "lucide-react";

interface SessionDetails {
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
  max_students: number;
  teacher_id: string;
  thumbnail_url: string;
  is_active: boolean;
  teacher?: {
    id: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    email: string;
    phone: string;
  };
  enrollment_count?: number;
  is_enrolled?: boolean;
}

const SessionDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole } = useAuth();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session-details", id],
    queryFn: async () => {
      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from("online_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionError) throw sessionError;

      // Fetch teacher profile
      const { data: teacherData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, email, phone")
        .eq("id", sessionData.teacher_id)
        .single();

      // Fetch enrollment count
      const { count: enrollmentCount } = await supabase
        .from("session_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("session_id", id);

      // Check if current user is enrolled
      let isEnrolled = false;
      if (user?.id) {
        const { data: enrollmentData } = await supabase
          .from("session_enrollments")
          .select("id")
          .eq("session_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        isEnrolled = !!enrollmentData;
      }

      return {
        ...sessionData,
        teacher: teacherData,
        enrollment_count: enrollmentCount || 0,
        is_enrolled: isEnrolled,
      } as SessionDetails;
    },
    enabled: !!id,
  });

  const getSessionStatus = () => {
    if (!session) return null;
    
    const now = new Date();
    const start = new Date(`${session.session_date}T${session.start_time}`);
    const end = new Date(`${session.session_date}T${session.end_time}`);

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

  if (isLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">الحصة غير موجودة</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = getSessionStatus();
  const StatusIcon = status?.icon || Clock;

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة
        </Button>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Session Details - Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <Card className="overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-64 md:h-80 bg-muted">
                {session.thumbnail_url ? (
                  <img 
                    src={session.thumbnail_url} 
                    alt={session.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Video className="h-20 w-20 text-primary/50" />
                  </div>
                )}
                
                {/* Status Badge */}
                {status && (
                  <Badge variant={status.variant} className="absolute top-4 right-4 gap-1 text-sm py-1 px-3">
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                  </Badge>
                )}

                {/* Price Badge */}
                {!session.is_free && (
                  <Badge className="absolute top-4 left-4 bg-primary text-sm py-1 px-3">
                    {session.price} ج.م
                  </Badge>
                )}
                {session.is_free && (
                  <Badge className="absolute top-4 left-4 bg-green-600 text-sm py-1 px-3">
                    مجانية
                  </Badge>
                )}
              </div>

              <CardHeader>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline">{session.subject}</Badge>
                  {session.is_enrolled && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      مشترك
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{session.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Date & Time */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">التاريخ</p>
                      <p className="font-medium">
                        {format(new Date(session.session_date), "EEEE، d MMMM yyyy", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">الوقت</p>
                      <p className="font-medium">
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {session.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        وصف الحصة
                      </h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {session.description}
                      </p>
                    </div>
                  </>
                )}

                {/* Stats */}
                <Separator />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المشتركين</p>
                      <p className="font-semibold">{session.enrollment_count} / {session.max_students}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">السعر</p>
                      <p className="font-semibold">{session.is_free ? "مجانية" : `${session.price} ج.م`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">نوع الاجتماع</p>
                      <p className="font-semibold">
                        {session.meeting_type === "google_meet" ? "Google Meet" : 
                         session.meeting_type === "zoom" ? "Zoom" : "أخرى"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                {session.meeting_link && session.is_enrolled && (
                  <>
                    <Separator />
                    <Button 
                      size="lg"
                      className="w-full gap-2" 
                      onClick={() => window.open(session.meeting_link, "_blank")}
                      disabled={status?.label === "انتهت"}
                    >
                      <ExternalLink className="h-5 w-5" />
                      {status?.label === "جارية الآن" ? "انضم الآن" : "رابط الحصة"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Teacher Info */}
          <div className="space-y-6">
            {/* Teacher Card */}
            {session.teacher && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    المعلم
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={session.teacher.avatar_url || ""} />
                      <AvatarFallback className="text-lg">
                        {session.teacher.full_name?.charAt(0) || "م"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{session.teacher.full_name}</h3>
                      <p className="text-sm text-muted-foreground">معلم</p>
                    </div>
                  </div>

                  {session.teacher.bio && (
                    <>
                      <Separator />
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {session.teacher.bio}
                      </p>
                    </>
                  )}

                  {(session.teacher.email || session.teacher.phone) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {session.teacher.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{session.teacher.email}</span>
                          </div>
                        )}
                        {session.teacher.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{session.teacher.phone}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/teachers/${session.teacher?.id}`)}
                  >
                    عرض الملف الشخصي
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/dashboard/my-sessions")}
                >
                  <Video className="h-4 w-4" />
                  حصصي المباشرة
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/dashboard/sessions")}
                >
                  <Calendar className="h-4 w-4" />
                  جميع الحصص
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SessionDetailsPage;
