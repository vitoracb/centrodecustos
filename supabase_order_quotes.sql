CREATE TABLE IF NOT EXISTS public.order_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_quotes_order_id
  ON public.order_quotes(order_id);

ALTER TABLE public.order_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select order quotes"
  ON public.order_quotes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert order quotes"
  ON public.order_quotes
  FOR INSERT
  TO anon
  WITH CHECK (true);

