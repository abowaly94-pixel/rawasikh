-- Create payment_transactions table to track Paymob transactions
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  paymob_order_id TEXT,
  paymob_transaction_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  payment_method TEXT NOT NULL DEFAULT 'card', -- 'card' or 'wallet'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  reference_type TEXT, -- 'product_order', 'course_purchase', 'subscription', 'cart'
  reference_id UUID, -- the related entity id
  metadata JSONB DEFAULT '{}'::jsonb,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_paymob_order_id ON public.payment_transactions(paymob_order_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update transactions
CREATE POLICY "Admins can update payment transactions"
ON public.payment_transactions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Note: INSERT and UPDATE for normal flow happen via edge functions using service role,
-- which bypass RLS. No public INSERT policy needed.

-- Trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();