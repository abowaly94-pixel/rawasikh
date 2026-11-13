import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ChevronLeft, BookOpen } from "lucide-react";

interface ExamCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  order_index: number;
}

interface CategoryWithCount extends ExamCategory {
  examsCount: number;
}

const EvaluationTestsPage = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("exam_categories")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch exam counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from("exams")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id)
            .eq("is_public", true);

          return {
            ...category,
            examsCount: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    // Default icon
    return <ClipboardList className="h-8 w-8" />;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO
        title="اختبارات تقييم المستوى"
        description="اختبارات تقييم مستوى مجانية من رواسخ لقياس مهاراتك وتحديد نقطة البداية المناسبة في مسارك التعليمي."
        path="/evaluation-tests"
        keywords={["اختبار تحديد مستوى", "تقييم مهارات", "اختبار مجاني", "رواسخ"]}
      />
      <Header />
      
      <main className="shell py-10 lg:py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 animate-fade-in">اختبارات التقييم</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.15s", animationFillMode: "backwards" }}>
            اختبر مستواك في مختلف المجالات واكتشف نقاط القوة والضعف لديك
          </p>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-8 rounded-full mb-2" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="text-center py-16 animate-fade-in">
            <CardContent>
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد تصنيفات متاحة</h3>
              <p className="text-muted-foreground">
                لم يتم إضافة أي تصنيفات لاختبارات التقييم بعد
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Card 
                key={category.id} 
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${0.1 * (index + 1)}s`, animationFillMode: "backwards" }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {getIconComponent(category.icon)}
                    </div>
                    <Badge variant="secondary">
                      {category.examsCount} اختبار
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  {category.description && (
                    <CardDescription className="line-clamp-2">
                      {category.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full gap-2">
                    <Link to={`/evaluation-tests/${category.id}`}>
                      عرض الاختبارات
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

export default EvaluationTestsPage;
