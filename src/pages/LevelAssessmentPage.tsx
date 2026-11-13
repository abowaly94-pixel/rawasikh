import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, GraduationCap, Filter } from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  stage_id: string | null;
  grade_level_id: string | null;
  stage_name: string | null;
  grade_level_name: string | null;
  question_count: number;
  has_attempted: boolean;
  last_score: number | null;
}

interface Stage {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  stage_id: string;
}

const LevelAssessmentPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  // Filters
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Get student ID
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (student) {
        setStudentId(student.id);
      }

      // Fetch stages
      const { data: stagesData } = await supabase
        .from("global_stages")
        .select("id, name")
        .order("order_index");
      setStages(stagesData || []);

      // Fetch grade levels
      const { data: gradesData } = await supabase
        .from("grade_levels")
        .select("id, name, stage_id")
        .order("order_index");
      setGradeLevels(gradesData || []);

      // Fetch active admin assessments (school_id is null)
      const { data: assessmentsData } = await supabase
        .from("school_level_assessments")
        .select("*")
        .eq("is_active", true)
        .is("school_id", null)
        .order("created_at", { ascending: false });

      if (assessmentsData) {
        const assessmentsWithDetails: Assessment[] = await Promise.all(
          assessmentsData.map(async (assessment) => {
            // Get stage name
            let stageName = null;
            if (assessment.stage_id) {
              const stage = stagesData?.find(s => s.id === assessment.stage_id);
              stageName = stage?.name || null;
            }

            // Get grade level name
            let gradeLevelName = null;
            if (assessment.grade_level_id) {
              const grade = gradesData?.find(g => g.id === assessment.grade_level_id);
              gradeLevelName = grade?.name || null;
            }

            // Get question count
            const { count: questionCount } = await supabase
              .from("school_assessment_questions")
              .select("*", { count: "exact", head: true })
              .eq("assessment_id", assessment.id);

            // Check if student has attempted
            let hasAttempted = false;
            let lastScore = null;
            if (student) {
              const { data: attemptData } = await supabase
                .from("school_assessment_attempts")
                .select("score, completed_at")
                .eq("assessment_id", assessment.id)
                .eq("student_id", student.id)
                .not("completed_at", "is", null)
                .order("completed_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (attemptData) {
                hasAttempted = true;
                lastScore = attemptData.score;
              }
            }

            return {
              id: assessment.id,
              title: assessment.title,
              description: assessment.description,
              max_score: assessment.max_score,
              stage_id: assessment.stage_id,
              grade_level_id: assessment.grade_level_id,
              stage_name: stageName,
              grade_level_name: gradeLevelName,
              question_count: questionCount || 0,
              has_attempted: hasAttempted,
              last_score: lastScore,
            };
          })
        );

        setAssessments(assessmentsWithDetails);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter assessments based on selections
  const filteredAssessments = assessments.filter(a => {
    if (selectedStage && a.stage_id && a.stage_id !== selectedStage) {
      return false;
    }
    if (selectedGradeLevel && a.grade_level_id && a.grade_level_id !== selectedGradeLevel) {
      return false;
    }
    return true;
  });

  const filteredGradeLevels = selectedStage
    ? gradeLevels.filter(g => g.stage_id === selectedStage)
    : gradeLevels;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <main className="shell py-10 lg:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">اختبارات تقييم المستوى</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            اختبر مستواك في المواد المختلفة واحصل على تقييم فوري لأدائك
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              تصفية الاختبارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المرحلة الدراسية</label>
                <Select
                  value={selectedStage || "all"}
                  onValueChange={(value) => {
                    setSelectedStage(value === "all" ? "" : value);
                    setSelectedGradeLevel("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المراحل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المراحل</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الصف الدراسي</label>
                <Select
                  value={selectedGradeLevel || "all"}
                  onValueChange={(value) => setSelectedGradeLevel(value === "all" ? "" : value)}
                  disabled={!selectedStage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الصفوف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الصفوف</SelectItem>
                    {filteredGradeLevels.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد اختبارات متاحة</h3>
              <p className="text-muted-foreground">
                {selectedStage || selectedGradeLevel 
                  ? "لا توجد اختبارات تتوافق مع الفلاتر المحددة"
                  : "لا توجد اختبارات تقييم مستوى متاحة حالياً"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{assessment.title}</CardTitle>
                    </div>
                    {assessment.has_attempted && (
                      <Badge variant="secondary">
                        تم الحل
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {assessment.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {assessment.stage_name && (
                      <Badge variant="outline" className="gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {assessment.stage_name}
                      </Badge>
                    )}
                    {assessment.grade_level_name && (
                      <Badge variant="outline">
                        {assessment.grade_level_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{assessment.question_count} سؤال</span>
                    <span>الدرجة القصوى: {assessment.max_score}</span>
                  </div>

                  {assessment.has_attempted && assessment.last_score !== null && (
                    <div className="bg-muted p-3 rounded-lg mb-4 text-center">
                      <p className="text-sm text-muted-foreground">آخر درجة</p>
                      <p className="text-xl font-bold">
                        {assessment.last_score} / {assessment.max_score}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full mt-auto"
                    asChild
                    variant={assessment.has_attempted ? "outline" : "default"}
                  >
                    <Link to={`/level-assessment/${assessment.id}`}>
                      {assessment.has_attempted ? "إعادة الاختبار" : "ابدأ الاختبار"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LevelAssessmentPage;
