import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, BookOpen, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";


interface Teacher {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  avg_rating: number;
  total_ratings: number;
  courses_count: number;
  classes_count: number;
  lessons_count: number;
}

const TeachersPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teacherRoles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      if (!teacherRoles || teacherRoles.length === 0) {
        setTeachers([]); setLoading(false); return;
      }
      const teacherIds = teacherRoles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, bio").in("id", teacherIds);
      const { data: ratings } = await supabase.from("teacher_ratings").select("teacher_id, rating").in("teacher_id", teacherIds);
      const { data: courses } = await supabase.from("courses").select("instructor_id").in("instructor_id", teacherIds).eq("is_published", true);
      const { data: classes } = await supabase.from("classes").select("teacher_id").in("teacher_id", teacherIds);
      const { data: lessons } = await supabase.from("lessons").select("teacher_id").in("teacher_id", teacherIds);

      const teachersData: Teacher[] = (profiles || []).map(profile => {
        const teacherRatings = (ratings || []).filter(r => r.teacher_id === profile.id);
        const avgRating = teacherRatings.length > 0
          ? teacherRatings.reduce((sum, r) => sum + r.rating, 0) / teacherRatings.length
          : 0;
        return {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          avg_rating: avgRating,
          total_ratings: teacherRatings.length,
          courses_count: (courses || []).filter(c => c.instructor_id === profile.id).length,
          classes_count: (classes || []).filter(c => c.teacher_id === profile.id).length,
          lessons_count: (lessons || []).filter(l => l.teacher_id === profile.id).length,
        };
      });
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only bio is real prose that should be machine-translated. A teacher's
  // name is a proper noun and is never run through translation — see the
  // FIELD_ORDER comment in useBlogTranslation.ts for why that always goes
  // wrong for multi-word Arabic names.
  const allTerms = teachers.flatMap(t => [t.bio]).filter(Boolean) as string[];
  const { tt } = useTermsTranslation(allTerms);

  const filteredTeachers = teachers.filter(teacher => {
    const q = searchTerm.toLowerCase();
    return teacher.full_name.toLowerCase().includes(q) ||
      teacher.bio?.toLowerCase().includes(q) ||
      tt(teacher.bio || "").toLowerCase().includes(q);
  });


  const renderStars = (rating: number) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-blue-400 text-blue-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="هيئة التدريس والخبراء"
        description="تعرّف على نخبة المدربين والخبراء في رواسخ: أساتذة وخبراء في التعليم والتدريب والخدمات الأكاديمية واللغات."
        path="/teachers"
        keywords={["مدربون", "أساتذة", "هيئة التدريس", "خبراء", "رواسخ"]}
      />
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 lg:py-16 overflow-hidden">
          <div className="shell">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-4xl font-bold mb-4 animate-fade-in">{t("teachersPage.title")}</h1>
              <p className="text-muted-foreground text-lg mb-8 animate-fade-in" style={{ animationDelay: "0.15s", animationFillMode: "backwards" }}>
                {t("teachersPage.subtitle")}
              </p>
              <div className="relative max-w-md mx-auto animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "backwards" }}>
                <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input
                  placeholder={t("teachersPage.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRtl ? "pr-10" : "pl-10"}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 lg:py-12">
          <div className="shell">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full mb-4" />
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48 mb-4" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("teachersPage.noResults")}</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? t("teachersPage.noMatch") : t("teachersPage.noTeachers")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeachers.map((teacher) => (
                  <Card key={teacher.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onClick={() => navigate(`/teachers/${teacher.id}`)}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/10">
                          <AvatarImage src={teacher.avatar_url || undefined} alt={teacher.full_name} />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {teacher.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg mb-1" data-no-auto-translate>{teacher.full_name}</h3>
                        {teacher.bio && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{tt(teacher.bio)}</p>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                          {renderStars(teacher.avg_rating)}
                          {teacher.total_ratings > 0 && (
                            <span className="text-sm text-muted-foreground">({teacher.total_ratings})</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen className="h-4 w-4" /><span>{teacher.courses_count}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" /><span>{teacher.classes_count}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" /><span>{teacher.lessons_count}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TeachersPage;
