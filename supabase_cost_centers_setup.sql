-- ============================================
-- CONFIGURAÇÃO DA TABELA COST_CENTERS
-- ============================================
-- Este script garante que a tabela cost_centers tenha todos os campos necessários
-- e os centros de custo padrão (Valença, CNA, Cabrália)

-- Cria a tabela se não existir
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cria índice único no código se não existir
CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_code_unique
  ON public.cost_centers(code);

-- Cria índice no nome para buscas
CREATE INDEX IF NOT EXISTS idx_cost_centers_name
  ON public.cost_centers(name);

-- Habilita RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow anon select cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Allow anon insert cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Allow anon update cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Allow anon delete cost_centers" ON public.cost_centers;

-- Cria políticas RLS
CREATE POLICY "Allow anon select cost_centers"
  ON public.cost_centers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert cost_centers"
  ON public.cost_centers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update cost_centers"
  ON public.cost_centers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete cost_centers"
  ON public.cost_centers
  FOR DELETE
  TO anon
  USING (true);

-- Insere os centros de custo padrão se não existirem
INSERT INTO public.cost_centers (code, name)
VALUES 
  ('valenca', 'Valença'),
  ('cna', 'CNA'),
  ('cabralia', 'Cabrália')
ON CONFLICT (code) DO NOTHING;

