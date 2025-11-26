-- ============================================
-- ADICIONA CAMPO deleted_at PARA SOFT DELETE
-- ============================================
-- Este script adiciona o campo deleted_at na tabela employee_documents
-- para permitir rastreamento de exclusões nas atividades recentes

-- Adiciona a coluna deleted_at
ALTER TABLE public.employee_documents
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Cria índice para melhorar performance de queries que filtram por deleted_at
CREATE INDEX IF NOT EXISTS idx_employee_documents_deleted_at ON public.employee_documents(deleted_at) WHERE deleted_at IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.employee_documents.deleted_at IS 'Data/hora em que o documento de funcionário foi excluído (soft delete). NULL significa que não foi excluído.';

