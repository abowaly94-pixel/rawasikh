-- Notify every platform user when a blog post is published.
--
-- A post can be created as a draft and published later, so the trigger covers
-- both paths:
--   * INSERT with is_published = true
--   * UPDATE that flips is_published from false/null to true
-- Edits to an already-published post never create notifications.
--
-- The insert runs inside a SECURITY DEFINER function because the notifications
-- table has no INSERT policy for end users, and it is wrapped in an exception
-- block so a notification failure can never break saving/publishing the post.

CREATE OR REPLACE FUNCTION public.notify_blog_post_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published IS NOT TRUE THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify on the draft -> published transition.
    IF NOT (OLD.is_published IS DISTINCT FROM TRUE AND NEW.is_published IS TRUE) THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    SELECT
      p.id,
      'blog_post',
      'مقال جديد: ' || NEW.title,
      COALESCE(NULLIF(trim(NEW.excerpt), ''), 'اضغط لقراءة المقال'),
      '/blog/' || NEW.id,
      jsonb_build_object('post_id', NEW.id, 'category', NEW.category)
    FROM public.profiles p;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_blog_post_published failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_blog_post_published ON public.blog_posts;
CREATE TRIGGER notify_blog_post_published
  AFTER INSERT OR UPDATE OF is_published ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_blog_post_published();
