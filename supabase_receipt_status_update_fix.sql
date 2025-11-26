-- ============================================
-- CORRIGE CONSTRAINT DE STATUS PARA RECEBIMENTOS
-- ============================================
-- Este script remove TODAS as constraints antigas e cria uma nova
-- que aceita todos os status de despesas e recebimentos

-- Primeiro, vamos verificar e remover TODAS as possíveis constraints
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Lista todas as constraints CHECK na tabela
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.financial_transactions'::regclass 
        AND contype = 'c'
        AND conname LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint removida: %', constraint_name;
    END LOOP;
END $$;

-- Agora cria a nova constraint com TODOS os status válidos
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
  AND (
    status IS NULL 
    OR status = '' 
    OR status = 'CONFIRMADO'
    OR status = 'PREVISTO' 
    OR status = 'PREVISTA'
  );

-- Verifica se a constraint foi criada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'financial_transactions_status_check'
        AND conrelid = 'public.financial_transactions'::regclass
    ) THEN
        RAISE NOTICE '✅ Constraint criada com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro: Constraint não foi criada!';
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN public.financial_transactions.status IS 'Status da transação: 
  Despesas: CONFIRMAR, CONFIRMADO, A_PAGAR, PAGO (requer comprovante)
  Recebimentos: A_CONFIRMAR, CONFIRMADO, A_RECEBER, RECEBIDO';

