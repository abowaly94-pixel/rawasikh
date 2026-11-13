import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Star, BookOpen, Video, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  average_rating: number;
  total_ratings: number;
  my_rating: number | null;
  my_review: string | null;
  courses_count: number;
  sessions_count: number;
}

const StudentTeachersPage = () => {
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["student-teachers", user?.id],
    queryFn: async () => {
      // Get student's class
      const { data: studentData } = await supabase
        .from("students")
        .select("class_id")
        .eq("user_id", user?.id)
        .single();

      // Get teachers from classes and sessions
      const teacherIds = new Set<string>();

      // Get class teacher
      if (studentData?.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("teacher_id")
          .eq("id", studentData.class_id)
          .single();
        
        if (classData?.teacher_id) {
          teacherIds.add(classData.teacher_id);
        }
      }

      // Get teachers from enrolled sessions
      const { data: enrollments } = await supabase
        .from("session_enrollments")
        .select("session_id")
        .eq("user_id", user?.id);

      if (enrollments && enrollments.length > 0) {
        const sessionIds = enrollments.map(e => e.session_id);
        const { data: sessions } = await supabase
          .from("online_sessions")
          .select("teacher_id")
          .in("id", sessionIds);

        sessions?.forEach(s => teacherIds.add(s.teacher_id));
      }

      // Get teachers from purchased courses
      const { data: purchases } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", user?.id)
        .eq("payment_status", "completed");

      if (purchases && purchases.length > 0) {
        const courseIds = purchases.map(p => p.course_id);
        const { data: courses } = await supabase
          .from("courses")
          .select("instructor_id")
          .in("id", courseIds);

        courses?.forEach(c => {
          if (c.instructor_id) teacherIds.add(c.instructor_id);
        });
      }

      if (teacherIds.size === 0) return [];

      // Get teacher profiles with ratings
      const teachersData: Teacher[] = [];

      for (const teacherId of teacherIds) {
        const { data: teacherProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio")
          .eq("id", teacherId)
          .single();

        if (!teacherProfile) continue;

        // Get ratings
        const { data: ratings } = await supabase
          .from("teacher_ratings")
          .select("rating")
          .eq("teacher_id", teacherId);

        const avgRating = ratings && ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

        // Get my rating
        const { data: myRating } = await supabase
          .from("teacher_ratings")
          .select("rating, review")
          .eq("teacher_id", teacherId)
          .eq("user_id", user?.id)
          .single();

        // Get courses count
        const { count: coursesCount } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("instructor_id", teacherId)
          .eq("is_published", true);

        // Get sessions count
        const { count: sessionsCount } = await supabase
          .from("online_sessions")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", teacherId)
          .eq("is_active", true);

        teachersData.push({
          id: teacherProfile.id,
          full_name: teacherProfile.full_name,
          avatar_url: teacherProfile.avatar_url,
          bio: teacherProfile.bio,
          average_rating: avgRating,
          total_ratings: ratings?.length || 0,
          my_rating: myRating?.rating || null,
          my_review: myRating?.review || null,
          courses_count: coursesCount || 0,
          sessions_count: sessionsCount || 0,
        });
      }

      return teachersData;
    },
    enabled: !!user?.id,
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ teacherId, rating, review }: { teacherId: string; rating: number; review: string }) => {
      // Check if rating exists
      const { data: existing } = await supabase
        .from("teacher_ratings")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("user_id", user?.id)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("teacher_ratings")
          .update({ rating, review })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("teacher_ratings")
          .insert({ teacher_id: teacherId, user_id: user?.id, rating, review });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-teachers"] });
      toast({ title: "تم حفظ التقييم بنجاح" });
      setIsDialogOpen(false);
      setSelectedTeacher(null);
      setRating(0);
      setReview("");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const openRatingDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setRating(teacher.my_rating || 0);
    setReview(teacher.my_review || "");
    setIsDialogOpen(true);
  };

  const handleSubmitRating = () => {
    if (!selectedTeacher || rating === 0) {
      toast({ title: "يرجى اختيار عدد النجوم", variant: "destructive" });
      return;
    }
    ratingMutation.mutate({ teacherId: selectedTeacher.id, rating, review });
  };

  const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`h-6 w-6 ${star <= value ? "text-blue-500 fill-blue-500" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );

  if (authLoading || isLoading) {
    return (
      <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">معلميني</h1>
            <p className="text-muted-foreground">المعلمون الذين أتعلم منهم</p>
          </div>
        </div>

        {!teachers || teachers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">لم تنضم لأي فصل أو حصة بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <Card key={teacher.id} className="overflow-hidden">
                <CardHeader className="text-center pb-2">
                  <Avatar className="h-20 w-20 mx-auto mb-3">
                    <AvatarImage src={teacher.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {teacher.full_name?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl">{teacher.full_name}</CardTitle>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <StarRating value={Math.round(teacher.average_rating)} readonly />
                    <span className="text-sm text-muted-foreground mr-2">
                      ({teacher.total_ratings} تقييم)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teacher.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{teacher.bio}</p>
                  )}

                  <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>{teacher.courses_count} دورة</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4 text-primary" />
                      <span>{teacher.sessions_count} حصة</span>
                    </div>
                  </div>

                  {teacher.my_rating && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">تقييمك:</p>
                      <StarRating value={teacher.my_rating} readonly />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant={teacher.my_rating ? "outline" : "default"}
                    onClick={() => openRatingDialog(teacher)}
                  >
                    <Star className="h-4 w-4 ml-2" />
                    {teacher.my_rating ? "تعديل التقييم" : "قيّم المعلم"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تقييم المعلم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTeacher && (
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={selectedTeacher.avatar_url || undefined} />
                    <AvatarFallback>{selectedTeacher.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedTeacher.full_name}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">التقييم</label>
                <div className="flex justify-center">
                  <StarRating value={rating} onChange={setRating} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">رأيك (اختياري)</label>
                <Textarea
                  placeholder="اكتب رأيك عن المعلم..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitRating}
                disabled={ratingMutation.isPending}
              >
                <Send className="h-4 w-4 ml-2" />
                {ratingMutation.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentTeachersPage;
