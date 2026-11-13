INSERT INTO public.blog_categories (name, is_active, order_index) VALUES
  ('أخبار رواسخ', true, 100),
  ('الاستشارات والأبحاث', true, 101),
  ('التطوير المهني', true, 102),
  ('التعليم والتدريب', true, 103),
  ('الجودة والإدارة', true, 104)
ON CONFLICT DO NOTHING;