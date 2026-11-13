-- Create teacher attendance table
CREATE TABLE public.teacher_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.online_sessions(id) ON DELETE CASCADE,
  attendance_type text NOT NULL CHECK (attendance_type IN ('lesson', 'session')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
  joined_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teacher_attendance_unique UNIQUE (teacher_id, lesson_id, session_id, date)
);

-- Enable RLS
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Admins can manage all teacher attendance
CREATE POLICY "Admins can manage teacher attendance"
ON public.teacher_attendance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view their own attendance
CREATE POLICY "Teachers can view their own attendance"
ON public.teacher_attendance
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert their own attendance (when joining)
CREATE POLICY "Teachers can insert their own attendance"
ON public.teacher_attendance
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own attendance
CREATE POLICY "Teachers can update their own attendance"
ON public.teacher_attendance
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Add lesson_id to student attendance for tracking specific lesson attendance
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS joined_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX idx_teacher_attendance_teacher ON public.teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date ON public.teacher_attendance(date);
CREATE INDEX idx_attendance_lesson ON public.attendance(lesson_id);