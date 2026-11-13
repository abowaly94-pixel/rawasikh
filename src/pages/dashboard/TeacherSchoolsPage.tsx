import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { School, ArrowLeft, GraduationCap, Users, BookOpen } from "lucide-react";

interface TeacherSchool {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  classCount: number;
  studentCount: number;
}

const TeacherSchoolsPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [schools, setSchools] = useState<TeacherSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "teacher") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "teacher") {
      fetchTeacherSchools();
    }
  }, [user, userRole]);

  const fetchTeacherSchools = async () => {
    setIsLoading(true);
    try {
      // Get schools where teacher is assigned
      const { data: schoolTeachers, error: stError } = await supabase
        .from("school_teachers")
        .select("school_id")
        .eq("teacher_id", user?.id);

      if (stError) throw stError;

      if (!schoolTeachers || schoolTeachers.length === 0) {
        setSchools([]);
        setIsLoading(false);
        return;
      }

      const schoolIds = schoolTeachers.map(st => st.school_id);

      // Get school details
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("schools")
        .select("id, name, email, phone, logo_url")
        .in("id", schoolIds);

      if (schoolsError) throw schoolsError;

      // Get class counts for each school (only teacher's classes)
      const schoolsWithCounts: TeacherSchool[] = [];
      
      for (const school of schoolsData || []) {
        // Count classes where teacher is assigned in this school
        const { count: classCount } = await supabase
          .from("classes")
          .select("*", { count: "exact", head: true })
          .eq("school_id", school.id)
          .eq("teacher_id", user?.id);

        // Get class IDs for student count
        const { data: teacherClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("school_id", school.id)
          .eq("teacher_id", user?.id);

        let studentCount = 0;
        if (teacherClasses && teacherClasses.length > 0) {
          const classIds = teacherClasses.map(c => c.id);
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .in("class_id", classIds);
          studentCount = count || 0;
        }

        schoolsWithCounts.push({
          ...school,
          classCount: classCount || 0,
          studentCount
        });
      }

      setSchools(schoolsWithCounts);
    } catch (error) {
      console.error("Error fetching teacher schools:", error);
      toast({ title: "خطأ", description: "فشل في تحميل المدارس", variant: "destructive" });
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
    <DashboardLayout userRole={userRole || "teacher"} userName={profile?.full_name || "معلم"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">المدارس</h1>
          <p className="text-muted-foreground">المدارس التي تعمل بها</p>
        </div>

        {schools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <School className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مدارس</h3>
              <p className="text-muted-foreground">لم يتم إضافتك إلى أي مدرسة بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => (
              <Card 
                key={school.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/dashboard/my-schools/${school.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <School className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{school.name}</CardTitle>
                      {school.email && (
                        <p className="text-sm text-muted-foreground" dir="ltr">{school.email}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{school.classCount} فصل</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>{school.studentCount} طالب</span>
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full mt-4 justify-between" size="sm">
                    عرض التفاصيل
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherSchoolsPage;
