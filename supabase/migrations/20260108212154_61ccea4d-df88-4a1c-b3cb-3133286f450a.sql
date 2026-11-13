-- Update the handle_new_user trigger to auto-create student record with all data from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _school_id uuid;
  _stage_id uuid;
  _grade_level_id uuid;
  _class_id uuid;
  _phone text;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- Get role from metadata
  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student');
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  -- If student, create student record with school/stage/grade/class from metadata
  IF _role = 'student' THEN
    -- Parse metadata values
    _school_id := NULLIF(NEW.raw_user_meta_data ->> 'school_id', '')::uuid;
    _stage_id := NULLIF(NEW.raw_user_meta_data ->> 'stage_id', '')::uuid;
    _grade_level_id := NULLIF(NEW.raw_user_meta_data ->> 'grade_level_id', '')::uuid;
    _class_id := NULLIF(NEW.raw_user_meta_data ->> 'class_id', '')::uuid;
    
    -- Handle 'none' value for class_id
    IF NEW.raw_user_meta_data ->> 'class_id' = 'none' THEN
      _class_id := NULL;
    END IF;
    
    INSERT INTO public.students (user_id, school_id, stage_id, grade_level_id, class_id, status)
    VALUES (NEW.id, _school_id, _stage_id, _grade_level_id, _class_id, 'active');
  END IF;
  
  RETURN NEW;
END;
$$;