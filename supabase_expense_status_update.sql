-- ============================================
-- ATUALIZA CONSTRAINT DE STATUS PARA DESPESAS
-- ============================================
-- Este script atualiza a constraint CHECK do campo status na tabela financial_transactions
-- para incluir os novos valores: 'CONFIRMAR', 'CONFIRMADO', 'A_PAGAR', 'PAGO'

-- Remove a constraint antiga se existir
DO $$ 
BEGIN
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check1;
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check2;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Adiciona a nova constraint com todos os status válidos
ALTER TABLE public.financial_transactions
ADD CONSTRAINT financial_transactions_status_check CHECK (
  status IN (
    'CONFIRMAR',
    'CONFIRMADO',
    'A_PAGAR',
    'PAGO',
    'PREVISTO' -- Mantém para compatibilidade com dados antigos
  )
);

-- Atualiza status antigos para o novo formato
UPDATE public.financial_transactions
SET status = 'CONFIRMAR'
WHERE status IS NULL OR status = '';

-- Comentário para documentação
COMMENT ON COLUMN public.financial_transactions.status IS 'Status da transação: CONFIRMAR (padrão), CONFIRMADO, A_PAGAR, PAGO (requer comprovante)';

