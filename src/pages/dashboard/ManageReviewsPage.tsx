import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Pencil, Trash2, Star, MessageSquareText } from "lucide-react";

interface ReviewRow {
  id: string;
  course_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  review: string | null;
  created_at: string;
  courses: { title: string } | null;
}

interface CourseOpt {
  id: string;
  title: string;
}

const ALL_COURSES = "__all__";

const StarRow = ({
  value,
  onChange,
  size = "h-5 w-5",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) => (
  <div className="flex items-center gap-1" dir="ltr">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
      >
        <Star
          className={`${size} ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      </button>
    ))}
  </div>
);

const ManageReviewsPage = () => {
  const navigate = useNavigate();
  const { profile, userRole, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canAccess = userRole === "admin" || hasPermission("reviews");

  const [courseFilter, setCourseFilter] = useState(ALL_COURSES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [editReviewerName, setEditReviewerName] = useState("");

  useEffect(() => {
    if (!loading && !canAccess) {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [loading, canAccess, navigate]);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin_course_reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_reviews")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReviewRow[];
    },
    enabled: canAccess,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["reviews_courses_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return (data || []) as CourseOpt[];
    },
    enabled: canAccess,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rating, review, reviewer_name }: { id: string; rating: number; review: string; reviewer_name: string }) => {
      const { error } = await supabase
        .from("course_reviews")
        .update({ rating, review: review.trim() || null, reviewer_name: reviewer_name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_course_reviews"] });
      toast.success("تم تحديث الرأي بنجاح");
      setIsDialogOpen(false);
      setEditingReview(null);
    },
    onError: () => toast.error("حدث خطأ أثناء تحديث الرأي"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_course_reviews"] });
      toast.success("تم حذف الرأي بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء حذف الرأي"),
  });

  const handleEdit = (r: ReviewRow) => {
    setEditingReview(r);
    setEditRating(r.rating);
    setEditText(r.review || "");
    setEditReviewerName(r.reviewer_name);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    if (!editReviewerName.trim()) {
      toast.error("يرجى إدخال اسم صاحب الرأي");
      return;
    }
    updateMutation.mutate({
      id: editingReview.id,
      rating: editRating,
      review: editText,
      reviewer_name: editReviewerName,
    });
  };

  const filteredReviews = (reviews || []).filter(
    (r) => courseFilter === ALL_COURSES || r.course_id === courseFilter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">آراء الطلاب</h1>
            <p className="text-muted-foreground mt-1">راجع وعدّل أو احذف أي رأي من آراء الطلاب على الدورات التدريبية من مكان واحد</p>
          </div>
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={courseFilter}
              onValueChange={setCourseFilter}
              options={[
                { value: ALL_COURSES, label: "كل الدورات التدريبية" },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
              placeholder="فلترة حسب الدورة التدريبية"
              searchPlaceholder="ابحث عن دورة تدريبية..."
              emptyText="لا توجد دورات تدريبية مطابقة"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingReview(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>تعديل الرأي</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-reviewer-name">اسم صاحب الرأي</Label>
                <Input
                  id="review-reviewer-name"
                  value={editReviewerName}
                  onChange={(e) => setEditReviewerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>التقييم</Label>
                <StarRow value={editRating} onChange={setEditRating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-text">نص الرأي</Label>
                <Textarea
                  id="review-text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  placeholder="نص الرأي (اختياري)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  تحديث
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded" />)}
              </div>
            </CardContent>
          </Card>
        ) : filteredReviews.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الدورة التدريبية</TableHead>
                    <TableHead className="text-right">صاحب الرأي</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">الرأي</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="outline">{r.courses?.title || "دورة تدريبية محذوفة"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{r.reviewer_name}</TableCell>
                      <TableCell>
                        <StarRow value={r.rating} size="h-4 w-4" />
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {r.review ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{r.review}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                            <MessageSquareText className="h-3 w-3" />
                            بدون نص
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا الرأي؟")) {
                                deleteMutation.mutate(r.id);
                              }
                            }}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <MessageSquareText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد آراء بعد</h3>
            <p className="text-muted-foreground">
              {courseFilter === ALL_COURSES ? "لسه مفيش طلاب كتبوا آراء على الدورات التدريبية." : "لا توجد آراء لهذه الدورة التدريبية بعد."}
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageReviewsPage;
