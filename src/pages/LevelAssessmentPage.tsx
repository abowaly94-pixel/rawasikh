import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck } from "lucide-react";
import { publicBanks } from "@/lib/level-assessment/banks";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  question_count: number;
}

const LevelAssessmentPage = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAssessments(
      publicBanks.map((bank) => ({
        id: bank.skill_code,
        title: bank.skill_name,
        description: bank.subs.map((s) => s.name).join("، "),
        max_score: 100,
        question_count: 25,
      })),
    );
    setIsLoading(false);
  }, []);

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
        ) : assessments.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد اختبارات متاحة</h3>
              <p className="text-muted-foreground">
                لا توجد اختبارات تقييم مستوى متاحة حالياً
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{assessment.title}</CardTitle>
                  {assessment.description && (
                    <p className="text-sm text-muted-foreground">{assessment.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{assessment.question_count} سؤال</span>
                    <span>الدرجة القصوى: {assessment.max_score}</span>
                  </div>
                  <Button className="w-full mt-auto" asChild variant="default">
                    <Link to={`/level-assessment/${assessment.id}`}>
                      ابدأ الاختبار
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
