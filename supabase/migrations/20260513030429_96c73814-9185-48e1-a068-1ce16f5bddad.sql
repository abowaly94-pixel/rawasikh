UPDATE public.course_purchases
SET payment_status = 'completed'
WHERE id = '82880aa9-824b-4989-bf7e-511311f36ddb'
  AND user_id = '1a9e8e9e-c662-47a1-8a19-896e7d069293'
  AND course_id = '2c44e790-c91a-419d-b7cd-9eaf24f7142f';

UPDATE public.payment_transactions
SET status = 'success', updated_at = now()
WHERE id = '5bf3c3e3-8372-416f-beaa-0efca595baf9'
  AND user_id = '1a9e8e9e-c662-47a1-8a19-896e7d069293'
  AND reference_id = '82880aa9-824b-4989-bf7e-511311f36ddb';