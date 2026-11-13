
ALTER TABLE public.product_orders ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
ALTER TABLE public.course_purchases ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
ALTER TABLE public.course_level_purchases ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
