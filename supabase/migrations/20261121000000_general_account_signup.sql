-- Public self-signup creates a "general" account.
--
-- Previously every new auth user got a user_roles row (defaulting to
-- 'student') and, for the student role, a students record. That made the
-- platform effectively student-only for self-registered users.
--
-- The public signup now sends `account_type = 'general'` in the user
-- metadata. For those users we create only the profile: no user_roles row
-- and no students/schools record. An admin assigns the real role later
-- from the users page.
--
-- Admin/edge-function-created accounts are unchanged: they still send a
-- `role` in the metadata and get the same behaviour as before.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _school_id uuid;
  _stage_id uuid;
  _grade_level_id uuid;
  _class_id uuid;
  _is_general boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, whatsapp, country_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'whatsapp',
    NEW.raw_user_meta_data ->> 'country_code'
  );

  -- Public signups have no role yet; leave them as general accounts so an
  -- admin can decide their role later.
  _is_general := COALESCE(NEW.raw_user_meta_data ->> 'account_type' = 'general', false);
  IF _is_general THEN
    RETURN NEW;
  END IF;

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  IF _role = 'student' THEN
    _school_id := NULLIF(NEW.raw_user_meta_data ->> 'school_id', '')::uuid;
    _stage_id := NULLIF(NEW.raw_user_meta_data ->> 'stage_id', '')::uuid;
    _grade_level_id := NULLIF(NEW.raw_user_meta_data ->> 'grade_level_id', '')::uuid;
    _class_id := NULLIF(NEW.raw_user_meta_data ->> 'class_id', '')::uuid;

    IF NEW.raw_user_meta_data ->> 'class_id' = 'none' THEN
      _class_id := NULL;
    END IF;

    INSERT INTO public.students (user_id, school_id, stage_id, grade_level_id, class_id, status)
    VALUES (NEW.id, _school_id, _stage_id, _grade_level_id, _class_id, 'active');
  END IF;

  IF _role = 'school' THEN
    INSERT INTO public.schools (user_id, name, email, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مدرسة جديدة'),
      NEW.email,
      NEW.raw_user_meta_data ->> 'phone'
    );
  END IF;

  RETURN NEW;
END;
$function$;
