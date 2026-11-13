-- Update handle_new_user trigger to also create school record for school role
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
  _phone text;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  );
  
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