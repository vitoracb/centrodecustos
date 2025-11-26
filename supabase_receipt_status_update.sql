-- ============================================
-- ATUALIZA CONSTRAINT DE STATUS PARA RECEBIMENTOS
-- ============================================
-- Este script atualiza a constraint CHECK do campo status na tabela financial_transactions
-- para incluir os novos valores de recebimentos: 'A_CONFIRMAR', 'CONFIRMADO', 'A_RECEBER', 'RECEBIDO'
-- Mantém os status de despesas: 'CONFIRMAR', 'CONFIRMADO', 'A_PAGAR', 'PAGO'

-- Remove a constraint antiga se existir
DO $$ 
BEGIN
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check1;
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check2;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Adiciona a nova constraint com todos os status válidos (despesas e recebimentos)
-- Nota: CONFIRMADO é usado tanto para despesas quanto para recebimentos
ALTER TABLE public.financial_transactions
ADD CONSTRAINT financial_transactions_status_check CHECK (
  status IN (
    -- Status de despesas
    'CONFIRMAR',
    'CONFIRMADO',
    'A_PAGAR',
    'PAGO',
    -- Status de recebimentos
    'A_CONFIRMAR',
    'A_RECEBER',
    'RECEBIDO',
    -- Status legado (compatibilidade)
    'PREVISTO',
    'PREVISTA'
  )
);

-- Atualiza status antigos de recebimentos para o novo formato
UPDATE public.financial_transactions
SET status = 'A_CONFIRMAR'
WHERE type = 'RECEITA' 
  AND (status IS NULL OR status = '' OR status = 'CONFIRMADO' OR status = 'PREVISTO' OR status = 'PREVISTA');

-- Comentário para documentação
COMMENT ON COLUMN public.financial_transactions.status IS 'Status da transação: 
  Despesas: CONFIRMAR, CONFIRMADO, A_PAGAR, PAGO (requer comprovante)
  Recebimentos: A_CONFIRMAR, CONFIRMADO, A_RECEBER, RECEBIDO';

