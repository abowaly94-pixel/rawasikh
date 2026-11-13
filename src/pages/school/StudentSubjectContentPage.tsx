import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoEmbed from "@/components/VideoEmbed";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { 
  ArrowRight, 
  Play, 
  FileText, 
  CheckCircle, 
  BookOpen,
  Video,
  File,
  Lock,
  Unlock
} from "lucide-react";

interface SubjectContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number | null;
  is_free: boolean | null;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface ContentProgress {
  content_id: string;
  completed_at: string;
}

const StudentSubjectContentPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [contents, setContents] = useState<SubjectContent[]>([]);
  const [progress, setProgress] = useState<ContentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<SubjectContent | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);

  useEffect(() => {
    if (subjectId) {
      fetchData();
    }
  }, [subjectId, user]);

  const fetchData = async () => {
    try {
      // Fetch subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name, description")
        .eq("id", subjectId)
        .single();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch content
      const { data: contentData, error: contentError } = await supabase
        .from("subject_content")
        .select("*")
        .eq("subject_id", subjectId)
        .order("order_index", { ascending: true });

      if (contentError) throw contentError;
      setContents(contentData || []);

      // Fetch user progress if logged in
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from("subject_content_progress")
          .select("content_id, completed_at")
          .eq("user_id", user.id)
          .eq("subject_id", subjectId);

        if (!progressError && progressData) {
          setProgress(progressData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isContentCompleted = (contentId: string) => {
    return progress.some(p => p.content_id === contentId);
  };

  const calculateProgress = () => {
    if (contents.length === 0) return 0;
    const completedCount = contents.filter(c => isContentCompleted(c.id)).length;
    return Math.round((completedCount / contents.length) * 100);
  };

  const markAsCompleted = async (contentId: string) => {
    if (!user) {
      toast({
        title: "تنبيه",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("subject_content_progress")
        .insert({
          user_id: user.id,
          content_id: contentId,
          subject_id: subjectId,
        });

      if (error) {
        if (error.code === '23505') {
          // Already completed
          return;
        }
        throw error;
      }

      setProgress([...progress, { content_id: contentId, completed_at: new Date().toISOString() }]);
      toast({
        title: "تم",
        description: "تم تحديد المحتوى كمكتمل",
      });
    } catch (error) {
      console.error("Error marking as completed:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث التقدم",
        variant: "destructive",
      });
    }
  };

  const openContent = (content: SubjectContent) => {
    setSelectedContent(content);
    setShowContentDialog(true);
  };

  const videoContents = contents.filter(c => c.video_url);
  const pdfContents = contents.filter(c => c.pdf_url);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 shell py-8 lg:py-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 shell py-8 lg:py-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{subject?.name || "المادة"}</h1>
              <p className="text-muted-foreground">{subject?.description || "محتوى المادة التعليمية"}</p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowRight className="h-4 w-4 ml-2" />
              رجوع
            </Button>
          </div>

          {/* Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                تقدمك في المادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.length} من {contents.length} محتوى مكتمل
                  </span>
                  <span className="font-medium">{calculateProgress()}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                الكل ({contents.length})
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="h-4 w-4 ml-1" />
                فيديوهات ({videoContents.length})
              </TabsTrigger>
              <TabsTrigger value="pdfs">
                <File className="h-4 w-4 ml-1" />
                ملفات ({pdfContents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {contents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا يوجد محتوى متاح حالياً</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {contents.map((content, index) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      index={index + 1}
                      isCompleted={isContentCompleted(content.id)}
                      onOpen={() => openContent(content)}
                      onMarkComplete={() => markAsCompleted(content.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              {videoContents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد فيديوهات متاحة</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {videoContents.map((content, index) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      index={index + 1}
                      isCompleted={isContentCompleted(content.id)}
                      onOpen={() => openContent(content)}
                      onMarkComplete={() => markAsCompleted(content.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdfs" className="space-y-4">
              {pdfContents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد ملفات متاحة</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pdfContents.map((content, index) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      index={index + 1}
                      isCompleted={isContentCompleted(content.id)}
                      onOpen={() => openContent(content)}
                      onMarkComplete={() => markAsCompleted(content.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Content Viewer Dialog */}
          <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedContent?.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedContent?.description && (
                  <p className="text-muted-foreground">{selectedContent.description}</p>
                )}
                
                {selectedContent?.video_url && (
                  <VideoEmbed url={selectedContent.video_url} title={selectedContent.title} />
                )}
                
                {selectedContent?.pdf_url && (
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <a href={selectedContent.pdf_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 ml-2" />
                        فتح الملف PDF
                      </a>
                    </Button>
                  </div>
                )}

                {selectedContent && !isContentCompleted(selectedContent.id) && (
                  <Button 
                    onClick={() => {
                      markAsCompleted(selectedContent.id);
                      setShowContentDialog(false);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تحديد كمكتمل
                  </Button>
                )}

                {selectedContent && isContentCompleted(selectedContent.id) && (
                  <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>تم إكمال هذا المحتوى</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Content Card Component
interface ContentCardProps {
  content: SubjectContent;
  index: number;
  isCompleted: boolean;
  onOpen: () => void;
  onMarkComplete: () => void;
}

const ContentCard = ({ content, index, isCompleted, onOpen, onMarkComplete }: ContentCardProps) => {
  return (
    <Card className={`transition-all hover:shadow-md ${isCompleted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              isCompleted 
                ? 'bg-green-500 text-white' 
                : 'bg-primary/10 text-primary'
            }`}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : index}
            </div>
            <div>
              <CardTitle className="text-base">{content.title}</CardTitle>
              {content.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {content.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant={content.is_free ? "secondary" : "outline"}>
            {content.is_free ? (
              <><Unlock className="h-3 w-3 ml-1" /> مجاني</>
            ) : (
              <><Lock className="h-3 w-3 ml-1" /> مدفوع</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          {content.video_url && (
            <Badge variant="outline" className="text-xs">
              <Video className="h-3 w-3 ml-1" />
              فيديو
            </Badge>
          )}
          {content.pdf_url && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 ml-1" />
              PDF
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={onOpen} className="flex-1" size="sm">
            <Play className="h-4 w-4 ml-1" />
            عرض
          </Button>
          {!isCompleted && (
            <Button onClick={onMarkComplete} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSubjectContentPage;
