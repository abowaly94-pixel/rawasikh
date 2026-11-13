import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, Calendar, Clock, Video, MapPin, GraduationCap, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Lesson {
  id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  thumbnail_url: string | null;
  price: number;
  room: string | null;
}

interface EnrolledClass {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  teacher: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  students_count: number;
  lessons: Lesson[];
}

const daysOfWeek = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const formatTime = (time: string) => time.slice(0, 5);

const StudentClassesPage = () => {
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedule");
  const [joiningLesson, setJoiningLesson] = useState<string | null>(null);

  const handleJoinLesson = async (lesson: Lesson, classId: string) => {
    if (!user) return;
    
    setJoiningLesson(lesson.id);
    try {
      // Get student record
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentData) {
        // Record attendance as present
        await supabase.from("attendance").upsert({
          student_id: studentData.id,
          class_id: classId,
          lesson_id: lesson.id,
          date: new Date().toISOString().split("T")[0],
          status: "present",
          joined_at: new Date().toISOString(),
        }, { onConflict: "student_id,class_id,date,lesson_id" });
      }

      toast({ title: "تم تسجيل حضورك", description: "تم تسجيل حضورك للحصة بنجاح" });
      
      // Open meeting link
      if (lesson.meeting_link) {
        window.open(lesson.meeting_link, "_blank");
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      // Still open the link even if attendance fails
      if (lesson.meeting_link) {
        window.open(lesson.meeting_link, "_blank");
      }
    } finally {
      setJoiningLesson(null);
    }
  };

  const { data: enrolledClass, isLoading } = useQuery({
    queryKey: ["student-enrolled-class", user?.id],
    queryFn: async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("class_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!studentData?.class_id) return null;

      const { data: classData, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", studentData.class_id)
        .single();

      if (error) throw error;
      if (!classData) return null;

      let teacher = null;
      if (classData.teacher_id) {
        const { data: teacherData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", classData.teacher_id)
          .single();
        teacher = teacherData;
      }

      const { count: studentsCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classData.id);

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, subject, day_of_week, start_time, end_time, meeting_link, thumbnail_url, price, room")
        .eq("class_id", classData.id)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      return {
        ...classData,
        teacher,
        students_count: studentsCount || 0,
        lessons: lessonsData || [],
      } as EnrolledClass;
    },
    enabled: !!user?.id,
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">فصولي</h1>
            <p className="text-muted-foreground">الفصل الدراسي وجدول الحصص</p>
          </div>
        </div>

        {!enrolledClass ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">لم يتم تسجيلك في أي فصل</h3>
              <p className="text-muted-foreground text-center max-w-md">
                يمكنك الانضمام لفصل من صفحة المعلم، اختر المعلم ثم اختر الفصل المناسب لك
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Class Info Card */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-primary/10">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{enrolledClass.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        {enrolledClass.grade_level && (
                          <Badge variant="secondary" className="text-sm">
                            {enrolledClass.grade_level}
                          </Badge>
                        )}
                        <Badge variant="default" className="text-sm">
                          منضم
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {enrolledClass.teacher && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/80 backdrop-blur">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={enrolledClass.teacher.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {enrolledClass.teacher.full_name?.charAt(0) || "م"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{enrolledClass.teacher.full_name}</p>
                        <p className="text-sm text-muted-foreground">المعلم</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 mt-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">{enrolledClass.students_count} طالب</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">{enrolledClass.lessons.length} حصة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="schedule">جدول الحصص</TabsTrigger>
                <TabsTrigger value="info">معلومات الفصل</TabsTrigger>
              </TabsList>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="mt-6">
                {enrolledClass.lessons.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد حصص في جدول هذا الفصل</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-8">
                    {daysOfWeek.map((day, index) => {
                      const dayLessons = enrolledClass.lessons.filter(
                        (l) => l.day_of_week === index
                      );
                      if (dayLessons.length === 0) return null;

                      return (
                        <div key={index}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-1 flex-1 bg-gradient-to-l from-primary/20 to-transparent rounded-full" />
                            <h3 className="text-xl font-bold text-primary">{day}</h3>
                            <div className="h-1 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {dayLessons.map((lesson) => (
                              <Card 
                                key={lesson.id} 
                                className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-0 shadow-md"
                              >
                                {lesson.thumbnail_url ? (
                                  <div className="relative h-32 overflow-hidden">
                                    <img
                                      src={lesson.thumbnail_url}
                                      alt={lesson.subject}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                                    <Badge 
                                      className="absolute top-3 left-3"
                                      variant={lesson.price > 0 ? "default" : "secondary"}
                                    >
                                      {lesson.price > 0 ? `${lesson.price} ج.م` : "مجاني"}
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                                    <BookOpen className="h-12 w-12 text-primary/40" />
                                    <Badge 
                                      className="absolute top-3 left-3"
                                      variant={lesson.price > 0 ? "default" : "secondary"}
                                    >
                                      {lesson.price > 0 ? `${lesson.price} ج.م` : "مجاني"}
                                    </Badge>
                                  </div>
                                )}
                                
                                <CardContent className="p-4 space-y-4">
                                  <div>
                                    <h4 className="font-bold text-lg mb-2">{lesson.subject}</h4>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                        <Clock className="h-4 w-4" />
                                        <span dir="ltr">
                                          {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                        </span>
                                      </div>
                                      
                                      {lesson.room && (
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                          <MapPin className="h-4 w-4" />
                                          <span>{lesson.room}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {lesson.meeting_link && (
                                    <Button 
                                      className="w-full gap-2" 
                                      onClick={() => handleJoinLesson(lesson, enrolledClass.id)}
                                      disabled={joiningLesson === lesson.id}
                                    >
                                      {joiningLesson === lesson.id ? (
                                        <>جاري التسجيل...</>
                                      ) : (
                                        <>
                                          <Video className="h-4 w-4" />
                                          انضم للحصة
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>تفاصيل الفصل</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {enrolledClass.description && (
                      <div>
                        <h4 className="font-medium mb-2">الوصف</h4>
                        <p className="text-muted-foreground">{enrolledClass.description}</p>
                      </div>
                    )}

                    {enrolledClass.teacher && (
                      <div>
                        <h4 className="font-medium mb-3">المعلم</h4>
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={enrolledClass.teacher.avatar_url || undefined} />
                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                              {enrolledClass.teacher.full_name?.charAt(0) || "م"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-lg">{enrolledClass.teacher.full_name}</p>
                            <p className="text-muted-foreground">معلم الفصل</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-xl text-center">
                        <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{enrolledClass.students_count}</p>
                        <p className="text-sm text-muted-foreground">طالب</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-xl text-center">
                        <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{enrolledClass.lessons.length}</p>
                        <p className="text-sm text-muted-foreground">حصة</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentClassesPage;