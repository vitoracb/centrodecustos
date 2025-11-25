-- ============================================
-- ADICIONA COLUNA 'value' À TABELA CONTRACTS
-- ============================================
-- Execute este script se a tabela contracts já existir sem a coluna 'value'

-- Adiciona a coluna 'value' se não existir
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2);

-- Se a tabela não existir, cria ela completa
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('principal', 'terceirizados')),
  contract_date DATE,
  value NUMERIC(12, 2),
  cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que os índices existam
CREATE INDEX IF NOT EXISTS idx_contracts_cost_center_id
  ON public.contracts(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_contracts_contract_date
  ON public.contracts(contract_date);

CREATE INDEX IF NOT EXISTS idx_contracts_category
  ON public.contracts(category);

-- Habilita RLS se ainda não estiver habilitado
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow anon select contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow anon insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow anon update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow anon delete contracts" ON public.contracts;

-- Cria políticas RLS
CREATE POLICY "Allow anon select contracts"
  ON public.contracts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert contracts"
  ON public.contracts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update contracts"
  ON public.contracts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete contracts"
  ON public.contracts
  FOR DELETE
  TO anon
  USING (true);

