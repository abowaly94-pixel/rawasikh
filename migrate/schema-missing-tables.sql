-- ============================================================
-- جداول موجودة في الداتابيز الحقيقية وغير موجودة في supabase/migrations
-- مولّدة آليًا من الباك أب: rawasikh-backup-2026-11-01-13-50-14.json
-- ⚠️ راجعها قبل التنفيذ — الأنواع مستنتجة من البيانات، والـ RLS لازم تتكتب يدويًا
-- ============================================================

CREATE TABLE IF NOT EXISTS public."certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "course_id" uuid,
  "certificate_number" text,
  "student_name" text,
  "course_title" text,
  "issued_at" timestamptz,
  "honorific" text
);
ALTER TABLE public."certificates" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."certificates" TO authenticated;
ALTER TABLE public."certificates" ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES public."students"(id) ON DELETE SET NULL;
ALTER TABLE public."certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "certificates_student_id_idx" ON public."certificates"("student_id");
CREATE INDEX IF NOT EXISTS "certificates_course_id_idx" ON public."certificates"("course_id");

CREATE TABLE IF NOT EXISTS public."course_payment_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "course_id" uuid,
  "total_amount" integer,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "next_due_date" date,
  "last_reminder_sent_date" date
);
ALTER TABLE public."course_payment_plans" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."course_payment_plans" TO authenticated;
ALTER TABLE public."course_payment_plans" ADD CONSTRAINT "course_payment_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES public."students"(id) ON DELETE SET NULL;
ALTER TABLE public."course_payment_plans" ADD CONSTRAINT "course_payment_plans_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
ALTER TABLE public."course_payment_plans" ADD CONSTRAINT "course_payment_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "course_payment_plans_student_id_idx" ON public."course_payment_plans"("student_id");
CREATE INDEX IF NOT EXISTS "course_payment_plans_course_id_idx" ON public."course_payment_plans"("course_id");
CREATE INDEX IF NOT EXISTS "course_payment_plans_created_by_idx" ON public."course_payment_plans"("created_by");

CREATE TABLE IF NOT EXISTS public."course_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" uuid,
  "amount" integer,
  "paid_at" date,
  "channel" text,
  "reference" text,
  "notes" text,
  "source" text,
  "recorded_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."course_payments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."course_payments" TO authenticated;
ALTER TABLE public."course_payments" ADD CONSTRAINT "course_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES public."course_payment_plans"(id) ON DELETE SET NULL;
ALTER TABLE public."course_payments" ADD CONSTRAINT "course_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "course_payments_plan_id_idx" ON public."course_payments"("plan_id");
CREATE INDEX IF NOT EXISTS "course_payments_recorded_by_idx" ON public."course_payments"("recorded_by");

-- course_review_screenshots: مفيش صفوف ولا أعمدة — مش ممكن توليد هيكل (اتعمل يدويًا أو من الداشبورد)

CREATE TABLE IF NOT EXISTS public."course_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid,
  "user_id" uuid,
  "rating" integer,
  "review" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "reviewer_name" text
);
ALTER TABLE public."course_reviews" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."course_reviews" TO authenticated;
ALTER TABLE public."course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
ALTER TABLE public."course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "course_reviews_course_id_idx" ON public."course_reviews"("course_id");
CREATE INDEX IF NOT EXISTS "course_reviews_user_id_idx" ON public."course_reviews"("user_id");

CREATE TABLE IF NOT EXISTS public."course_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid,
  "lesson_id" uuid,
  "title" text,
  "description" text,
  "submission_type" text,
  "is_required" boolean,
  "due_date" date,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."course_tasks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."course_tasks" TO authenticated;
ALTER TABLE public."course_tasks" ADD CONSTRAINT "course_tasks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
ALTER TABLE public."course_tasks" ADD CONSTRAINT "course_tasks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES public."lessons"(id) ON DELETE SET NULL;
ALTER TABLE public."course_tasks" ADD CONSTRAINT "course_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "course_tasks_course_id_idx" ON public."course_tasks"("course_id");
CREATE INDEX IF NOT EXISTS "course_tasks_lesson_id_idx" ON public."course_tasks"("lesson_id");
CREATE INDEX IF NOT EXISTS "course_tasks_created_by_idx" ON public."course_tasks"("created_by");

CREATE TABLE IF NOT EXISTS public."course_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid,
  "language" text,
  "title" text,
  "description" text,
  "source_updated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."course_translations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."course_translations" TO authenticated;
ALTER TABLE public."course_translations" ADD CONSTRAINT "course_translations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "course_translations_course_id_idx" ON public."course_translations"("course_id");

CREATE TABLE IF NOT EXISTS public."form_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid,
  "label" text,
  "field_type" text,
  "options" jsonb,
  "rating_max" integer,
  "is_required" boolean,
  "order_index" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."form_fields" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."form_fields" TO authenticated;
