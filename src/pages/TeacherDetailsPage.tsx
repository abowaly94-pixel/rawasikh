import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, BookOpen, Users, Calendar, Clock, 
  ArrowLeft, Video, DollarSign
} from "lucide-react";

interface TeacherProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_purchased?: boolean;
}

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  students_count: number;
  is_enrolled?: boolean;
}

interface Lesson {
  id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  class_name: string;
  class_id: string;
  meeting_link: string | null;
  thumbnail_url: string | null;
  price: number;
}

interface OnlineSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  price: number;
  is_free: boolean;
  is_enrolled?: boolean;
}

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_name: string;
}

const daysOfWeek = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const TeacherDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<OnlineSession[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [joiningClass, setJoiningClass] = useState(false);
  
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTeacherData();
    }
  }, [id, user]);

  const fetchTeacherData = async () => {
    if (!id) return;
    
    try {
      // Get teacher profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio")
        .eq("id", id)
        .maybeSingle();

      if (!profile) {
        navigate("/teachers");
        return;
      }

      setTeacher(profile);

      // Fetch all related data in parallel
      const [coursesRes, classesRes, lessonsRes, sessionsRes, ratingsRes, purchasesRes, enrollmentsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, description, thumbnail_url, price")
          .eq("instructor_id", id)
          .eq("is_published", true),
        supabase
          .from("classes")
          .select("id, name, description, grade_level")
          .eq("teacher_id", id),
        supabase
          .from("lessons")
          .select("id, subject, day_of_week, start_time, end_time, class_id, meeting_link, thumbnail_url, price")
          .eq("teacher_id", id),
        supabase
          .from("online_sessions")
          .select("id, title, description, session_date, start_time, end_time, price, is_free")
          .eq("teacher_id", id)
          .eq("is_active", true)
          .gte("session_date", new Date().toISOString().split("T")[0]),
        supabase
          .from("teacher_ratings")
          .select("id, rating, review, created_at, user_id")
          .eq("teacher_id", id),
        user ? supabase
          .from("course_purchases")
          .select("course_id")
          .eq("user_id", user.id)
          .eq("payment_status", "completed") : Promise.resolve({ data: [] }),
        user ? supabase
          .from("session_enrollments")
          .select("session_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      // Get class names for lessons
      const classIds = [...new Set((lessonsRes.data || []).map(l => l.class_id))];
      const { data: classNames } = classIds.length > 0
        ? await supabase.from("classes").select("id, name").in("id", classIds)
        : { data: [] };

      // Get user names for ratings
      const userIds = [...new Set((ratingsRes.data || []).map(r => r.user_id))];
      const { data: userProfiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      // Get students count for classes
      const classIdsForStudents = (classesRes.data || []).map(c => c.id);
      const { data: students } = classIdsForStudents.length > 0
        ? await supabase.from("students").select("class_id").in("class_id", classIdsForStudents)
        : { data: [] };

      // Process courses with purchase status
      const purchasedCourseIds = (purchasesRes.data || []).map(p => p.course_id);
      const coursesWithPurchase = (coursesRes.data || []).map(course => ({
        ...course,
        is_purchased: purchasedCourseIds.includes(course.id),
      }));

      // Process sessions with enrollment status
      const enrolledSessionIds = (enrollmentsRes.data || []).map(e => e.session_id);
      const sessionsWithEnrollment = (sessionsRes.data || []).map(session => ({
        ...session,
        is_enrolled: enrolledSessionIds.includes(session.id),
      }));

      // Process lessons with class names
      const lessonsWithClass = (lessonsRes.data || []).map(lesson => ({
        ...lesson,
        class_name: classNames?.find(c => c.id === lesson.class_id)?.name || "-",
        price: lesson.price || 0,
      }));

      // Get user's enrolled class
      let userClassId: string | null = null;
      if (user) {
        const { data: studentData } = await supabase
          .from("students")
          .select("class_id")
          .eq("user_id", user.id)
          .maybeSingle();
        userClassId = studentData?.class_id || null;
      }

      // Process classes with student counts and enrollment status
      const classesWithCount = (classesRes.data || []).map(cls => ({
        ...cls,
        students_count: (students || []).filter(s => s.class_id === cls.id).length,
        is_enrolled: userClassId === cls.id,
      }));

      // Process ratings with user names
      const ratingsWithNames = (ratingsRes.data || []).map(rating => ({
        ...rating,
        user_name: userProfiles?.find(p => p.id === rating.user_id)?.full_name || "مستخدم",
      }));

      // Calculate average rating
      const avg = ratingsWithNames.length > 0
        ? ratingsWithNames.reduce((sum, r) => sum + r.rating, 0) / ratingsWithNames.length
        : 0;

      setCourses(coursesWithPurchase);
      setClasses(classesWithCount);
      setLessons(lessonsWithClass);
      setSessions(sessionsWithEnrollment);
      setRatings(ratingsWithNames);
      setAvgRating(avg);
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateTeacher = async () => {
    if (!user || !id || userRating === 0) return;

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("teacher_ratings")
        .upsert({
          teacher_id: id,
          user_id: user.id,
          rating: userRating,
          review: userReview || null,
        }, { onConflict: "teacher_id,user_id" });

      if (error) throw error;

      toast({ title: "تم التقييم", description: "شكراً لتقييمك!" });
      setIsRatingDialogOpen(false);
      fetchTeacherData();
    } catch (error) {
      console.error("Error rating teacher:", error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال التقييم",
        variant: "destructive",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleEnrollSession = async (sessionId: string, isFree: boolean) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("session_enrollments")
        .insert({
          session_id: sessionId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({ title: "تم التسجيل", description: "تم تسجيلك في الحصة بنجاح" });
      fetchTeacherData();
    } catch (error) {
      console.error("Error enrolling:", error);
      toast({
        title: "خطأ",
        description: "فشل في التسجيل",
        variant: "destructive",
      });
    }
  };

  const handleJoinClass = async (classId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setJoiningClass(true);
    try {
      // Update student's class_id
      const { error } = await supabase
        .from("students")
        .update({ class_id: classId })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "تم الانضمام", description: "تم انضمامك للفصل بنجاح" });
      fetchTeacherData();
    } catch (error) {
      console.error("Error joining class:", error);
      toast({
        title: "خطأ",
        description: "فشل في الانضمام للفصل",
        variant: "destructive",
      });
    } finally {
      setJoiningClass(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${interactive ? "cursor-pointer" : ""} ${
              star <= rating
                ? "fill-blue-400 text-blue-400"
                : "text-muted-foreground/30"
            }`}
            onClick={() => interactive && onRate?.(star)}
          />
        ))}
      </div>
    );
  };

  const formatTime = (time: string) => time.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 shell py-8">
          <Skeleton className="h-64 w-full rounded-lg mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={teacher?.full_name ? `${teacher.full_name} — مدرب` : "تفاصيل المدرب"}
        description={
          teacher
            ? `${teacher.full_name} — مدرب في رواسخ. تعرّف على السيرة الذاتية والكورسات والحصص والتقييمات.`
            : "تعرّف على مدربي رواسخ وخبراتهم."
        }
        path={`/teachers/${id}`}
        image={teacher?.avatar_url || undefined}
        noIndex={!teacher}
      />
      <Header />
      
      <main className="flex-1">
        {/* Teacher Header */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-10 lg:py-12">
          <div className="shell">
            <Button
              variant="ghost"
              className="mb-6 gap-2"
              onClick={() => navigate("/teachers")}
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للمعلمين
            </Button>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                <AvatarImage src={teacher.avatar_url || undefined} alt={teacher.full_name} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {teacher.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center md:text-right flex-1">
                <h1 className="text-3xl font-bold mb-2">{teacher.full_name}</h1>
                {teacher.bio && (
                  <p className="text-muted-foreground mb-4 max-w-2xl">{teacher.bio}</p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {renderStars(avgRating)}
                    <span className="text-sm text-muted-foreground">
                      ({ratings.length} تقييم)
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      {courses.length} دورة
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {classes.length} فصل
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {lessons.length} حصة
                    </Badge>
                  </div>
                </div>

                {user && user.id !== teacher.id && (
                  <Button onClick={() => setIsRatingDialogOpen(true)}>
                    <Star className="h-4 w-4 ml-2" />
                    قيّم المعلم
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Tabs */}
        <section className="py-8 lg:py-10">
          <div className="shell">
            <Tabs defaultValue="courses" dir="rtl">
              <TabsList className="grid w-full grid-cols-4 max-w-lg mb-6">
                <TabsTrigger value="courses">الدورات التدريبية</TabsTrigger>
                <TabsTrigger value="sessions">الحصص الأونلاين</TabsTrigger>
                <TabsTrigger value="schedule">الفصول</TabsTrigger>
                <TabsTrigger value="reviews">التقييمات</TabsTrigger>
              </TabsList>

              {/* Courses Tab */}
              <TabsContent value="courses">
                {courses.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد دورات تدريبية متاحة</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {course.thumbnail_url && (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-bold mb-2">{course.title}</h3>
                          {course.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">
                              {course.price > 0 ? `${course.price} ج.م` : "مجاني"}
                            </span>
                            <Button
                              size="sm"
                              variant={course.is_purchased ? "secondary" : "default"}
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              {course.is_purchased ? "عرض الدورة التدريبية" : "اشترِ الآن"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Online Sessions Tab */}
              <TabsContent value="sessions">
                {sessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد حصص أونلاين قادمة</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sessions.map((session) => (
                      <Card key={session.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{session.title}</span>
                            {session.is_free ? (
                              <Badge variant="secondary">مجاني</Badge>
                            ) : (
                              <Badge>{session.price} ج.م</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {session.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {session.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(session.session_date).toLocaleDateString("ar-EG")}
                            </span>
                            <span className="flex items-center gap-1" dir="ltr">
                              <Clock className="h-4 w-4" />
                              {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </span>
                          </div>
                          <Button
                            className="w-full"
                            variant={session.is_enrolled ? "secondary" : "default"}
                            disabled={session.is_enrolled}
                            onClick={() => handleEnrollSession(session.id, session.is_free)}
                          >
                            {session.is_enrolled ? "مسجل بالفعل" : "انضم للحصة"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Schedule Tab - Shows classes first, then schedule */}
              <TabsContent value="schedule">
                {classes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد فصول متاحة</p>
                    </CardContent>
                  </Card>
                ) : !selectedClassId ? (
                  // Show classes list
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                      <Card 
                        key={cls.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedClassId(cls.id)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{cls.name}</span>
                            {cls.is_enrolled && (
                              <Badge variant="secondary">منضم</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {cls.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {cls.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            {cls.grade_level && (
                              <Badge variant="outline">{cls.grade_level}</Badge>
                            )}
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {cls.students_count} طالب
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Show selected class schedule
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedClassId(null)}
                        className="gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        العودة للفصول
                      </Button>
                      
                      {(() => {
                        const selectedClass = classes.find(c => c.id === selectedClassId);
                        return selectedClass && !selectedClass.is_enrolled && user && (
                          <Button 
                            onClick={() => handleJoinClass(selectedClassId)}
                            disabled={joiningClass}
                          >
                            {joiningClass ? "جاري الانضمام..." : "انضم لهذا الفصل"}
                          </Button>
                        );
                      })()}
                    </div>

                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle>
                          {classes.find(c => c.id === selectedClassId)?.name}
                        </CardTitle>
                      </CardHeader>
                    </Card>

                    {(() => {
                      const classLessons = lessons.filter(l => l.class_id === selectedClassId);
                      if (classLessons.length === 0) {
                        return (
                          <Card>
                            <CardContent className="py-12 text-center">
                              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">لا توجد حصص في جدول هذا الفصل</p>
                            </CardContent>
                          </Card>
                        );
                      }

                      return daysOfWeek.map((day, index) => {
                        const dayLessons = classLessons.filter(l => l.day_of_week === index);
                        if (dayLessons.length === 0) return null;

                        return (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle>{day}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {dayLessons.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                  >
                                    <div className="flex items-center gap-4">
                                      {lesson.thumbnail_url && (
                                        <img
                                          src={lesson.thumbnail_url}
                                          alt={lesson.subject}
                                          className="w-12 h-10 object-cover rounded"
                                        />
                                      )}
                                      <div>
                                        <h4 className="font-medium">{lesson.subject}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant={lesson.price > 0 ? "default" : "secondary"}>
                                            <DollarSign className="h-3 w-3 ml-1" />
                                            {lesson.price > 0 ? `${lesson.price} ج.م` : "مجاني"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm text-muted-foreground" dir="ltr">
                                        {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                      </span>
                                      {lesson.meeting_link && (
                                        <Button size="sm" asChild>
                                          <a href={lesson.meeting_link} target="_blank" rel="noopener noreferrer">
                                            <Video className="h-4 w-4 ml-1" />
                                            انضم
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                {ratings.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
                      {user && user.id !== teacher.id && (
                        <Button className="mt-4" onClick={() => setIsRatingDialogOpen(true)}>
                          كن أول من يقيّم
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <Card key={rating.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{rating.user_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(rating.rating)}
                                <span className="text-sm text-muted-foreground">
                                  {new Date(rating.created_at).toLocaleDateString("ar-EG")}
                                </span>
                              </div>
                            </div>
                          </div>
                          {rating.review && (
                            <p className="mt-3 text-muted-foreground">{rating.review}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تقييم المعلم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="mb-4">قيّم {teacher.full_name}</p>
              <div className="flex justify-center">
                {renderStars(userRating, true, setUserRating)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">تعليقك (اختياري)</label>
              <Textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="اكتب تجربتك مع هذا المعلم..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRatingDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRateTeacher} disabled={userRating === 0 || submittingRating}>
              {submittingRating ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDetailsPage;
