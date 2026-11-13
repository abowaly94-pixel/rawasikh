import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Video, FileText, ChevronLeft, School, Play } from "lucide-react";

interface SubjectWithContent {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  contentCount: number;
  videoCount: number;
  pdfCount: number;
  completedCount: number;
}

const StudentSubjectsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<SubjectWithContent[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "student") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "student") {
      fetchSubjects();
    }
  }, [user, userRole]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      // Get student's school
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("school_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student?.school_id) {
        setIsLoading(false);
        return;
      }

      // Get school name
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", student.school_id)
        .maybeSingle();
      
      if (school) setSchoolName(school.name);

      // Get subjects with content counts
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name, description, icon")
        .eq("school_id", student.school_id)
        .eq("is_active", true);

      if (subjectsError) throw subjectsError;

      // Get content and progress for each subject
      const subjectsWithContent: SubjectWithContent[] = await Promise.all(
        (subjectsData || []).map(async (subject) => {
          // Get content
          const { data: content } = await supabase
            .from("subject_content")
            .select("id, video_url, pdf_url")
            .eq("subject_id", subject.id);

          const contentList = content || [];
          const videoCount = contentList.filter(c => c.video_url).length;
          const pdfCount = contentList.filter(c => c.pdf_url).length;

          // Get completed progress
          const { count: completedCount } = await supabase
            .from("subject_content_progress")
            .select("*", { count: "exact", head: true })
            .eq("subject_id", subject.id)
            .eq("user_id", user?.id);

          return {
            ...subject,
            contentCount: contentList.length,
            videoCount,
            pdfCount,
            completedCount: completedCount || 0
          };
        })
      );

      setSubjects(subjectsWithContent);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({ title: "خطأ", description: "فشل في تحميل المواد", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "طالب"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">المواد الدراسية</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <School className="h-4 w-4" />
            {schoolName || "محتوى المواد التعليمية"}
          </p>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مواد</h3>
              <p className="text-muted-foreground">لم يتم إضافة مواد دراسية لمدرستك بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const progress = subject.contentCount > 0 
                ? Math.round((subject.completedCount / subject.contentCount) * 100) 
                : 0;

              return (
                <Card key={subject.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                          {subject.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {subject.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Content Stats */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {subject.contentCount} درس
                      </Badge>
                      {subject.videoCount > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {subject.videoCount} فيديو
                        </Badge>
                      )}
                      {subject.pdfCount > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {subject.pdfCount} ملف
                        </Badge>
                      )}
                    </div>

                    {/* Progress */}
                    {subject.contentCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">التقدم</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {subject.completedCount} من {subject.contentCount} درس مكتمل
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/dashboard/subjects/${subject.id}/content`)}
                      disabled={subject.contentCount === 0}
                    >
                      <Play className="h-4 w-4 ml-2" />
                      {subject.contentCount > 0 ? "ابدأ التعلم" : "لا يوجد محتوى"}
                      <ChevronLeft className="h-4 w-4 mr-auto" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentSubjectsPage;
