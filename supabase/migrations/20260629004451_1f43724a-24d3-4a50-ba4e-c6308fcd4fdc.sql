-- Likes table
CREATE TABLE public.blog_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT ON public.blog_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.blog_post_likes TO authenticated;
GRANT ALL ON public.blog_post_likes TO service_role;

ALTER TABLE public.blog_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.blog_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.blog_post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own like"
  ON public.blog_post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_blog_post_likes_post ON public.blog_post_likes(post_id);

-- Comments table
CREATE TABLE public.blog_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.blog_post_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_comments TO authenticated;
GRANT ALL ON public.blog_post_comments TO service_role;

ALTER TABLE public.blog_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved comments are viewable by everyone"
  ON public.blog_post_comments FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create comments"
  ON public.blog_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or admin can update comment"
  ON public.blog_post_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete comment"
  ON public.blog_post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_blog_post_comments_post ON public.blog_post_comments(post_id);
CREATE INDEX idx_blog_post_comments_parent ON public.blog_post_comments(parent_id);

CREATE TRIGGER trg_blog_post_comments_updated_at
BEFORE UPDATE ON public.blog_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_post_comments;