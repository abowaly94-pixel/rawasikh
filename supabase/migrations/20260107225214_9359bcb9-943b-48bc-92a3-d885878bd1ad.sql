-- Update handle_new_user function to check for skip_student_creation flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  skip_student_creation boolean;
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
  
  -- Check if student creation should be skipped (when created by admin via edge function)
  skip_student_creation := COALESCE((NEW.raw_user_meta_data ->> 'skip_student_creation')::boolean, false);
  
  -- If student and not skipping, create student record automatically
  IF user_role = 'student' AND NOT skip_student_creation THEN
    INSERT INTO public.students (user_id, student_number, status)
    VALUES (
      NEW.id,
      'STU-' || SUBSTRING(NEW.id::text, 1, 8),
      'active'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Clean up duplicate student records (keep the one with school_id or most recent)
DELETE FROM students s1
WHERE s1.id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM students
  ORDER BY user_id, school_id NULLS LAST, created_at DESC
);