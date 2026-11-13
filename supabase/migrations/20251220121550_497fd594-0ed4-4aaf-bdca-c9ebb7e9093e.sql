-- Add sections for Python course
INSERT INTO public.course_sections (course_id, title, order_index) VALUES
('2b43702d-24a3-4324-a141-aea89f3972bf', 'مقدمة في البرمجة', 0),
('2b43702d-24a3-4324-a141-aea89f3972bf', 'أساسيات Python', 1),
('2b43702d-24a3-4324-a141-aea89f3972bf', 'المتغيرات والبيانات', 2);

-- Add sections for Web Development course
INSERT INTO public.course_sections (course_id, title, order_index) VALUES
('88ccb5f6-9116-4b4d-99e3-a0f2175e6633', 'مقدمة في تطوير الويب', 0),
('88ccb5f6-9116-4b4d-99e3-a0f2175e6633', 'أساسيات HTML و CSS', 1),
('88ccb5f6-9116-4b4d-99e3-a0f2175e6633', 'JavaScript للمبتدئين', 2);

-- Add sections for English course
INSERT INTO public.course_sections (course_id, title, order_index) VALUES
('06173cdc-244f-4d6c-9f8c-6d5c9fc9dcdd', 'الحروف والأرقام', 0),
('06173cdc-244f-4d6c-9f8c-6d5c9fc9dcdd', 'المحادثات الأساسية', 1);

-- Add sections for Math course
INSERT INTO public.course_sections (course_id, title, order_index) VALUES
('fba5aa33-6b4d-499c-a884-3348f137eaf3', 'الجبر', 0),
('fba5aa33-6b4d-499c-a884-3348f137eaf3', 'الهندسة', 1);