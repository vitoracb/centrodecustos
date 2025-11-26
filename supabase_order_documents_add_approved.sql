-- Adiciona coluna 'approved' na tabela order_documents
-- Esta coluna marca qual orçamento foi aprovado para um pedido

ALTER TABLE public.order_documents
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- Cria índice para melhorar performance em consultas de documentos aprovados
CREATE INDEX IF NOT EXISTS idx_order_documents_approved 
ON public.order_documents(order_id, approved) 
WHERE approved = TRUE;

-- Comentário na coluna
COMMENT ON COLUMN public.order_documents.approved IS 'Indica se o documento (orçamento) foi aprovado. Apenas um documento por pedido pode ser aprovado.';

