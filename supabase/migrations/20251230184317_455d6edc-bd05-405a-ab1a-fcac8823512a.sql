-- Add Foreign Key constraints to enable Supabase embedding (PostgREST joins)
-- Using NOT VALID to avoid blocking on existing data

-- Students table FKs
ALTER TABLE public.students
ADD CONSTRAINT fk_students_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE public.students
ADD CONSTRAINT fk_students_parent_id 
FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE public.students
ADD CONSTRAINT fk_students_class_id 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL
NOT VALID;

-- Classes table FK
ALTER TABLE public.classes
ADD CONSTRAINT fk_classes_teacher_id 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL
NOT VALID;

-- Grades table FKs
ALTER TABLE public.grades
ADD CONSTRAINT fk_grades_student_id 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE public.grades
ADD CONSTRAINT fk_grades_exam_id 
FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE
NOT VALID;

-- Exams table FK
ALTER TABLE public.exams
ADD CONSTRAINT fk_exams_class_id 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE
NOT VALID;

-- Attendance table FKs
ALTER TABLE public.attendance
ADD CONSTRAINT fk_attendance_student_id 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE public.attendance
ADD CONSTRAINT fk_attendance_class_id 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE
NOT VALID;

-- Performance notes FK
ALTER TABLE public.student_performance_notes
ADD CONSTRAINT fk_performance_notes_student_id 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
NOT VALID;

ALTER TABLE public.student_performance_notes
ADD CONSTRAINT fk_performance_notes_teacher_id 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE
NOT VALID;

-- Add indexes for FK columns to improve join performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON public.grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON public.attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_performance_notes_student_id ON public.student_performance_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_notes_teacher_id ON public.student_performance_notes(teacher_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';