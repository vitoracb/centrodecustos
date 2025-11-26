-- ============================================
-- ADICIONA COLUNA file_name NA TABELA equipment_photos
-- ============================================
-- Este script adiciona a coluna file_name se ela não existir
-- e força o refresh do schema cache do PostgREST
-- ============================================

-- Verifica se a coluna existe antes de adicionar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'equipment_photos' 
    AND column_name = 'file_name'
  ) THEN
    -- Adiciona a coluna file_name
    ALTER TABLE public.equipment_photos
    ADD COLUMN file_name TEXT;
    
    RAISE NOTICE 'Coluna file_name adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna file_name já existe';
  END IF;
END $$;

-- Preenche valores NULL com dados existentes
UPDATE public.equipment_photos
SET file_name = COALESCE(
  file_name,
  description,
  'foto-' || id::text || '.jpg'
)
WHERE file_name IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.equipment_photos.file_name IS 'Nome do arquivo da foto';

-- Força o refresh do schema cache do PostgREST
-- Nota: Isso pode não funcionar diretamente, mas ajuda a garantir que a coluna existe
NOTIFY pgrst, 'reload schema';

