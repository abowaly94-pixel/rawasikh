-- Event-driven in-app notifications.
--
-- The notifications table only grants INSERT to service_role, so every insert
-- below happens inside a SECURITY DEFINER trigger function (owned by the
-- migration role), which bypasses RLS safely. Each insert is wrapped in an
-- exception block so a notification failure can never break the business
-- operation that fired it (purchase, task creation, payment review).
--
-- Events covered:
--   1. Completed full-course purchase          -> notify the buyer
--   2. Completed course-level purchase         -> notify the buyer
--   3. New course task (course_tasks insert)   -> notify enrolled students + parents
--   4. Payment submission approved/rejected    -> notify the submitter

-- ---------------------------------------------------------------------------
-- 1) Full course purchase completed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_course_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title text;
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Avoid a second notification when an already-completed row is updated.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status = 'completed' THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'course_purchase',
      'تم تفعيل اشتراكك في الدورة',
      COALESCE(course_title, 'دورة تدريبية'),
      '/courses/' || NEW.course_id,
      jsonb_build_object('course_id', NEW.course_id, 'purchase_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_course_purchase failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_purchase ON public.course_purchases;
CREATE TRIGGER notify_course_purchase
  AFTER INSERT OR UPDATE OF payment_status ON public.course_purchases
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_purchase();

-- ---------------------------------------------------------------------------
-- 2) Course level purchase completed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_course_level_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title text;
  level_title text;
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status = 'completed' THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    SELECT c.title, cl.title
      INTO course_title, level_title
    FROM public.course_levels cl
    JOIN public.courses c ON c.id = cl.course_id
    WHERE cl.id = NEW.level_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'course_purchase',
      'تم تفعيل اشتراكك في مستوى جديد',
      COALESCE(course_title, 'دورة تدريبية') || COALESCE(' — ' || level_title, ''),
      '/courses/' || NEW.course_id,
      jsonb_build_object('course_id', NEW.course_id, 'level_id', NEW.level_id, 'purchase_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_course_level_purchase failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_level_purchase ON public.course_level_purchases;
CREATE TRIGGER notify_course_level_purchase
  AFTER INSERT OR UPDATE OF payment_status ON public.course_level_purchases
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_level_purchase();

-- ---------------------------------------------------------------------------
-- 3) New course task assigned to everyone enrolled in the course
--    (the app's "مهام الطلاب" feature stores tasks in course_tasks)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_course_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title text;
BEGIN
  BEGIN
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;

    WITH enrolled AS (
      SELECT user_id
      FROM public.course_purchases
      WHERE course_id = NEW.course_id AND payment_status = 'completed'
      UNION
      SELECT user_id
      FROM public.course_level_purchases
      WHERE course_id = NEW.course_id AND payment_status = 'completed'
    ),
    recipients AS (
      SELECT user_id AS recipient_id FROM enrolled WHERE user_id IS NOT NULL
      UNION
      SELECT s.parent_id
      FROM public.students s
      JOIN enrolled e ON e.user_id = s.user_id
      WHERE s.parent_id IS NOT NULL
    )
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    SELECT
      r.recipient_id,
      'task_assigned',
      'مهمة جديدة: ' || NEW.title,
      COALESCE(course_title, 'دورة تدريبية'),
      '/dashboard/my-tasks',
      jsonb_build_object('task_id', NEW.id, 'course_id', NEW.course_id, 'due_date', NEW.due_date)
    FROM recipients r
    -- Only notify ids that really exist as platform users.
    JOIN public.profiles p ON p.id = r.recipient_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_course_task_assigned failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_task_assigned ON public.course_tasks;
CREATE TRIGGER notify_course_task_assigned
  AFTER INSERT ON public.course_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_task_assigned();

-- ---------------------------------------------------------------------------
-- 4) Payment submission reviewed (package subscription)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_payment_submission_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  package_name text;
  notif_title text;
  notif_body text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT name INTO package_name FROM public.packages WHERE id = NEW.package_id;

    IF NEW.status = 'approved' THEN
      notif_title := 'تمت الموافقة على الدفع';
      notif_body := COALESCE('تم تفعيل اشتراكك في ' || package_name, 'تم تفعيل اشتراكك بنجاح');
    ELSE
      notif_title := 'تم رفض إثبات الدفع';
      notif_body := COALESCE('لم يتم قبول إثبات الدفع لباقة ' || package_name, 'لم يتم قبول إثبات الدفع');
    END IF;

    IF NEW.admin_notes IS NOT NULL AND length(trim(NEW.admin_notes)) > 0 THEN
      notif_body := notif_body || ' — ملاحظات: ' || NEW.admin_notes;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'payment_review',
      notif_title,
      notif_body,
      '/dashboard',
      jsonb_build_object('submission_id', NEW.id, 'package_id', NEW.package_id, 'status', NEW.status)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_payment_submission_reviewed failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_payment_submission_reviewed ON public.payment_submissions;
CREATE TRIGGER notify_payment_submission_reviewed
  AFTER UPDATE OF status ON public.payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_submission_reviewed();
