import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, ChevronLeft, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  exam_date: string;
  max_score: number;
  exam_type: string;
  class_id: string;
}

interface ExamWithAttempt extends Exam {
  hasAttempted: boolean;
  lastAttempt?: {
    score: number;
    percentage: number;
    passed: boolean;
  };
  questionsCount: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const EvaluationCategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [exams, setExams] = useState<ExamWithAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStudentId();
    }
    fetchData();
  }, [categoryId, user]);

  const fetchStudentId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setStudentId(data.id);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch category details
      const { data: categoryData, error: categoryError } = await supabase
        .from("exam_categories")
        .select("*")
        .eq("id", categoryId)
        .maybeSingle();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch public exams in this category
      const { data: examsData, error: examsError } = await supabase
        .from("exams")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_public", true)
        .order("exam_date", { ascending: false });

      if (examsError) throw examsError;

      // Fetch attempts and question counts for each exam
      const examsWithDetails = await Promise.all(
        (examsData || []).map(async (exam) => {
          // Get questions count
          const { count: questionsCount } = await supabase
            .from("exam_questions")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", exam.id);

          let attemptData = null;
          if (studentId) {
            // Get last attempt for this student
            const { data: attempts } = await supabase
              .from("exam_attempts")
              .select("score, percentage, passed")
              .eq("exam_id", exam.id)
              .eq("student_id", studentId)
              .order("created_at", { ascending: false })
              .limit(1);

            if (attempts && attempts.length > 0) {
              attemptData = attempts[0];
            }
          }

          return {
            ...exam,
            questionsCount: questionsCount || 0,
            hasAttempted: !!attemptData,
            lastAttempt: attemptData ? {
              score: attemptData.score,
              percentage: attemptData.percentage,
              passed: attemptData.passed,
            } : undefined,
          };
        })
      );

      setExams(examsWithDetails);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const examTypeLabels: Record<string, string> = {
    quiz: "اختبار قصير",
    midterm: "اختبار نصفي",
    final: "اختبار نهائي",
    assignment: "واجب",
    project: "مشروع",
    evaluation: "تقييم",
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO
        title={category?.name || "اختبارات تقييم المستوى"}
        description={
          category
            ? `${category.name} — اختبارات تقييم مستوى مجانية من رواسخ مع نتيجة فورية وتقرير تفصيلي.`
            : "اختبارات تقييم مستوى مجانية من رواسخ."
        }
        path={`/evaluation-tests/${categoryId}`}
        noIndex={!category}
      />
      <Header />
      
      <main className="shell py-10 lg:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-muted-foreground mb-8">
          <Link to="/evaluation-tests" className="hover:text-primary transition-colors">
            اختبارات التقييم
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {category?.name || "..."}
          </span>
        </div>

        {/* Page Header */}
        {loading ? (
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
        ) : category ? (
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">{category.name}</h1>
            {category.description && (
              <p className="text-xl text-muted-foreground max-w-2xl">
                {category.description}
              </p>
            )}
          </div>
        ) : (
          <Card className="text-center py-16 mb-8">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">التصنيف غير موجود</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم العثور على هذا التصنيف
              </p>
              <Button asChild>
                <Link to="/evaluation-tests">العودة للتصنيفات</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد اختبارات متاحة</h3>
              <p className="text-muted-foreground">
                لم يتم إضافة أي اختبارات في هذا التصنيف بعد
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {examTypeLabels[exam.exam_type] || exam.exam_type}
                    </Badge>
                    {exam.hasAttempted && (
                      <Badge variant={exam.lastAttempt?.passed ? "default" : "destructive"}>
                        {exam.lastAttempt?.passed ? (
                          <><CheckCircle2 className="h-3 w-3 ml-1" /> نجاح</>
                        ) : (
                          "لم ينجح"
                        )}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{exam.title}</CardTitle>
                  {exam.description && (
                    <CardDescription className="line-clamp-2">
                      {exam.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-4 w-4" />
                      <span>{exam.questionsCount} سؤال</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>الدرجة الكاملة: {exam.max_score}</span>
                    </div>
                  </div>
                  
                  {exam.hasAttempted && exam.lastAttempt && (
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p className="text-muted-foreground">
                        آخر نتيجة: <span className="font-bold text-foreground">{exam.lastAttempt.percentage?.toFixed(0)}%</span>
                      </p>
                    </div>
                  )}

                  <Button asChild className="w-full gap-2">
                    <Link to={`/evaluation-tests/${categoryId}/exam/${exam.id}`}>
                      {exam.hasAttempted ? "إعادة الاختبار" : "ابدأ الاختبار"}
                      <ChevronLeft className="h-4 w-4" />
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

export default EvaluationCategoryPage;
