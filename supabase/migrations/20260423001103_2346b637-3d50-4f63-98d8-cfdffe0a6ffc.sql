-- Insert 3 demo level assessments with questions
DO $$
DECLARE
  a1 uuid := gen_random_uuid();
  a2 uuid := gen_random_uuid();
  a3 uuid := gen_random_uuid();
  q uuid;
BEGIN
  -- Assessment 1: English Level Test
  INSERT INTO public.school_level_assessments (id, title, description, max_score, is_active)
  VALUES (a1, 'اختبار تحديد مستوى اللغة الإنجليزية', 'اختبر مستواك في اللغة الإنجليزية لاختيار الكورس المناسب لك (مبتدئ / متوسط / متقدم).', 5, true);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a1, 'Choose the correct sentence:', 'multiple_choice', 1, 1);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'She go to school every day.', false, 1),
    (q, 'She goes to school every day.', true, 2),
    (q, 'She going to school every day.', false, 3),
    (q, 'She gone to school every day.', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a1, 'What is the past tense of "run"?', 'multiple_choice', 1, 2);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'runned', false, 1), (q, 'ran', true, 2), (q, 'run', false, 3), (q, 'running', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a1, 'Choose the correct word: I have ___ apple.', 'multiple_choice', 1, 3);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'a', false, 1), (q, 'an', true, 2), (q, 'the', false, 3), (q, 'some', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a1, '"If I had known, I would have come" — what tense is this?', 'multiple_choice', 1, 4);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'Present perfect', false, 1),
    (q, 'Third conditional', true, 2),
    (q, 'Past simple', false, 3),
    (q, 'Future perfect', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a1, 'Synonym of "happy" is:', 'multiple_choice', 1, 5);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'sad', false, 1), (q, 'angry', false, 2), (q, 'joyful', true, 3), (q, 'tired', false, 4);

  -- Assessment 2: Arabic Level Test
  INSERT INTO public.school_level_assessments (id, title, description, max_score, is_active)
  VALUES (a2, 'اختبار تحديد مستوى اللغة العربية', 'قياس مستواك في النحو والإملاء والقراءة باللغة العربية.', 5, true);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a2, 'ما إعراب كلمة "محمدٌ" في جملة: "محمدٌ مجتهدٌ"؟', 'multiple_choice', 1, 1);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'مبتدأ مرفوع', true, 1),
    (q, 'خبر مرفوع', false, 2),
    (q, 'فاعل مرفوع', false, 3),
    (q, 'مفعول به منصوب', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a2, 'جمع كلمة "كتاب" هو:', 'multiple_choice', 1, 2);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'كتابات', false, 1), (q, 'كُتُب', true, 2), (q, 'كاتبون', false, 3), (q, 'مكتبات', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a2, 'ما نوع "إنّ" في جملة: "إنّ العلمَ نورٌ"؟', 'multiple_choice', 1, 3);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'حرف نصب وتوكيد', true, 1),
    (q, 'حرف جر', false, 2),
    (q, 'حرف عطف', false, 3),
    (q, 'فعل ماضٍ', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a2, 'الكلمة الصحيحة إملائياً:', 'multiple_choice', 1, 4);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'هاذا', false, 1), (q, 'هذا', true, 2), (q, 'هاضا', false, 3), (q, 'هذه الذي', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a2, 'مرادف كلمة "شجاع":', 'multiple_choice', 1, 5);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'جبان', false, 1), (q, 'بطل', true, 2), (q, 'كسول', false, 3), (q, 'حزين', false, 4);

  -- Assessment 3: General Skills / Logic
  INSERT INTO public.school_level_assessments (id, title, description, max_score, is_active)
  VALUES (a3, 'اختبار المهارات والتفكير المنطقي', 'قياس مهارات التفكير المنطقي والحساب الذهني الأساسي.', 5, true);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a3, 'ما الرقم التالي في السلسلة: 2, 4, 8, 16, ___ ؟', 'multiple_choice', 1, 1);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, '24', false, 1), (q, '32', true, 2), (q, '20', false, 3), (q, '18', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a3, 'إذا كان ثلث العدد = 12، فما العدد؟', 'multiple_choice', 1, 2);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, '24', false, 1), (q, '36', true, 2), (q, '4', false, 3), (q, '48', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a3, 'القلم للكتابة كما الفرشاة لـ ___ ؟', 'multiple_choice', 1, 3);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'القراءة', false, 1), (q, 'الرسم', true, 2), (q, 'الجري', false, 3), (q, 'النوم', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a3, 'كم عدد دقائق الساعة الواحدة؟', 'multiple_choice', 1, 4);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, '100', false, 1), (q, '60', true, 2), (q, '24', false, 3), (q, '120', false, 4);

  q := gen_random_uuid();
  INSERT INTO public.school_assessment_questions (id, assessment_id, question_text, question_type, points, order_index)
  VALUES (q, a3, 'إذا كان كل الورود زهور، وبعض الزهور حمراء، فإن:', 'multiple_choice', 1, 5);
  INSERT INTO public.school_assessment_options (question_id, option_text, is_correct, order_index) VALUES
    (q, 'كل الورود حمراء', false, 1),
    (q, 'بعض الورود قد تكون حمراء', true, 2),
    (q, 'لا توجد ورود حمراء', false, 3),
    (q, 'كل الزهور ورود', false, 4);
END $$;