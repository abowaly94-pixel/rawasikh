import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, PlayCircle, ArrowLeft } from "lucide-react";

interface PurchasedCourse {
  id: string;
  purchased_at: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
  };
}

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["my_purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_purchases")
        .select(`
          id,
          purchased_at,
          course:courses (
            id,
            title,
            description,
            thumbnail_url
          )
        `)
        .eq("user_id", user!.id)
        .eq("payment_status", "completed")
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PurchasedCourse[];
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "المستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">دوراتي التدريبية</h1>
            <p className="text-muted-foreground mt-1">الدورات التدريبية التي اشتركت فيها</p>
          </div>
          <Button asChild>
            <Link to="/courses">
              استكشف المزيد
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : purchases && purchases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {purchase.course.thumbnail_url ? (
                    <img
                      src={purchase.course.thumbnail_url}
                      alt={purchase.course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <h3 className="text-lg font-bold text-foreground line-clamp-2">
                    {purchase.course.title}
                  </h3>
                  {purchase.course.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {purchase.course.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    تاريخ الاشتراك: {new Date(purchase.purchased_at).toLocaleDateString("ar-EG")}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to={`/courses/${purchase.course.id}`}>
                      <PlayCircle className="ml-2 h-4 w-4" />
                      متابعة التعلم
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لم تشترك في أي دورة تدريبية بعد
            </h3>
            <p className="text-muted-foreground mb-6">
              استكشف الدورات التدريبية المتاحة وابدأ رحلة التعلم
            </p>
            <Button asChild>
              <Link to="/courses">استكشف الدورات التدريبية</Link>
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCoursesPage;
