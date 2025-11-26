-- ============================================
-- TABELA: equipment_photos
-- Descrição: Armazena fotos vinculadas a equipamentos
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_equipment_photos_equipment_id 
  ON public.equipment_photos(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_photos_uploaded_at 
  ON public.equipment_photos(uploaded_at);

-- Comentários para documentação
COMMENT ON TABLE public.equipment_photos IS 'Fotos vinculadas a equipamentos';
COMMENT ON COLUMN public.equipment_photos.equipment_id IS 'ID do equipamento';
COMMENT ON COLUMN public.equipment_photos.description IS 'Descrição/título da foto';
COMMENT ON COLUMN public.equipment_photos.file_name IS 'Nome do arquivo';
COMMENT ON COLUMN public.equipment_photos.file_url IS 'URL do arquivo no Supabase Storage';
COMMENT ON COLUMN public.equipment_photos.mime_type IS 'Tipo MIME do arquivo';
COMMENT ON COLUMN public.equipment_photos.uploaded_at IS 'Data/hora do upload da foto';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários anônimos
CREATE POLICY "Allow anon select equipment photos"
  ON public.equipment_photos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert equipment photos"
  ON public.equipment_photos
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update equipment photos"
  ON public.equipment_photos
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete equipment photos"
  ON public.equipment_photos
  FOR DELETE
  TO anon
  USING (true);

