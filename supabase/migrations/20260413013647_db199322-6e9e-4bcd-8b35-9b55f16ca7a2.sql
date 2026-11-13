ALTER TABLE public.product_orders
ADD CONSTRAINT product_orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;