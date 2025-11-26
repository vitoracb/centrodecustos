-- ============================================
-- ADICIONA COLUNA mime_type NAS TABELAS DE EQUIPAMENTOS
-- ============================================
-- Este script adiciona a coluna mime_type nas tabelas:
-- - equipment_documents
-- - equipment_photos
-- ============================================

-- Adiciona mime_type em equipment_documents se não existir
ALTER TABLE public.equipment_documents
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Adiciona mime_type em equipment_photos se não existir
ALTER TABLE public.equipment_photos
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.equipment_documents.mime_type IS 'Tipo MIME do arquivo (ex: application/pdf, image/jpeg)';
COMMENT ON COLUMN public.equipment_photos.mime_type IS 'Tipo MIME do arquivo (ex: image/jpeg, image/png)';

