-- Insert course categories
INSERT INTO public.course_categories (id, name, description, icon) VALUES
('a1b2c3d4-1111-1111-1111-111111111111', 'البرمجة والتقنية', 'كورسات في البرمجة وتطوير البرمجيات', '💻'),
('a1b2c3d4-2222-2222-2222-222222222222', 'الرياضيات', 'كورسات الرياضيات لجميع المراحل', '📐'),
('a1b2c3d4-3333-3333-3333-333333333333', 'اللغات', 'تعلم اللغات المختلفة', '🌍'),
('a1b2c3d4-4444-4444-4444-444444444444', 'العلوم', 'الفيزياء والكيمياء والأحياء', '🔬'),
('a1b2c3d4-5555-5555-5555-555555555555', 'التصميم', 'التصميم الجرافيكي والإبداعي', '🎨'),
('a1b2c3d4-6666-6666-6666-666666666666', 'إدارة الأعمال', 'المهارات الإدارية والقيادية', '📊');

-- Update existing courses with categories
UPDATE public.courses SET category_id = 'a1b2c3d4-1111-1111-1111-111111111111' WHERE title LIKE '%Python%' OR title LIKE '%الويب%';
UPDATE public.courses SET category_id = 'a1b2c3d4-2222-2222-2222-222222222222' WHERE title LIKE '%الرياضيات%';
UPDATE public.courses SET category_id = 'a1b2c3d4-3333-3333-3333-333333333333' WHERE title LIKE '%الإنجليزية%';
UPDATE public.courses SET category_id = 'a1b2c3d4-4444-4444-4444-444444444444' WHERE title LIKE '%الفيزياء%' OR title LIKE '%الكيمياء%';
UPDATE public.courses SET category_id = 'a1b2c3d4-5555-5555-5555-555555555555' WHERE title LIKE '%تصميم%' OR title LIKE '%Photoshop%';
UPDATE public.courses SET category_id = 'a1b2c3d4-6666-6666-6666-666666666666' WHERE title LIKE '%إدارة%';