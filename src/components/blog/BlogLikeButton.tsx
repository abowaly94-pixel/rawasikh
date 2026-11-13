import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface BlogLikeButtonProps {
  postId: string;
}

const BlogLikeButton = ({ postId }: BlogLikeButtonProps) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginMsg =
    i18n.language === "en" ? "Please sign in to like" :
    i18n.language === "fr" ? "Connectez-vous pour aimer" :
    i18n.language === "ur" ? "پسند کرنے کے لیے سائن ان کریں" :
    "سجل دخولك للإعجاب";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count: c } = await supabase
        .from("blog_post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (!cancelled) setCount(c || 0);

      if (user) {
        const { data } = await supabase
          .from("blog_post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLiked(!!data);
      } else if (!cancelled) {
        setLiked(false);
      }
    };
    load();

    const channel = supabase
      .channel(`blog-likes-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_post_likes", filter: `post_id=eq.${postId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [postId, user?.id]);

  const toggle = async () => {
    if (!user) {
      toast.error(loginMsg, { action: { label: "Login", onClick: () => navigate("/auth") } });
      return;
    }
    setLoading(true);
    try {
      if (liked) {
        await supabase.from("blog_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await supabase.from("blog_post_likes").insert({ post_id: postId, user_id: user.id });
        setLiked(true);
        setCount((c) => c + 1);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-2"
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      {count}
    </Button>
  );
};

export default BlogLikeButton;
