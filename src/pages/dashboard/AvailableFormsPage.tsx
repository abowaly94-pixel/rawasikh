import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2 } from "lucide-react";

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  courses: { title: string } | null;
}

const AvailableFormsPage = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const { data: forms, isLoading } = useQuery({
    queryKey: ["available_forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms" as any)
        .select("id, title, description, course_id, courses(title)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as FormRow[];
    },
    enabled: !!user,
  });

  const { data: answeredFormIds = [] } = useQuery({
    queryKey: ["my_form_responses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("form_responses" as any)
        .select("form_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data as any[]).map((r) => r.form_id) as string[];
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
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "الطالب"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            النماذج والاستبيانات
          </h1>
          <p className="text-muted-foreground mt-1">نماذج وتقييمات متاحة لك حاليًا</p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">جاري التحميل...</CardContent></Card>
        ) : !forms || forms.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد نماذج متاحة حاليًا.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map((form) => {
              const answered = answeredFormIds.includes(form.id);
              return (
                <Card key={form.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-bold">{form.title}</h3>
                        {form.course_id && form.courses?.title && (
                          <Badge variant="outline" className="text-xs">
                            استبيان دورة تدريبية: {form.courses.title}
                          </Badge>
                        )}
                      </div>
                      {answered && (
                        <Badge className="gap-1 bg-green-500/10 text-green-700 hover:bg-green-500/20 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          تم الرد
                        </Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                    )}
                    <Button
                      size="sm"
                      variant={answered ? "outline" : "default"}
                      onClick={() => navigate(`/dashboard/forms/${form.id}/fill`)}
                    >
                      {answered ? "عرض الرد" : "الرد على النموذج"}
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

export default AvailableFormsPage;
