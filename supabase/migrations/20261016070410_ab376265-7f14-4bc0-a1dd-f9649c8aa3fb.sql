CREATE TABLE public.portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active portfolio items"
ON public.portfolio
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage portfolio items"
ON public.portfolio
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_portfolio_updated_at
BEFORE UPDATE ON public.portfolio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.portfolio (title, client, description, order_index) VALUES
('تطوير منهج اللغة العربية', 'مدارس الأمل الدولية', 'تطوير منهج متكامل للغة العربية للمرحلة الابتدائية وفق أحدث المعايير', 1),
('برنامج تدريب المعلمين', 'وزارة التربية والتعليم', 'تدريب أكثر من 500 معلم على استراتيجيات التعليم الحديثة والتعلم النشط', 2),
('ترجمة المناهج الجامعية', 'جامعة القاهرة', 'ترجمة دقيقة ومحترفة من المقررات الأكاديمية من الإنجليزية إلى العربية', 3);
