-- Create enum for meeting type
CREATE TYPE public.meeting_type AS ENUM ('google_meet', 'zoom', 'other');

-- Create online sessions table
CREATE TABLE public.online_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  teacher_id UUID NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  meeting_link TEXT,
  meeting_type meeting_type DEFAULT 'google_meet',
  max_students INTEGER DEFAULT 30,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session enrollments table
CREATE TABLE public.session_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.online_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'enrolled',
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.online_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for online_sessions
CREATE POLICY "Anyone can view active sessions"
ON public.online_sessions FOR SELECT
USING (is_active = true);

CREATE POLICY "Teachers can create sessions"
ON public.online_sessions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update their sessions"
ON public.online_sessions FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their sessions"
ON public.online_sessions FOR DELETE
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all sessions"
ON public.online_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for session_enrollments
CREATE POLICY "Users can view their enrollments"
ON public.session_enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in sessions"
ON public.session_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unenroll from sessions"
ON public.session_enrollments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view enrollments for their sessions"
ON public.session_enrollments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.online_sessions
  WHERE online_sessions.id = session_enrollments.session_id
  AND online_sessions.teacher_id = auth.uid()
));

CREATE POLICY "Admins can manage all enrollments"
ON public.session_enrollments FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_online_sessions_updated_at
BEFORE UPDATE ON public.online_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_enrollments;