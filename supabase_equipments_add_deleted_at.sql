-- ============================================
-- ADICIONA CAMPO deleted_at PARA SOFT DELETE
-- ============================================
-- Este script adiciona o campo deleted_at na tabela equipments
-- para permitir rastreamento de exclusões nas atividades recentes

-- Adiciona a coluna deleted_at
ALTER TABLE public.equipments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Cria índice para melhorar performance de queries que filtram por deleted_at
CREATE INDEX IF NOT EXISTS idx_equipments_deleted_at ON public.equipments(deleted_at) WHERE deleted_at IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.equipments.deleted_at IS 'Data/hora em que o equipamento foi excluído (soft delete). NULL significa que não foi excluído.';

