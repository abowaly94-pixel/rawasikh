CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email
  );
  
  -- Get the role
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student');
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If student, create student record automatically
  IF user_role = 'student' THEN
    INSERT INTO public.students (user_id, student_number, status)
    VALUES (
      NEW.id,
      'STU-' || SUBSTRING(NEW.id::text, 1, 8),
      'active'
    );
  END IF;
  
  RETURN NEW;
END;
$$;