-- Add lessons for Python course sections
-- Section: مقدمة في البرمجة
INSERT INTO public.course_lessons (section_id, title, video_url, description, duration_minutes, order_index, is_free) VALUES
('230005dc-592e-492b-bab8-ddaa13757067', 'ما هي البرمجة؟', 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 'مقدمة شاملة عن البرمجة وأهميتها', 15, 0, true),
('230005dc-592e-492b-bab8-ddaa13757067', 'لماذا نتعلم Python؟', 'https://www.youtube.com/watch?v=Y8Tko2YC5hA', 'مميزات لغة Python واستخداماتها', 12, 1, false),
('230005dc-592e-492b-bab8-ddaa13757067', 'تثبيت Python', 'https://www.youtube.com/watch?v=YYXdXT2l-Gg', 'كيفية تثبيت Python على جهازك', 20, 2, false);

-- Section: أساسيات Python
INSERT INTO public.course_lessons (section_id, title, video_url, description, duration_minutes, order_index, is_free) VALUES
('a7123328-7de2-4757-8fb0-fcefbb476eab', 'أول برنامج Python', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 'كتابة أول برنامج Hello World', 18, 0, false),
('a7123328-7de2-4757-8fb0-fcefbb476eab', 'التعليقات في Python', 'https://www.youtube.com/watch?v=W8KRzm-HUcc', 'كيفية كتابة التعليقات', 10, 1, false);

-- Section: المتغيرات والبيانات
INSERT INTO public.course_lessons (section_id, title, video_url, description, duration_minutes, order_index, is_free) VALUES
('3a9d0ed1-9c5b-4d7a-9819-302f3e3ae275', 'المتغيرات', 'https://www.youtube.com/watch?v=cQT33yu9pY8', 'فهم المتغيرات وكيفية استخدامها', 25, 0, false),
('3a9d0ed1-9c5b-4d7a-9819-302f3e3ae275', 'أنواع البيانات', 'https://www.youtube.com/watch?v=khKv-8q7YmY', 'الأنواع المختلفة للبيانات', 22, 1, false);

-- Add lessons for Web Development course
INSERT INTO public.course_lessons (section_id, title, video_url, description, duration_minutes, order_index, is_free) VALUES
('29b06c3d-46a5-41f3-8740-323b0f62b860', 'مقدمة في تطوير الويب', 'https://www.youtube.com/watch?v=ysEN5RaKOlA', 'ما هو تطوير الويب وكيف يعمل', 20, 0, true),
('29b06c3d-46a5-41f3-8740-323b0f62b860', 'أدوات المطور', 'https://www.youtube.com/watch?v=x4q86IjJFag', 'الأدوات اللازمة لتطوير الويب', 15, 1, false),
('f04d8906-542a-41da-a971-391ac8fb02f8', 'أساسيات HTML', 'https://www.youtube.com/watch?v=qz0aGYrrlhU', 'بنية صفحات الويب', 30, 0, false),
('f04d8906-542a-41da-a971-391ac8fb02f8', 'أساسيات CSS', 'https://www.youtube.com/watch?v=1PnVor36_40', 'تنسيق صفحات الويب', 35, 1, false),
('19c3f2cc-cd5f-4012-b179-edd8762fa34d', 'مقدمة JavaScript', 'https://www.youtube.com/watch?v=W6NZfCO5SIk', 'أساسيات JavaScript', 40, 0, false);

-- Add lessons for English course (free course)
INSERT INTO public.course_lessons (section_id, title, video_url, description, duration_minutes, order_index, is_free) VALUES
('8e77705d-928c-4627-ac51-1fe8caa542bf', 'الحروف الإنجليزية', 'https://www.youtube.com/watch?v=36IBDpTRVNE', 'تعلم الحروف الإنجليزية', 20, 0, true),
('8e77705d-928c-4627-ac51-1fe8caa542bf', 'الأرقام بالإنجليزية', 'https://www.youtube.com/watch?v=DR-cfDsHCGA', 'تعلم الأرقام', 15, 1, true),
('796a5a59-7006-4b34-b6cd-6fd4c3c33058', 'التحية والترحيب', 'https://www.youtube.com/watch?v=oWKpMDpjEWI', 'عبارات التحية الأساسية', 18, 0, true);