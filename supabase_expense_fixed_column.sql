-- ============================================
-- ADICIONA COLUNA 'is_fixed' À TABELA FINANCIAL_TRANSACTIONS
-- ============================================
-- Este script adiciona a coluna is_fixed para marcar despesas fixas/recorrentes
-- que devem ser geradas automaticamente todo mês

-- Adiciona a coluna is_fixed se não existir
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE;

-- Adiciona índice para melhor performance nas consultas de despesas fixas
CREATE INDEX IF NOT EXISTS idx_financial_transactions_is_fixed
  ON public.financial_transactions(is_fixed)
  WHERE is_fixed = TRUE;

-- Adiciona índice composto para consultas de despesas fixas por tipo e centro
CREATE INDEX IF NOT EXISTS idx_financial_transactions_fixed_type_center
  ON public.financial_transactions(type, is_fixed, cost_center_id)
  WHERE is_fixed = TRUE AND type = 'DESPESA';

-- Comentário para documentação
COMMENT ON COLUMN public.financial_transactions.is_fixed IS 
  'Indica se a despesa é fixa/recorrente e deve ser gerada automaticamente todo mês';

