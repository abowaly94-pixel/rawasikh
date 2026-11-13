import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, MessageSquare, Reply } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS, fr } from "date-fns/locale";
import { Link } from "react-router-dom";

interface BlogCommentsProps {
  postId: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_approved: boolean;
  created_at: string;
  author?: { full_name: string | null; avatar_url?: string | null } | null;
}

const BlogComments = ({ postId }: BlogCommentsProps) => {
  const { user, userRole } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" || i18n.language === "ur" ? ar : i18n.language === "fr" ? fr : enUS;
  const isAdmin = userRole === "admin";

  const L = (
    {
      ar: { title: "التعليقات", placeholder: "اكتب تعليقك...", submit: "نشر التعليق", login: "سجل دخولك للتعليق", empty: "لا توجد تعليقات بعد. كن أول من يعلق!", reply: "رد", cancel: "إلغاء", deleted: "تم حذف التعليق", added: "تم نشر التعليق", replyTo: "ردًا على" },
      en: { title: "Comments", placeholder: "Write your comment...", submit: "Post comment", login: "Sign in to comment", empty: "No comments yet. Be the first!", reply: "Reply", cancel: "Cancel", deleted: "Comment deleted", added: "Comment posted", replyTo: "Reply to" },
      fr: { title: "Commentaires", placeholder: "Écrivez votre commentaire...", submit: "Publier", login: "Connectez-vous pour commenter", empty: "Aucun commentaire pour l'instant.", reply: "Répondre", cancel: "Annuler", deleted: "Commentaire supprimé", added: "Commentaire publié", replyTo: "En réponse à" },
      ur: { title: "تبصرے", placeholder: "تبصرہ لکھیں...", submit: "تبصرہ شائع کریں", login: "تبصرے کے لیے سائن ان کریں", empty: "ابھی تک کوئی تبصرہ نہیں۔", reply: "جواب دیں", cancel: "منسوخ کریں", deleted: "تبصرہ حذف ہو گیا", added: "تبصرہ شائع ہو گیا", replyTo: "جواب" },
    } as any
  )[i18n.language] || ({} as any);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("blog_post_comments")
      .select("id, post_id, user_id, parent_id, content, is_approved, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) return;
    const rows = (data || []) as CommentRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      rows.forEach((r) => (r.author = map.get(r.user_id) || null));
    }
    setComments(rows);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`blog-comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_post_comments", filter: `post_id=eq.${postId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const submit = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("blog_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        parent_id: replyTo,
        content: trimmed,
      });
      if (error) throw error;
      setContent("");
      setReplyTo(null);
      toast.success(L.added);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("blog_post_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(L.deleted);
  };

  const tree = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const renderComment = (c: CommentRow, depth = 0) => {
    const canDelete = user && (user.id === c.user_id || isAdmin);
    const name = c.author?.full_name || "—";
    const initial = name.charAt(0) || "?";
    return (
      <div key={c.id} className={`${depth > 0 ? (isRtl ? "mr-8" : "ml-8") : ""}`}>
        <div className="flex gap-3 py-4 border-b border-border/60">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {c.author?.avatar_url ? <AvatarImage src={c.author.avatar_url} alt={name} /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: dateLocale })}
                </span>
              </div>
              {canDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.content}</p>
            {user && depth === 0 && (
              <button
                onClick={() => setReplyTo(c.id === replyTo ? null : c.id)}
                className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
              >
                <Reply className="h-3 w-3" />
                {c.id === replyTo ? L.cancel : L.reply}
              </button>
            )}
          </div>
        </div>
        {repliesOf(c.id).map((r) => renderComment(r, depth + 1))}
      </div>
    );
  };

  return (
    <section className="mt-10 pt-8 border-t border-border" dir={isRtl ? "rtl" : "ltr"}>
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        {L.title} ({comments.length})
      </h2>

      {user ? (
        <div className="mb-6 p-4 bg-muted/40 rounded-lg border border-border">
          {replyTo && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
              <span>{L.replyTo}: {comments.find((c) => c.id === replyTo)?.author?.full_name || "..."}</span>
              <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">{L.cancel}</button>
            </div>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={L.placeholder}
            rows={3}
            className="mb-3 bg-background"
          />
          <Button onClick={submit} disabled={submitting || !content.trim()} size="sm">
            {L.submit}
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-muted/40 rounded-lg border border-border text-center">
          <p className="text-sm text-muted-foreground mb-2">{L.login}</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">{L.login}</Link>
          </Button>
        </div>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{L.empty}</p>
      ) : (
        <div className="space-y-0">{tree.map((c) => renderComment(c))}</div>
      )}
    </section>
  );
};

export default BlogComments;
