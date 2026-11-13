-- Create schedule/lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons
CREATE POLICY "Anyone authenticated can view lessons"
ON public.lessons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage all lessons"
ON public.lessons FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their lessons"
ON public.lessons FOR ALL
USING (auth.uid() = teacher_id);

-- Update trigger
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();