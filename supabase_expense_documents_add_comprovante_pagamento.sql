-- ============================================
-- ADICIONA TIPO comprovante_pagamento NA TABELA expense_documents
-- ============================================
-- Este script atualiza a constraint CHECK do campo type na tabela expense_documents
-- para incluir o novo tipo 'comprovante_pagamento'

-- Remove a constraint antiga se existir
DO $$
BEGIN
    ALTER TABLE public.expense_documents DROP CONSTRAINT IF EXISTS expense_documents_type_check;
    ALTER TABLE public.expense_documents DROP CONSTRAINT IF EXISTS expense_documents_type_check1;
    ALTER TABLE public.expense_documents DROP CONSTRAINT IF EXISTS expense_documents_type_check2;
END
$$;

-- Adiciona a nova constraint com todos os tipos válidos
ALTER TABLE public.expense_documents
ADD CONSTRAINT expense_documents_type_check CHECK (
    type IN ('nota_fiscal', 'recibo', 'comprovante_pagamento')
);

-- Comentário atualizado
COMMENT ON COLUMN public.expense_documents.type IS 'Tipo do documento: nota_fiscal, recibo ou comprovante_pagamento';