ALTER TABLE public."form_fields" ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES public."forms"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "form_fields_form_id_idx" ON public."form_fields"("form_id");

CREATE TABLE IF NOT EXISTS public."form_response_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "response_id" uuid,
  "field_id" uuid,
  "answer_text" text,
  "answer_number" integer,
  "answer_options" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."form_response_answers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."form_response_answers" TO authenticated;
ALTER TABLE public."form_response_answers" ADD CONSTRAINT "form_response_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES public."form_responses"(id) ON DELETE SET NULL;
ALTER TABLE public."form_response_answers" ADD CONSTRAINT "form_response_answers_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES public."form_fields"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "form_response_answers_response_id_idx" ON public."form_response_answers"("response_id");
CREATE INDEX IF NOT EXISTS "form_response_answers_field_id_idx" ON public."form_response_answers"("field_id");

CREATE TABLE IF NOT EXISTS public."form_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid,
  "user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."form_responses" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."form_responses" TO authenticated;
ALTER TABLE public."form_responses" ADD CONSTRAINT "form_responses_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES public."forms"(id) ON DELETE SET NULL;
ALTER TABLE public."form_responses" ADD CONSTRAINT "form_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "form_responses_form_id_idx" ON public."form_responses"("form_id");
CREATE INDEX IF NOT EXISTS "form_responses_user_id_idx" ON public."form_responses"("user_id");

CREATE TABLE IF NOT EXISTS public."forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text,
  "description" text,
  "is_active" boolean DEFAULT false,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "course_id" uuid
);
ALTER TABLE public."forms" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."forms" TO authenticated;
ALTER TABLE public."forms" ADD CONSTRAINT "forms_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "forms_course_id_idx" ON public."forms"("course_id");

CREATE TABLE IF NOT EXISTS public."lecture_attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "zoom_link_id" uuid,
  "course_id" uuid,
  "lesson_id" uuid,
  "student_id" uuid,
  "status" text,
  "joined_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."lecture_attendance" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."lecture_attendance" TO authenticated;
ALTER TABLE public."lecture_attendance" ADD CONSTRAINT "lecture_attendance_zoom_link_id_fkey" FOREIGN KEY ("zoom_link_id") REFERENCES public."zoom_links"(id) ON DELETE SET NULL;
ALTER TABLE public."lecture_attendance" ADD CONSTRAINT "lecture_attendance_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES public."courses"(id) ON DELETE SET NULL;
ALTER TABLE public."lecture_attendance" ADD CONSTRAINT "lecture_attendance_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES public."lessons"(id) ON DELETE SET NULL;
ALTER TABLE public."lecture_attendance" ADD CONSTRAINT "lecture_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES public."students"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "lecture_attendance_zoom_link_id_idx" ON public."lecture_attendance"("zoom_link_id");
CREATE INDEX IF NOT EXISTS "lecture_attendance_course_id_idx" ON public."lecture_attendance"("course_id");
CREATE INDEX IF NOT EXISTS "lecture_attendance_lesson_id_idx" ON public."lecture_attendance"("lesson_id");
CREATE INDEX IF NOT EXISTS "lecture_attendance_student_id_idx" ON public."lecture_attendance"("student_id");

-- shipping_governorates: مفيش صفوف ولا أعمدة — مش ممكن توليد هيكل (اتعمل يدويًا أو من الداشبورد)

CREATE TABLE IF NOT EXISTS public."site_visits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "visitor_id" text,
  "path" text,
  "referrer" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."site_visits" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."site_visits" TO authenticated;

CREATE TABLE IF NOT EXISTS public."staff_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "permission_key" text,
  "granted_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."staff_permissions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."staff_permissions" TO authenticated;
ALTER TABLE public."staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."staff_permissions" ADD CONSTRAINT "staff_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "staff_permissions_user_id_idx" ON public."staff_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "staff_permissions_granted_by_idx" ON public."staff_permissions"("granted_by");

CREATE TABLE IF NOT EXISTS public."task_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid,
  "student_id" uuid,
  "status" text,
  "text_content" text,
  "file_url" text,
  "link_url" text,
  "video_url" text,
  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."task_submissions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."task_submissions" TO authenticated;
ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES public."tasks"(id) ON DELETE SET NULL;
ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES public."students"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "task_submissions_task_id_idx" ON public."task_submissions"("task_id");
CREATE INDEX IF NOT EXISTS "task_submissions_student_id_idx" ON public."task_submissions"("student_id");

CREATE TABLE IF NOT EXISTS public."tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "assigned_by" uuid,
  "title" text,
  "description" text,
  "due_date" date,
  "status" text,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tasks" TO authenticated;
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES public."students"(id) ON DELETE SET NULL;
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "tasks_student_id_idx" ON public."tasks"("student_id");
CREATE INDEX IF NOT EXISTS "tasks_assigned_by_idx" ON public."tasks"("assigned_by");
