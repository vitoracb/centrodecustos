-- ============================================
-- ATUALIZA CONSTRAINT DE STATUS NA TABELA ORDERS
-- ============================================
-- Este script atualiza a constraint CHECK do campo status para incluir
-- os novos valores: 'orcamento_aprovado' e 'orcamento_reprovado'

-- Remove a constraint antiga se existir (pode ter nomes diferentes)
DO $$ 
BEGIN
    -- Tenta remover constraints comuns
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check1;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check2;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Adiciona a nova constraint com todos os status válidos
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'orcamento_solicitado',
    'orcamento_pendente',
    'orcamento_enviado',
    'orcamento_aprovado',
    'orcamento_reprovado',
    'em_execucao',
    'finalizado'
  )
);

-- Comentário para documentação
COMMENT ON COLUMN public.orders.status IS 'Status do pedido: orcamento_solicitado, orcamento_pendente, orcamento_enviado, orcamento_aprovado, orcamento_reprovado, em_execucao, finalizado';

