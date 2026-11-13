import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Star, MessageSquareText, Image as ImageIcon, Plus, Trash2, Loader2, Upload } from "lucide-react";

interface Review {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  review: string | null;
  created_at: string;
}

interface Screenshot {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface Props {
  courseId: string;
  isPurchased: boolean;
}

const StarRow = ({
  value,
  onChange,
  size = "h-6 w-6",
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

const CourseReviewsSection = ({ courseId, isPurchased }: Props) => {
  const { user, userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [reviews, setReviews] = useState<Review[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const myReview_ = useMemo(
    () => reviews.find((r) => r.user_id === user?.id) || null,
    [reviews, user?.id]
  );

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase
        .from("course_reviews")
        .select("id, user_id, reviewer_name, rating, review, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false }),
      supabase
        .from("course_review_screenshots")
        .select("id, image_url, caption, display_order")
        .eq("course_id", courseId)
        .order("display_order", { ascending: true }),
    ]);
    setReviews((r as any) || []);
    setScreenshots((s as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (myReview_) {
      setMyRating(myReview_.rating);
      setMyReview(myReview_.review || "");
    }
  }, [myReview_]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const submitReview = async () => {
    if (!user) return;
    if (myRating < 1) {
      toast({ title: t("courseReviews.selectRatingTitle"), description: t("courseReviews.selectRatingDesc"), variant: "destructive" });
      return;
    }
    setSavingReview(true);
    try {
      const { error } = await supabase.from("course_reviews").upsert(
        {
          course_id: courseId,
          user_id: user.id,
          rating: myRating,
          review: myReview.trim() || null,
        },
        { onConflict: "course_id,user_id" }
      );
      if (error) throw error;
      toast({ title: t("courseReviews.thankYouTitle"), description: t("courseReviews.thankYouDesc") });
      fetchAll();
    } catch (error: any) {
      toast({ title: t("courseReviews.errorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const deleteMyReview = async () => {
    if (!user || !confirm(t("courseReviews.confirmDeleteReview"))) return;
    const { error } = await supabase
      .from("course_reviews")
      .delete()
      .eq("course_id", courseId)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: t("courseReviews.errorTitle"), description: error.message, variant: "destructive" });
      return;
    }
    setMyRating(0);
    setMyReview("");
    fetchAll();
  };

  // Admin moderation: remove any student's review (e.g. offensive or
  // inappropriate content). RLS already allows admins to delete any row on
  // course_reviews; this just exposes it in the UI.
  const deleteReview = async (id: string) => {
    if (!confirm(t("courseReviews.confirmDeleteAnyReview"))) return;
    const { error } = await supabase.from("course_reviews").delete().eq("id", id);
    if (error) {
      toast({ title: t("courseReviews.errorTitle"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("courseReviews.reviewDeletedTitle"), description: t("courseReviews.reviewDeletedDesc") });
    fetchAll();
  };

  const uploadScreenshot = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { safeUploadName } = await import("@/lib/sanitizeUpload");
      const fileName = `course-reviews/${courseId}/${safeUploadName(file.name, "jpg")}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(fileName);
      const { error } = await supabase.from("course_review_screenshots").insert({
        course_id: courseId,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        display_order: screenshots.length,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: t("courseReviews.uploadedTitle"), description: t("courseReviews.uploadedDesc") });
      setUploadOpen(false);
      setFile(null);
      setCaption("");
      fetchAll();
    } catch (error: any) {
      toast({ title: t("courseReviews.errorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteScreenshot = async (id: string) => {
    if (!confirm(t("courseReviews.confirmDeleteScreenshot"))) return;
    const { error } = await supabase.from("course_review_screenshots").delete().eq("id", id);
    if (error) {
      toast({ title: t("courseReviews.errorTitle"), description: error.message, variant: "destructive" });
      return;
    }
    fetchAll();
  };

  return (
    <section className="py-10 lg:py-12" dir={isRtl ? "rtl" : "ltr"}>
      <div className="shell space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-primary" />
            {t("courseReviews.heading")}
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRow value={Math.round(avgRating)} size="h-5 w-5" />
              <span className="text-sm text-muted-foreground">
                {t("courseReviews.ratingSummary", { avg: avgRating.toFixed(1), count: reviews.length })}
              </span>
            </div>
          )}
        </div>

        {/* Admin: manage feedback screenshots */}
        {isAdmin && (
          <Card className="border-dashed" dir={isRtl ? "rtl" : "ltr"}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                {t("courseReviews.adminScreenshotsTitle")}
              </CardTitle>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                {t("courseReviews.addImage")}
              </Button>
            </CardHeader>
            {screenshots.length > 0 && (
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {screenshots.map((s) => (
                  <div key={s.id} className="relative group rounded-lg overflow-hidden border">
                    <img src={s.image_url} alt={s.caption || t("courseReviews.feedbackAlt")} className="w-full h-32 object-cover" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteScreenshot(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Public: screenshot gallery */}
        {!isAdmin && screenshots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {screenshots.map((s) => (
              <a key={s.id} href={s.image_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity">
                <img src={s.image_url} alt={s.caption || t("courseReviews.studentFeedbackAlt")} className="w-full h-32 object-cover" />
              </a>
            ))}
          </div>
        )}

        {/* Add / edit my review */}
        {user && isPurchased && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {myReview_ ? t("courseReviews.editMyReview") : t("courseReviews.shareYourReview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StarRow value={myRating} onChange={setMyRating} />
              <Textarea
                value={myReview}
                onChange={(e) => setMyReview(e.target.value)}
                placeholder={t("courseReviews.reviewPlaceholder")}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={submitReview} disabled={savingReview} size="sm">
                  {savingReview ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                  {myReview_ ? t("courseReviews.updateReview") : t("courseReviews.submitReview")}
                </Button>
                {myReview_ && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={deleteMyReview}>
                    {t("courseReviews.deleteMyReview")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("courseReviews.loadingReviews")}</p>
        ) : reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquareText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("courseReviews.noReviewsYet")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <Card key={r.id} className="relative group">
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 left-2 h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteReview(r.id)}
                    title={t("courseReviews.deleteThisReview")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.reviewer_name || t("courseReviews.defaultReviewerName")}</span>
                    <StarRow value={r.rating} size="h-4 w-4" />
                  </div>
                  {r.review && <p className="text-sm text-muted-foreground leading-relaxed">{r.review}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(i18n.language)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("courseReviews.uploadDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("courseReviews.imageLabel")}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>{t("courseReviews.captionLabel")}</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("courseReviews.captionPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              {t("courseReviews.cancel")}
            </Button>
            <Button onClick={uploadScreenshot} disabled={uploading || !file} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t("courseReviews.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CourseReviewsSection;
