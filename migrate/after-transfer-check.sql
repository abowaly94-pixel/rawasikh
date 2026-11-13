-- ============================================================
-- فحص ما بعد نقل المشروع (Supabase SQL Editor)
-- شغّل كل بلوك لوحده، أو الكل مرة واحدة.
-- الأرقام المتوقعة جاية من الباك أب بتاريخ 2026-11-01
-- ============================================================

-- 1) الأرقام الحرجة (لازم تطابق بالحرف)
select 'profiles'                as t, count(*) as n from public.profiles
union all select 'site_visits',            count(*) from public.site_visits
union all select 'lecture_attendance',     count(*) from public.lecture_attendance
union all select 'course_payment_plans',   count(*) from public.course_payment_plans
union all select 'certificates',           count(*) from public.certificates
union all select 'courses',                count(*) from public.courses
union all select 'course_payments',        count(*) from public.course_payments
union all select 'staff_permissions',      count(*) from public.staff_permissions
order by t;
-- المتوقع:  certificates=20 · course_payment_plans=66 · course_payments=36
--           courses=? · lecture_attendance=138 · profiles=110
--           site_visits=10505 · staff_permissions=11


-- 2) عدد الجداول في public  (المتوقع 89)
select count(*) as public_tables
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';


-- 3) المستخدمين (المتوقع 110)
select count(*) as auth_users from auth.users;


-- 4) الـ Buckets + عدد الملفات في كل واحد
select b.id,
       b.public,
       (select count(*) from storage.objects o where o.bucket_id = b.id) as files
from storage.buckets b
order by b.id;
-- المتوقع: site-assets=38 · lesson-thumbnails=53 · lesson-pdfs=10
--           payment-screenshots · task-submissions  (خاصة/غير قابلة للعد من برّه)
-- لو category-icons أو question-images مش موجودين → رفع أيقونات الأقسام
-- وصور الأسئلة مش هيشتغل (دي مشكلة قديمة مش من النقل).


-- 5) الكرون (المتوقع 2 jobs و active = true)
select jobid, jobname, schedule, active, command
from cron.job
order by jobid;
-- ⚠️ لو command فيه xeuncbgdnxgnaamyepog → الكرون بيضرب مشروع ميت، لازم يتصلح


-- 6) الدوال في public (RPCs)
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
order by 1;
-- لازم تلاقي: filter_student_ids · get_site_visit_stats · set_certificate_honorific
-- (التلاتة دول مستخدمين في الكود ومش موجودين في المجلد supabase/migrations)


-- 7) RLS متفعّل على الجداول الحساسة
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles','course_payments','payment_submissions',
                    'staff_permissions','certificates','lecture_attendance',
                    'course_payment_plans')
order by 1;
-- لازم كلهم rls_enabled = true


-- 8) أقدم/أحدث سجل دخول (تأكيد إن الداتا حيّة مش مرمّرة)
select max(last_sign_in_at) as last_login, count(*) filter (where last_sign_in_at is not null) as active_users
from auth.users;
