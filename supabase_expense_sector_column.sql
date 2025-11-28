-- ============================================
-- ADICIONA COLUNA 'sector' À TABELA FINANCIAL_TRANSACTIONS
-- ============================================
-- Este script adiciona a coluna sector para categorizar despesas fixas por setor

-- Adiciona a coluna sector se não existir
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS sector TEXT;

-- Adiciona índice para melhor performance nas consultas de despesas por setor
CREATE INDEX IF NOT EXISTS idx_financial_transactions_sector
  ON public.financial_transactions(sector)
  WHERE sector IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.financial_transactions.sector IS 
  'Setor da despesa fixa: Now, Felipe Viatransportes, Terceirizados, Gestão, Ronaldo';

