import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import VideoEmbed from "@/components/VideoEmbed";
import { 
  BookOpen, Video, FileText, ArrowRight, CheckCircle, 
  Play, ExternalLink, Download, Clock
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number | null;
  is_free: boolean | null;
  isCompleted: boolean;
}

interface SubjectInfo {
  id: string;
  name: string;
  description: string | null;
}

const StudentSubjectContentPage = () => {
  const { subjectId } = useParams();
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subject, setSubject] = useState<SubjectInfo | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "student") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "student" && subjectId) {
      fetchContent();
    }
  }, [user, userRole, subjectId]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      // Get subject info
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name, description")
        .eq("id", subjectId)
        .maybeSingle();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Get content
      const { data: contentData, error: contentError } = await supabase
        .from("subject_content")
        .select("*")
        .eq("subject_id", subjectId)
        .order("order_index");

      if (contentError) throw contentError;

      // Get user's progress
      const { data: progressData } = await supabase
        .from("subject_content_progress")
        .select("content_id")
        .eq("user_id", user?.id)
        .eq("subject_id", subjectId);

      const completedIds = new Set((progressData || []).map(p => p.content_id));

      const contentWithProgress: ContentItem[] = (contentData || []).map(item => ({
        ...item,
        isCompleted: completedIds.has(item.id)
      }));

      setContent(contentWithProgress);
      
      // Auto-select first incomplete or first item
      const firstIncomplete = contentWithProgress.find(c => !c.isCompleted);
      setSelectedContent(firstIncomplete || contentWithProgress[0] || null);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast({ title: "خطأ", description: "فشل في تحميل المحتوى", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsCompleted = async (contentItem: ContentItem) => {
    if (contentItem.isCompleted) return;

    try {
      const { error } = await supabase
        .from("subject_content_progress")
        .insert({
          user_id: user?.id,
          subject_id: subjectId,
          content_id: contentItem.id
        });

      if (error) throw error;

      setContent(prev => 
        prev.map(c => c.id === contentItem.id ? { ...c, isCompleted: true } : c)
      );
      setSelectedContent(prev => prev?.id === contentItem.id ? { ...prev, isCompleted: true } : prev);

      toast({ title: "تم!", description: "تم تسجيل إكمال الدرس" });
    } catch (error) {
      console.error("Error marking as completed:", error);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?\s]+)/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url;
  };

  const completedCount = content.filter(c => c.isCompleted).length;
  const progress = content.length > 0 ? Math.round((completedCount / content.length) * 100) : 0;

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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/subjects")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{subject?.name || "المادة"}</h1>
            <p className="text-muted-foreground">
              {completedCount} من {content.length} درس مكتمل ({progress}%)
            </p>
          </div>
        </div>

        {content.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد محتوى</h3>
              <p className="text-muted-foreground">لم يتم إضافة محتوى لهذه المادة بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Content List */}
            <div className="lg:col-span-1 space-y-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">قائمة الدروس</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    {content.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedContent(item)}
                        className={`w-full text-right p-3 rounded-lg transition-colors flex items-center gap-3 ${
                          selectedContent?.id === item.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          item.isCompleted 
                            ? 'bg-green-500 text-white' 
                            : selectedContent?.id === item.id 
                              ? 'bg-primary-foreground text-primary' 
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.video_url && <Video className="h-3 w-3 opacity-60" />}
                            {item.pdf_url && <FileText className="h-3 w-3 opacity-60" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Viewer */}
            <div className="lg:col-span-2">
              {selectedContent ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {selectedContent.title}
                          {selectedContent.isCompleted && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 ml-1" />
                              مكتمل
                            </Badge>
                          )}
                        </CardTitle>
                        {selectedContent.description && (
                          <p className="text-muted-foreground mt-2">{selectedContent.description}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue={selectedContent.video_url ? "video" : "pdf"}>
                      <TabsList>
                        {selectedContent.video_url && (
                          <TabsTrigger value="video" className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            فيديو
                          </TabsTrigger>
                        )}
                        {selectedContent.pdf_url && (
                          <TabsTrigger value="pdf" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            ملف PDF
                          </TabsTrigger>
                        )}
                      </TabsList>

                      {selectedContent.video_url && (
                        <TabsContent value="video" className="mt-4">
                          <VideoEmbed url={selectedContent.video_url} title={selectedContent.title} />
                          <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => window.open(selectedContent.video_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 ml-2" />
                            فتح في YouTube
                          </Button>
                        </TabsContent>
                      )}

                      {selectedContent.pdf_url && (
                        <TabsContent value="pdf" className="mt-4">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                            <iframe
                              src={selectedContent.pdf_url}
                              className="w-full h-full"
                              title={selectedContent.title}
                            />
                          </div>
                          <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => window.open(selectedContent.pdf_url!, '_blank')}
                          >
                            <Download className="h-4 w-4 ml-2" />
                            تحميل الملف
                          </Button>
                        </TabsContent>
                      )}
                    </Tabs>

                    {/* Mark as Complete */}
                    {!selectedContent.isCompleted && (
                      <Button 
                        className="w-full" 
                        onClick={() => markAsCompleted(selectedContent)}
                      >
                        <CheckCircle className="h-4 w-4 ml-2" />
                        تحديد كمكتمل
                      </Button>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        disabled={content.findIndex(c => c.id === selectedContent.id) === 0}
                        onClick={() => {
                          const currentIndex = content.findIndex(c => c.id === selectedContent.id);
                          if (currentIndex > 0) {
                            setSelectedContent(content[currentIndex - 1]);
                          }
                        }}
                      >
                        <ArrowRight className="h-4 w-4 ml-2" />
                        الدرس السابق
                      </Button>
                      <Button
                        disabled={content.findIndex(c => c.id === selectedContent.id) === content.length - 1}
                        onClick={() => {
                          const currentIndex = content.findIndex(c => c.id === selectedContent.id);
                          if (currentIndex < content.length - 1) {
                            setSelectedContent(content[currentIndex + 1]);
                          }
                        }}
                      >
                        الدرس التالي
                        <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">اختر درساً للبدء</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentSubjectContentPage;
